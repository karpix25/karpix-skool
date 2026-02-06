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

    # 4. Link Group
    target_tenant.telegram_group_id = message.chat.id
    
    owner_assigned = False
    if not target_tenant.owner_user_id:
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
            
        target_tenant.owner_user_id = user.id
        owner_assigned = True
        logging.info(f"OWNER: User {user.id} assigned as owner of tenant {target_tenant.id}")

    db.add(target_tenant)
    await db.commit()
    
    reply = f"✅ CONNECTED! This group is now the classroom for: **{target_tenant.name}**"
    if owner_assigned:
        reply += f"\n\n👤 **Administrator access granted** to {message.from_user.full_name}. You can now manage this school in your [Admin Panel](https://t.me/your_bot_name/admin)."
    
    await message.reply(reply, parse_mode="Markdown")

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
    Handles users joining or leaving the group.
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
        # If they re-join but were never in DB as member (shouldn't happen with current logic)
        if new_status in ["member", "administrator", "creator"]:
            member = TenantMember(
                user_id=user.id,
                tenant_id=tenant.id,
                status=MemberStatus.active
            )
            db.add(member)
            await db.commit()
        return

    # 4. Update Status
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
        
    db.add(member)
    await db.commit()
