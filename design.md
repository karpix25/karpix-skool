# KARPIX SKOOL Design System

## Direction

Quiet Academy is a calm, focused interface for a Telegram-first learning
product. It should feel like a practical school workspace: clear hierarchy,
small controls, quiet surfaces, and unmistakable course states.

## Principles

- Keep screens dense enough for daily work, but leave air around decision points.
- Use one primary action per view; secondary actions stay outlined or ghosted.
- Make locked, available, completed, draft, and VIP states readable without relying
  on color alone.
- Avoid decorative gradients, glow, huge radii, nested cards, and uppercase labels.
- Design mobile first for 320, 375, and 414 px Telegram Mini App viewports.

## Palette

- Paper: `oklch(0.972 0.006 255)` for app background.
- Surface: `oklch(0.992 0.003 255)` for cards, sheets, popovers.
- Surface muted: `oklch(0.946 0.011 255)` for toolbars and subtle bands.
- Ink: `oklch(0.205 0.026 255)` for primary text.
- Ink muted: `oklch(0.505 0.026 255)` for secondary text.
- Accent blue: `oklch(0.54 0.19 258)` for primary actions and active nav.
- Success green: `oklch(0.57 0.15 150)` for completion and positive feedback.
- VIP amber: `oklch(0.69 0.16 72)` for premium/access emphasis.
- Danger red: `oklch(0.58 0.19 26)` for destructive actions.

## Shape And Space

- Controls: 8 px radius.
- Cards and panels: 12 px radius.
- Dialogs and bottom sheets: 16 px radius.
- Pill metadata can use full radius, but never as the dominant page shape.
- Default page padding: 16 px mobile, 24 px tablet, 32 px desktop.
- Use 44 px minimum touch targets in navigation, icon buttons, and form controls.

## Typography

- Font: Geist for UI and Geist Mono for compact numbers/codes.
- Headings should be direct and restrained. Use large type only on auth/landing.
- Page titles: 24-30 px mobile, 30-36 px desktop.
- Card titles: 16-20 px.
- Labels and metadata: sentence case, medium weight, no letter-spaced uppercase.

## Components

- Buttons use solid blue only for the primary command. Secondary commands are
  quiet surfaces with borders. Destructive actions are red and require context.
- Inputs are white surfaces with visible borders, clear focus rings, and no glow.
- Cards use a 1 px border plus a tiny shadow at most.
- Tabs are segmented controls with clear active state and horizontal scroll on
  narrow screens.
- Dialogs should be readable on 320 px and use bottom-sheet-like spacing on
  mobile when content is long.
- Bottom navigation must respect `safe-area-inset-bottom`.

## Motion

- Use 120-180 ms transitions for color, opacity, and transform.
- Do not animate layout-heavy properties.
- Respect reduced motion.

## Role Surfaces

- Student: learning progress first, course access states second, profile/community
  actions third.
- Admin: operational density first: course status, students, settings, publishing,
  media configuration.
- Super-admin: system clarity first: tenants, authors, health, broadcast, logs.
