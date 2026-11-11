# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

iOS ships first, then web, then Android, all from one Expo (React Native) codebase. Native navigation (tab bar, stacks, sheets) follows each OS; web uses the same screens through react-native-web.

## Stack

- App: Expo SDK 58, React Native 0.88, expo-router (native tabs), TanStack Query. One codebase for iOS, web, Android.
- Server: Bun + Hono + SQLite (`bun:sqlite`). User's explicit choice: SQLite on the server, no Supabase.
- Realtime: WebSocket from the server; clients refetch when another member changes shop data.
- Auth: email + 6-digit OTP, opaque session tokens.

## Users

Owners of small flower shops in Vietnam (1–5 people). The owner takes orders by chat (Zalo, Messenger, TikTok, phone calls, walk-ins) on their phone, often while arranging flowers or at the counter, and has 1–4 helpers who arrange bouquets or deliver. Invited managers need to see and update the same orders as the owner.

## Product Purpose

An order book for small shops that several people share. Record an order in seconds, see what is due today and what is late, move each order through its status with one tap, track deposits and unpaid balances, and hand the delivery to a ride/courier app (Grab, Xanh SM, Be, Ahamove, Lalamove) without retyping the address.

Success: the shop stops losing orders in chat history, nobody delivers late because they forgot, and the owner always knows how much is still owed.

## Positioning

The reference app (Flowie) is a single-device, local-only order book. This product is shared: a shop has members, everyone sees the same live orders, and the activity log says who changed what. It hands deliveries straight to Vietnamese courier apps. Flowers come first, but the data model is not flower-only; other small made-to-order businesses (cakes, gifts) come later.

## Operating Context

- Orders arrive in chat apps; customer name, phone, and address are copied from chat.
- Busy days are holidays (14/2, 8/3, 20/10, 20/11, Tết): dozens of orders due the same day, often in time windows.
- Orders are fulfilled as delivery (courier/ride app or own shipper) or customer pickup.
- Payment is usually a deposit by bank transfer (VietQR), then the balance on delivery.
- Currency is VND with no decimals. Language is Vietnamese first.

## Capabilities and Constraints

Phase 1 (building now):
- Email OTP sign-in; create a shop; join a shop with an invite code/link.
- Roles: Owner (everything, plus delete shop and remove members) and Manager (all shop data). No staff role yet.
- Orders: customer, items, delivery or pickup, due date + time window, card message, notes, shipping fee, discount, deposit/payments, status pipeline (new → in progress → awaiting customer approval → delivering → delivered, plus cancelled).
- Customers list, built automatically from orders.
- Today view: overdue, due today, upcoming.
- Delivery handoff: copy pickup/drop-off details, then open the courier app; fall back to the App Store / Play Store.
- Live sync between members of the same shop.

Later / undecided:
- Bouquet and delivery photos, product catalog, shopping list of flowers to buy, calendar, statistics, invoices with VietQR, reminders and notifications, iOS widgets and Live Activities, screenshot scanning for customer info, Apple/Google sign-in, multiple branches, other business types.
- Courier apps do not publish deep-link parameters for prefilled pickup/drop-off; the handoff copies details to the clipboard and opens the app. URL schemes still need to be checked on real devices.

## Brand Commitments

Working name "Floied" (folder name); not confirmed as the final brand.

Standing preference (chosen 2026-11-09 in the direction round): the category standard, played straight. A native iOS app: system grouped backgrounds, SF Pro, platform controls, one rose tint. No themed visual world. The craft bar is Momo and Vietnamese banking apps: large, unambiguous money amounts, clear payment state, QR where money changes hands.

## Evidence on Hand

No real shops, testimonials, screenshots, or pricing yet. Do not invent customer counts, reviews, or pricing claims.

## Product Principles

1. Faster than typing it into chat: the common order takes under 30 seconds.
2. Today first: what is late and what is due now is always one tap away.
3. Shared truth: every member sees the same order state, and changes say who made them.
4. Money is never ambiguous: total, paid, and remaining are visible wherever an order appears.
5. Hand off, don't reinvent: delivery and payment go through apps the shop already uses.
