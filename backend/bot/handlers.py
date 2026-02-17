import logging
from aiogram import Router, F
from aiogram.filters import Command
from aiogram.types import Message, ChatMemberUpdated, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

from sqlalchemy.future import select
from app.models import Tenant, TenantMember, User, MemberRole, MemberStatus
from datetime import datetime
from app.services.user import sync_user_avatar
from app.services.gamification import GamificationService
from aiogram.types import Message, ChatMemberUpdated, MessageReactionUpdated
import os

router = Router()

@router.message(Command("start"))
async def cmd_start(message: Message, db):
    """
    Private chat /start: Welcome and provide WebApp link.
    Supports ?start=CODE for tenant identification.
    """
    user_tg_id = message.from_user.id
    
    # 1. Parse start_param
    args = message.text.split()
    start_param = args[1] if len(args) > 1 else None
    
    # 2. Ensure User exists
    stmt = select(User).where(User.telegram_id == user_tg_id)
    result = await db.execute(stmt)
    user = result.scalars().first()
    
    if not user:
        user = User(
            telegram_id=user_tg_id,
            username=message.from_user.username,
            avatar_url=None
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
    # 3. Find Tenant
    target_tenant = None
    if start_param:
        stmt_t = select(Tenant).where(Tenant.setup_code == start_param)
        res_t = await db.execute(stmt_t)
        target_tenant = res_t.scalars().first()
    
    # Fallback only if user has NO memberships yet
    if not target_tenant:
        stmt_m_count = select(TenantMember).where(TenantMember.user_id == user.id)
        res_m_count = await db.execute(stmt_m_count)
        if not res_m_count.scalars().first():
            # Only then fallback to the very first tenant
            stmt_fallback = select(Tenant)
            res_fallback = await db.execute(stmt_fallback)
            target_tenant = res_fallback.scalars().first()
    
    # 4. Add Membership if found
    if target_tenant:
        stmt_m = select(TenantMember).where(
            TenantMember.user_id == user.id,
            TenantMember.tenant_id == target_tenant.id
        )
        res_m = await db.execute(stmt_m)
        if not res_m.scalars().first():
            member = TenantMember(user_id=user.id, tenant_id=target_tenant.id)
            db.add(member)
            await db.commit()
            
    # 5. Create Keyboard
    WEBAPP_URL = os.getenv("WEBAPP_URL", "https://karpix-skool.vercel.app")
    # Include startapp param for the Mini App's own init
    app_url = f"{WEBAPP_URL}?startapp={target_tenant.setup_code}" if target_tenant else WEBAPP_URL
    
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🚀 Открыть обучение", web_app=WebAppInfo(url=app_url))]
    ])

    await message.reply(
        f"👋 **Добро пожаловать в {target_tenant.name if target_tenant else 'Школу'}!**\n\n"
        "Готовы начать обучение? Нажмите кнопку ниже, чтобы открыть дашборд! 🚀",
        parse_mode="Markdown",
        reply_markup=keyboard
    )


@router.message(Command("setup"))
async def cmd_setup(message: Message, db, tenant: Tenant | None = None):
    """
    Usage: /setup START-123
    Only for Admins.
    """
    # 1. Check if already connected
    if tenant:
        await message.reply(f"✅ Эта группа уже подключена к: {tenant.name}")
        return

    # 2. Extract code
    args = message.text.split()
    if len(args) < 2:
        await message.reply("⚠️ Использование: `/setup <CONNECT_CODE>` (для обычной группы) или `/setup <CONNECT_CODE> vip` (для VIP группы)")
        return
    connect_code = args[1]
    is_vip_setup = len(args) >= 3 and args[2].lower() == "vip"
    
    # 3. Validation
    # Use the new setup_code field in the database
    stmt = select(Tenant).where(Tenant.setup_code == connect_code)
    result = await db.execute(stmt)
    target_tenant = result.scalars().first()
    
    if not target_tenant:
        await message.reply("❌ Неверный код. Проверьте его в админ-панели.")
        return
        
    if is_vip_setup:
        if target_tenant.telegram_group_id_vip:
            await message.reply(f"⚠️ Эта школа уже подключена к VIP-группе (ID: {target_tenant.telegram_group_id_vip}).")
            return
    else:
        if target_tenant.telegram_group_id:
            await message.reply(f"⚠️ Эта школа уже подключена к обычной группе (ID: {target_tenant.telegram_group_id}).")
            return

    # 4. Link Group (only if in a group)
    is_private = message.chat.type == "private"
    if not is_private:
        topic_id = message.message_thread_id if message.is_topic_message else None
        logging.info(f"SETUP: Captured Chat ID {message.chat.id}, Topic ID {topic_id} (VIP={is_vip_setup})")
        
        if is_vip_setup:
            target_tenant.telegram_group_id_vip = message.chat.id
            target_tenant.telegram_topic_id_vip = topic_id
        else:
            target_tenant.telegram_group_id = message.chat.id
            target_tenant.telegram_topic_id = topic_id
    
    owner_assigned = False
    if not target_tenant.owner_user_id:
        # Check if user is posting as a chat (anonymous admin)
        if message.sender_chat and not is_private:
            await message.reply(
                "⚠️ **Ошибка:** Вы пишете от имени группы. \n\n"
                "Чтобы я мог назначить вас владельцем школы, пожалуйста: \n"
                "1. Отключите 'Анонимное администрирование' в настройках группы.\n"
                "2. Или отправьте мне команду `/setup <ваш_код>` в **личные сообщения**.\n\n"
                "После этого я узнаю ваш личный ID и смогу открыть доступ к админке."
            )
            return

        # Assign ownership to the person who set up the group
        user_tg_id = message.from_user.id
        stmt_u = select(User).where(User.telegram_id == user_tg_id)
        res_u = await db.execute(stmt_u)
        user = res_u.scalars().first()
        
        if not user:
            user = User(
                telegram_id=user_tg_id,
                username=message.from_user.username,
                avatar_url=None
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)

        from app.models import UserAdminStatus
        if user.admin_status != UserAdminStatus.approved:
            user.admin_status = UserAdminStatus.approved
            db.add(user)
            
        target_tenant.owner_user_id = user.id
        owner_assigned = True
        logging.info(f"OWNER: User {user.id} assigned as owner of tenant {target_tenant.id}")

    db.add(target_tenant)
    await db.commit()
    await db.refresh(target_tenant)
    
    logging.info(f"SETUP SUCCESS: Tenant {target_tenant.name} ({target_tenant.id}) linked to chat {message.chat.id} as {'VIP' if is_vip_setup else 'Free'}. DB Val: {target_tenant.telegram_group_id_vip if is_vip_setup else target_tenant.telegram_group_id}")
    
    if is_private:
        group_type = "VIP" if is_vip_setup else "Free"
        reply = f"✅ **Владелец подтвержден!** Теперь вы — хозяин школы **{target_tenant.name}**.\n\n"
        reply += f"Теперь добавьте меня в вашу **{group_type}** группу Telegram и отправьте там ту же команду `/setup <code> {'vip' if is_vip_setup else ''}`, чтобы я связал курсы с группой."
    else:
        group_type = "VIP" if is_vip_setup else "Free"
        reply = f"✅ **СВЯЗАНО!** Эта группа теперь является **{group_type}** классом для: **{target_tenant.name}**"
        
        if not is_private and topic_id:
             reply += f"\n📌 **Тема привязана:** ID {topic_id}"
             
        if owner_assigned:
            reply += f"\n\n👤 **Администратор назначен:** {message.from_user.full_name}. Теперь вы можете управлять школой в [Админ-панели](https://t.me/{ (await message.bot.get_me()).username }/admin)."
    
    await message.reply(reply, parse_mode="Markdown")

@router.message(Command("debug_tenant"))
async def cmd_debug_tenant(message: Message, db):
    """
    Debug command to check tenant connection status.
    """
    chat_id = message.chat.id
    logging.info(f"DEBUG: Checking tenant for chat {chat_id}")
    
    # Check by Free Group ID
    stmt_free = select(Tenant).where(Tenant.telegram_group_id == chat_id)
    res_free = await db.execute(stmt_free)
    tenant_free = res_free.scalars().first()
    
    # Check by VIP Group ID
    stmt_vip = select(Tenant).where(Tenant.telegram_group_id_vip == chat_id)
    res_vip = await db.execute(stmt_vip)
    tenant_vip = res_vip.scalars().first()
    
    reply = f"🔍 **Debug Info for Chat ID:** `{chat_id}`\n\n"
    
    if tenant_free:
        reply += f"✅ **Connected as Free Group**\n"
        reply += f"Tenant: {tenant_free.name}\n"
        reply += f"ID: `{tenant_free.id}`\n"
        reply += f"Owner ID: `{tenant_free.owner_user_id}`\n"
    else:
        reply += "❌ Not connected as Free Group\n"
        
    reply += "\n"
        
    if tenant_vip:
        reply += f"✅ **Connected as VIP Group**\n"
        reply += f"Tenant: {tenant_vip.name}\n"
        reply += f"ID: `{tenant_vip.id}`\n"
        reply += f"Owner ID: `{tenant_vip.owner_user_id}`\n"
    else:
        reply += "❌ Not connected as VIP Group\n"
        
    await message.reply(reply, parse_mode="Markdown")

from app.services.telegram import sync_group_admins

@router.message(Command("sync"))
async def cmd_sync(message: Message, db, tenant: Tenant | None = None):
    """
    Usage: /sync
    Syncs Telegram Admins to App Admins.
    """
    if not tenant:
        await message.reply("⚠️ Эта группа не подключена к школе.")
        return

    # Only allow existing admins or TG admins to run this
    user_status = await message.bot.get_chat_member(message.chat.id, message.from_user.id)
    if user_status.status not in ["creator", "administrator"]:
        await message.reply("❌ Только администраторы группы могут запускать эту команду.")
        return

    msg = await message.reply("🔄 Синхронизация админов...")
    
    # Pass bot explicitly since we are in the bot context
    promoted, total = await sync_group_admins(message.chat.id, tenant, db, bot=message.bot)
    
    await msg.edit_text(
        f"✅ **Синхронизация завершена!**\n\n"
        f"Найдено **{total}** администраторов.\n"
        f"Повышено **{promoted}** новых админов в приложении."
    )

from aiogram.types import CallbackQuery

@router.callback_query(F.data.startswith("approve_admin:"))
async def on_approve_admin(callback: CallbackQuery, db):
    user_id_str = callback.data.split(":")[1]
    
    stmt = select(User).where(User.id == user_id_str)
    res = await db.execute(stmt)
    user = res.scalars().first()
    
    if not user:
        await callback.answer("❌ Пользователь не найден", show_alert=True)
        return
    
    from app.models import UserAdminStatus
    user.admin_status = UserAdminStatus.approved
    db.add(user)
    await db.commit()
    
    await callback.message.edit_text(callback.message.text + "\n\n✅ **ОДОБРЕНО**")
    await callback.answer("Пользователь одобрен!")
    
    # Notify User
    try:
        await callback.bot.send_message(
            user.telegram_id, 
            "🎉 **Ваша заявка одобрена!**\n\nТеперь вы можете создать свою школу в приложении. 🚀"
        )
    except Exception as e:
        logging.error(f"Failed to notify user {user.id}: {e}")

@router.callback_query(F.data.startswith("reject_admin:"))
async def on_reject_admin(callback: CallbackQuery, db):
    user_id_str = callback.data.split(":")[1]
    
    stmt = select(User).where(User.id == user_id_str)
    res = await db.execute(stmt)
    user = res.scalars().first()
    
    if not user:
        await callback.answer("❌ Пользователь не найден", show_alert=True)
        return
    
    from app.models import UserAdminStatus
    user.admin_status = UserAdminStatus.rejected
    db.add(user)
    await db.commit()
    
    await callback.message.edit_text(callback.message.text + "\n\n❌ **ОТКЛОНЕНО**")
    await callback.answer("Заявка отклонена")

@router.message(Command("courses"))
async def cmd_courses(message: Message, db, tenant: Tenant | None = None):
    """
    Command to get Mini App link for the current school.
    Works in both private and groups.
    """
    if not tenant:
        await message.reply("❌ Эта группа не подключена к онлайн-школе.")
        return

    WEBAPP_URL = os.getenv("WEBAPP_URL", "https://karpix-skool.vercel.app")
    app_url = f"{WEBAPP_URL}?startapp={tenant.setup_code}"
    
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="📚 Открыть курсы", web_app=WebAppInfo(url=app_url))]
    ])

    await message.reply(
        f"📖 **Курсы школы: {tenant.name}**\n\n"
        "Нажмите кнопку ниже, чтобы перейти к обучению! 👇",
        parse_mode="Markdown",
        reply_markup=keyboard
    )

@router.message(Command("leaderboard"))

async def cmd_leaderboard(message: Message, db, tenant: Tenant | None = None):
    """
    Shows top students by XP.
    """
    if not tenant:
        await message.reply("⚠️ Эта группа не подключена к школе.")
        return

    # Query top 10 members
    # Note: scalar subqueries or eager load user
    from sqlalchemy.orm import selectinload
    stmt = (
        select(TenantMember)
        .where(TenantMember.tenant_id == tenant.id)
        .order_by(TenantMember.xp.desc())
        .limit(10)
        .options(selectinload(TenantMember.user))
    )
    result = await db.execute(stmt)
    members = result.scalars().all()

    if not members:
        await message.reply("📉 Пока нет активности.")
        return

    text = f"🏆 **Таблица лидеров: {tenant.name}**\n\n"
    for idx, mem in enumerate(members, 1):
        username = mem.user.username or "Аноним"
        text += f"{idx}. {username} — ⭐️ {mem.xp} XP (Ур. {mem.level})\n"
    
    await message.reply(text, parse_mode="Markdown")

@router.message()
async def track_activity(message: Message, db, tenant: Tenant | None = None):
    """
    Every message gives XP if tenant is active.
    """
    logging.info(f"TRACK: Message from {message.from_user.id} in chat {message.chat.id} (tenant: {tenant.name if tenant else 'None'})")
    if not tenant:
        return # Ignore unconnected groups
        
    user_telegram_id = message.from_user.id
    
    # Skip bots
    if message.from_user.is_bot:
        return

    # 1. Find or Create Global User
    stmt = select(User).where(User.telegram_id == user_telegram_id)
    result = await db.execute(stmt)
    user = result.scalars().first()
    
    if not user:
        user = User(
            telegram_id=user_telegram_id, 
            username=message.from_user.username,
            avatar_url=None
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    
    # 1.5 Update Avatar if missing or occasionally (handled by sync_user_avatar)
    if await sync_user_avatar(user, message.bot):
        db.add(user)
        await db.commit()
        
    # 2. Find or Create Member
    stmt_mem = select(TenantMember).where(
        TenantMember.tenant_id == tenant.id,
        TenantMember.user_id == user.id
    )
    result_mem = await db.execute(stmt_mem)
    member = result_mem.scalars().first()
    
    if not member:
        member = TenantMember(
            tenant_id=tenant.id,
            user_id=user.id,
            role=MemberRole.student,
            cohort_start_date=datetime.utcnow(),
            status=MemberStatus.active
        )
        db.add(member)
        logging.info(f"SYNC: Discovered existing TG member {user.username} via message activity.")
    elif member.status == MemberStatus.paused:
        member.status = MemberStatus.active
        member.paused_at = None
        db.add(member)
        logging.info(f"SYNC: Reactivated paused member {user.username} via message activity.")
    
    # 3. Award XP via GamificationService
    leveled_up = await GamificationService.add_xp(db, member, amount=1, source="message")
    
    # 3.5 Track message authorship for reaction points
    await GamificationService.track_message(
        db, 
        tenant_id=tenant.id, 
        user_id=user.id, 
        chat_id=message.chat.id, 
        message_id=message.message_id
    )
    
    # 4. Level Up Notification
    if leveled_up:
        await GamificationService.notify_level_up_direct(message.bot, user.telegram_id, member.level)
        
    db.add(member)
    await db.commit()

@router.message_reaction()
async def on_message_reaction(update: MessageReactionUpdated, db):
    """
    Awards XP to the author when someone reacts to their message.
    """
    await GamificationService.handle_reaction(
        db, 
        chat_id=update.chat.id, 
        message_id=update.message_id, 
        bot=update.bot
    )

@router.chat_member()
async def on_chat_member_update(update: ChatMemberUpdated, db):
    """
    Handles users joining/leaving AND role changes (admin/member).
    """
    chat_id = update.chat.id
    user_tg_id = update.from_user.id
    new_status = update.new_chat_member.status
    
    # 1. Find Tenant for this group
    stmt_t = select(Tenant).where(
        (Tenant.telegram_group_id == chat_id) | 
        (Tenant.telegram_group_id_vip == chat_id)
    )
    res_t = await db.execute(stmt_t)
    tenant = res_t.scalars().first()
    
    if not tenant:
        return # Not our business

        
    # 2. Find User
    stmt_u = select(User).where(User.telegram_id == user_tg_id)
    res_u = await db.execute(stmt_u)
    user = res_u.scalars().first()
    
    if not user:
        return # We don't know this user yet
        
    # 3. Find Membership
    stmt_m = select(TenantMember).where(
        TenantMember.user_id == user.id,
        TenantMember.tenant_id == tenant.id
    )
    res_m = await db.execute(stmt_m)
    member = res_m.scalars().first()
    
    if not member:
        # If they re-join but were never in DB as member
        if new_status in ["member", "administrator", "creator"]:
            role = MemberRole.admin if new_status in ["administrator", "creator"] else MemberRole.student
            member = TenantMember(
                user_id=user.id,
                tenant_id=tenant.id,
                status=MemberStatus.active,
                role=role
            )
            db.add(member)
            await db.commit()
        
        # Sync Avatar on join
        if await sync_user_avatar(user, update.bot):
            db.add(user)
            await db.commit()
        return

    # 4. Update Status (Pause/Resume)
    is_leaving = new_status in ["left", "kicked"]
    was_paused = member.status == MemberStatus.paused
    
    if is_leaving and member.status == MemberStatus.active:
        member.status = MemberStatus.paused
        member.paused_at = datetime.utcnow()
        logging.info(f"STATUS PAUSE: User {user_tg_id} left chat {chat_id}. Access paused.")
    elif not is_leaving and was_paused:
        member.status = MemberStatus.active
        member.paused_at = None
        logging.info(f"STATUS RESUME: User {user_tg_id} rejoined chat {chat_id}. Access restored.")
        
    # 5. Update Role (Sync with TG Admin status)
    # Don't demote the owner ever.
    if user.id != tenant.owner_user_id:
        if new_status in ["administrator", "creator"]:
            if member.role != MemberRole.admin:
                member.role = MemberRole.admin
                logging.info(f"ROLE: Promoted {user.username} to ADMIN in tenant {tenant.id}")
        elif new_status == "member":
            if member.role == MemberRole.admin:
                member.role = MemberRole.student
                logging.info(f"ROLE: Demoted {user.username} to STUDENT in tenant {tenant.id}")

    db.add(member)
    await db.commit()
