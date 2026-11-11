---
version: 1
slug: "src-app"
primary_target: "src/app"
related_targets: []
---

# Surface: Floied app (all signed-in screens)

Mode: Operate. Platform: iOS first (Expo), then web, then Android.
Audience: owner and managers of a small Vietnamese flower shop, on a phone, between customers and arrangements.
Job: record orders fast, see what is late and due today, move orders through status, collect money, hand delivery to a courier app.
Quality bar: Momo and Vietnamese banking apps (money amounts and payment state are unmistakable).
Unresolved: final brand name; app icon; photo-led surfaces (phase 2).

## Direction contract

THESIS: The category standard, played straight: a native iOS order book that a Momo user trusts on sight. It refuses themed worlds and dashboard tiles that hide the money.

OWN-WORLD: iOS system grouped background, white inset grouped lists, SF Pro at system text styles, one rose tint (#D1336B for fills and light-mode text, #FF6F9F for dark-mode text) for actions and selection only. State pills: rose for active work, red for late, green for paid/done, gray for cancelled. Amounts in tabular figures, VND with dot separators.

STORY: Open the app, read three numbers (orders today, late, still to collect), then the day's orders by morning/afternoon/evening, tap one to advance status, collect payment, or open Grab/Xanh SM/Be with the address copied.

FIRST VIEWPORT: Large title "Hôm nay" with date subtitle; a row of three summary tiles (Đơn hôm nay, Trễ in rose/red, Còn thu); grouped sections Sáng / Chiều / Tối with rows: customer name bold, time + first item secondary, status pill right. New-order action in the navigation bar; system tab bar: Hôm nay, Đơn, Khách, Shop.

FORM: Canon (category standard), chosen by the user over the rolled direction; seed: 749024423e8160bb.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
