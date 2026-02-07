import logging
from aiogram import Router, F
from aiogram.filters import Command
from aiogram.types import Message, ChatMemberUpdated
from sqlalchemy.future import select
from app.models import Tenant, TenantMember, User, MemberRole, MemberStatus
from datetime import datetime

router = Router()

@router.message(Command("start"))
async def cmd_start(message: Message, db):
    """
    Private chat /start: Welcome and provide WebApp link.
    """
    user_tg_id = message.from_user.id
    
    # 1. Ensure User exists
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
        
    # 2. Add to Default Tenant if any
    stmt_t = select(Tenant)
    res_t = await db.execute(stmt_t)
    tenant = res_t.scalars().first()
    
    if tenant:
        stmt_m = select(TenantMember).where(
            TenantMember.user_id == user.id,
            TenantMember.tenant_id == tenant.id
        )
        res_m = await db.execute(stmt_m)
        if not res_m.scalars().first():
            member = TenantMember(user_id=user.id, tenant_id=tenant.id)
            db.add(member)
            await db.commit()
            
    await message.reply(
        f"👋 **Welcome to {tenant.name if tenant else 'the School'}!**\n\n"
        "Ready to start learning? Tap the button below to open your dashboard! 🚀",
        parse_mode="Markdown"
    )

@router.message(Command("setup"))
async def cmd_setup(message: Message, db, tenant: Tenant | None = None):
    """
    Usage: /setup START-123
    Only for Admins.
    """
    # 1. Check if already connected
    if tenant:
        await message.reply(f"✅ This group is already connected to: {tenant.name}")
        return

    # 2. Extract code
    args = message.text.split()
    if len(args) < 2:
        await message.reply("⚠️ Usage: /setup <CONNECT_CODE>")
        return
    connect_code = args[1]
    
    # 3. Validation
    # Use the new setup_code field in the database
    stmt = select(Tenant).where(Tenant.setup_code == connect_code)
    result = await db.execute(stmt)
    target_tenant = result.scalars().first()
    
    if not target_tenant:
        await message.reply("❌ Invalid setup code. Please check your admin dashboard.")
        return
        
    if target_tenant.telegram_group_id:
        await message.reply(f"⚠️ This school is already connected to another group (ID: {target_tenant.telegram_group_id}).")
        return

    # 4. Link Group (only if in a group)
    is_private = message.chat.type == "private"
    if not is_private:
        target_tenant.telegram_group_id = message.chat.id
    
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
    
    if is_private:
        reply = f"✅ **Владелец подтвержден!** Теперь вы — хозяин школы **{target_tenant.name}**.\n\n"
        reply += "Теперь добавьте меня в вашу группу Telegram (где будут учиться студенты) и отправьте там ту же команду `/setup <code>`, чтобы я связал курсы с группой."
    else:
        reply = f"✅ **СВЯЗАНО!** Эта группа теперь является классом для: **{target_tenant.name}**"
        if owner_assigned:
            reply += f"\n\n👤 **Администратор назначен:** {message.from_user.full_name}. Теперь вы можете управлять школой в [Админ-панели](https://t.me/{ (await message.bot.get_me()).username }/admin)."
    
    await message.reply(reply, parse_mode="Markdown")

    await message.reply(reply, parse_mode="Markdown")

from app.services.telegram import sync_group_admins

@router.message(Command("sync"))
async def cmd_sync(message: Message, db, tenant: Tenant | None = None):
    """
    Usage: /sync
    Syncs Telegram Admins to App Admins.
    """
    if not tenant:
        await message.reply("⚠️ This group is not connected to a school.")
        return

    # Only allow existing admins or TG admins to run this
    user_status = await message.bot.get_chat_member(message.chat.id, message.from_user.id)
    if user_status.status not in ["creator", "administrator"]:
        await message.reply("❌ Only group admins can run this.")
        return

    msg = await message.reply("🔄 Syncing admins...")
    
    # Pass bot explicitly since we are in the bot context
    promoted, total = await sync_group_admins(message.chat.id, tenant, db, bot=message.bot)
    
    await msg.edit_text(
        f"✅ **Sync Complete!**\n\n"
        f"Found **{total}** human admins.\n"
        f"Promoted **{promoted}** new admins in the app."
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

@router.message(Command("leaderboard"))
async def cmd_leaderboard(message: Message, db, tenant: Tenant | None = None):
    """
    Shows top students by XP.
    """
    if not tenant:
        await message.reply("⚠️ This group is not connected to a school.")
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
        await message.reply("📉 No activity yet.")
        return

    text = f"🏆 **Leaderboard: {tenant.name}**\n\n"
    for idx, mem in enumerate(members, 1):
        username = mem.user.username or "Anon"
        text += f"{idx}. {username} — ⭐️ {mem.xp} XP (Lvl {mem.level})\n"
    
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
            cohort_start_date=datetime.utcnow()
        )
        db.add(member)
        # Notify First Join
        # await message.reply(f"Welcome {user.username or 'Student'} to {tenant.name}!")
    
    # 3. Give XP (Simple logic: +1 per message)
    member.xp += 1
    
    # 4. Level Up Logic (Simple: Level = XP // 50)
    current_level = member.level
    new_level = 1 + (member.xp // 50)
    
    if new_level > current_level:
        member.level = new_level
        await message.reply(f"🎉 **LEVEL UP!** {user.username or 'Student'} is now **Level {new_level}**! 🚀")
        
    db.add(member)
    await db.commit()

@router.chat_member()
async def on_chat_member_update(update: ChatMemberUpdated, db):
    """
    Handles users joining/leaving AND role changes (admin/member).
    """
    chat_id = update.chat.id
    user_tg_id = update.from_user.id
    new_status = update.new_chat_member.status
    
    # 1. Find Tenant for this group
    stmt_t = select(Tenant).where(Tenant.telegram_group_id == chat_id)
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
