---
name: Floied
description: A shared order book for small Vietnamese flower shops, built as plain native iOS with one rose tint.
colors:
  tint: "#D1336B"
  tint-dark: "#FF6F9F"
  tint-fill: "#D1336B"
  on-tint: "#FFFFFF"
  tint-soft: "#FCE8EF"
  tint-soft-dark: "#3A1624"
  grouped-background: "#F2F2F7"
  grouped-background-dark: "#000000"
  cell: "#FFFFFF"
  cell-dark: "#1C1C1E"
  cell-pressed: "#E5E5EA"
  cell-pressed-dark: "#2C2C2E"
  label: "#1C1C1E"
  label-dark: "#FFFFFF"
  secondary-label: "#5E5E64"
  secondary-label-dark: "#AEAEB2"
  tertiary-label: "#8A8A8E"
  tertiary-label-dark: "#8D8D93"
  separator: "#D8D8DC"
  separator-dark: "#38383A"
  fill: "#E9E9EE"
  fill-dark: "#2C2C2E"
  danger: "#C4001A"
  danger-dark: "#FF6961"
  danger-soft: "#FFE8E8"
  danger-soft-dark: "#3A1517"
  success: "#1E7B34"
  success-dark: "#4CD964"
  status-active-bg: "#FCE8EF"
  status-active-fg: "#A8265A"
  status-active-bg-dark: "#3A1624"
  status-active-fg-dark: "#FF8FB4"
  status-late-bg: "#FFE8E8"
  status-late-fg: "#B00018"
  status-late-bg-dark: "#3A1517"
  status-late-fg-dark: "#FF8A85"
  status-done-bg: "#E3F5E7"
  status-done-fg: "#1A6E2E"
  status-done-bg-dark: "#123020"
  status-done-fg-dark: "#6FDB8A"
  status-cancelled-bg: "#EDEDF0"
  status-cancelled-fg: "#5E5E64"
  status-cancelled-bg-dark: "#2C2C2E"
  status-cancelled-fg-dark: "#AEAEB2"
typography:
  largeTitle:
    fontFamily: "SF Pro, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: "41px"
  title1:
    fontFamily: "SF Pro, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: "34px"
  title2:
    fontFamily: "SF Pro, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: "28px"
  title3:
    fontFamily: "SF Pro, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: "25px"
  headline:
    fontFamily: "SF Pro, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: "22px"
  body:
    fontFamily: "SF Pro, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: "22px"
  callout:
    fontFamily: "SF Pro, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "21px"
  subhead:
    fontFamily: "SF Pro, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "20px"
  footnote:
    fontFamily: "SF Pro, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "18px"
  caption:
    fontFamily: "SF Pro, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "16px"
  money:
    fontFamily: "SF Pro, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontFeature: "tnum"
rounded:
  control: "10px"
  cell: "12px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
components:
  button-filled:
    backgroundColor: "{colors.tint-fill}"
    textColor: "{colors.on-tint}"
    typography: "{typography.headline}"
    rounded: "{rounded.cell}"
    padding: "0 16px"
    height: "50px"
  button-filled-small:
    backgroundColor: "{colors.tint-fill}"
    textColor: "{colors.on-tint}"
    typography: "{typography.subhead}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "36px"
  button-tinted:
    backgroundColor: "{colors.tint-soft}"
    textColor: "{colors.tint}"
    typography: "{typography.headline}"
    rounded: "{rounded.cell}"
    padding: "0 16px"
    height: "50px"
  button-plain:
    textColor: "{colors.tint}"
    typography: "{typography.headline}"
    rounded: "{rounded.cell}"
    padding: "0 16px"
    height: "50px"
  button-destructive:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
    typography: "{typography.headline}"
    rounded: "{rounded.cell}"
    padding: "0 16px"
    height: "50px"
  section-group:
    backgroundColor: "{colors.cell}"
    rounded: "{rounded.cell}"
  row:
    backgroundColor: "{colors.cell}"
    textColor: "{colors.label}"
    typography: "{typography.body}"
    padding: "11px 16px"
    height: "48px"
  row-pressed:
    backgroundColor: "{colors.cell-pressed}"
  field:
    backgroundColor: "{colors.cell}"
    textColor: "{colors.label}"
    typography: "{typography.body}"
    padding: "12px 16px"
    height: "48px"
  chip:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.label}"
    typography: "{typography.subhead}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "36px"
  chip-selected:
    backgroundColor: "{colors.tint-fill}"
    textColor: "{colors.on-tint}"
    typography: "{typography.subhead}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "36px"
  pill-active:
    backgroundColor: "{colors.status-active-bg}"
    textColor: "{colors.status-active-fg}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "3px 8px"
  pill-late:
    backgroundColor: "{colors.status-late-bg}"
    textColor: "{colors.status-late-fg}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "3px 8px"
  pill-done:
    backgroundColor: "{colors.status-done-bg}"
    textColor: "{colors.status-done-fg}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "3px 8px"
  pill-cancelled:
    backgroundColor: "{colors.status-cancelled-bg}"
    textColor: "{colors.status-cancelled-fg}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "3px 8px"
  tile:
    backgroundColor: "{colors.cell}"
    textColor: "{colors.label}"
    typography: "{typography.title2}"
    rounded: "{rounded.cell}"
    padding: "12px"
  segmented-track:
    backgroundColor: "{colors.fill}"
    rounded: "9px"
    padding: "2px"
    height: "32px"
  segmented-selected:
    backgroundColor: "{colors.cell}"
    textColor: "{colors.label}"
    typography: "{typography.footnote}"
    rounded: "7px"
    height: "28px"
  courier-button:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.label}"
    typography: "{typography.subhead}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "44px"
  error-note:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
    typography: "{typography.subhead}"
    rounded: "{rounded.cell}"
    padding: "12px"
  toast:
    backgroundColor: "rgba(28,28,30,0.92)"
    textColor: "{colors.on-tint}"
    typography: "{typography.subhead}"
    rounded: "{rounded.cell}"
    padding: "12px 16px"
---

# Design System: Floied

## Overview

**Creative North Star: "The Counter Ledger"**

Floied is the category standard played straight: a native iOS order book a Momo or banking-app user trusts on sight. The system is the platform's own. You get grouped backgrounds, white inset grouped lists, SF Pro at the system text styles, native tabs and large-title stacks, and SF Symbols. One rose tint marks what you can press and what is selected. There is no themed world to learn. The shop owner reads it the way they read Settings or their bank app, often one-handed at the counter.

The only places the app speaks louder than the platform are money and order state. Remaining balances are set large in tabular figures, debts read red, a fully paid order turns green, and every order row carries a status pill plus what is still owed. On iOS, color comes from `PlatformColor` (system grouped background, label, separator, systemRed, systemGreen), so Dark Mode and Increase Contrast follow the OS. Android and web use the matching hex values recorded in the frontmatter. The rose tint is the same hex everywhere.

The layout is dense in the iOS way, built from stacked sections of 48px rows rather than cards and dashboards. A three-tile summary is the only grid on the home screen. The visual rejection the user confirmed is themed worlds and dashboard tiles that hide the money (PRODUCT.md, Brand Commitments).

**Key Characteristics:**
- System grouped lists on a grouped background; the platform's chrome on every OS.
- One brand color, rose, for actions and selection only.
- Money in tabular figures with VND dot separators and a trailing "đ"; the remaining amount is the largest number on the order screen.
- Four status meanings, each with its own color: rose (in progress), red (late), green (done), gray (cancelled).
- Flat cells that separate from the background by tone; there are no card shadows.
- Dark Mode and Dynamic Type come from the system.

## Colors

The palette is iOS system neutrals plus one rose tint and the system's red and green, which only signal money and state.

### Primary
- **Shop Rose** (`tint`, `tint-dark`): text-weight tint for bar buttons, plain buttons, row icons, tab selection, the caret, text selection, and focus rings. It switches to the brighter `tint-dark` in Dark Mode so rose text stays readable on black.
- **Shop Rose Fill** (`tint-fill`): background of filled buttons and selected chips, with white labels (`on-tint`). It keeps the light value in both modes so the white label holds about 4.8:1 contrast.
- **Rose Wash** (`tint-soft`, `tint-soft-dark`): background of tinted buttons ("Số khác", "Gọi") and the selected item in the wide web rail.

### Neutral
- **Grouped Background** (`grouped-background` / `-dark`): every screen, the native header, and the browser `html` / `body` on web.
- **Cell** (`cell` / `-dark`): inset grouped sections, summary tiles, the selected segment thumb, and the web bottom bar.
- **Cell Pressed** (`cell-pressed` / `-dark`): pressed state of tappable rows.
- **Label / Secondary / Tertiary Label**: primary text, then supporting text (subtitles, section headers, money-line labels), then chevrons and disabled hints.
- **Separator** (`separator` / `-dark`): hairline between rows, inset 16px from the leading edge, and the web rail and bar borders.
- **Fill** (`fill` / `-dark`): unselected chips, the segmented track, stepper buttons, courier handoff buttons, and skeleton bars.

### Semantic
- **Debt Red** (`danger` / `-dark`): late time text, "Còn nợ" debt amounts, the late summary tile, destructive rows and buttons, field errors. On a soft background it uses `danger-soft`.
- **Paid Green** (`success` / `-dark`): "Đã thu đủ" and the order's large amount once it is fully paid.
- **Status Pills** (`status-*`): four pairs only. Active pairs a rose wash with deep rose text for new, in progress, awaiting approval, and delivering. Late uses red, done uses green, and cancelled uses gray.

### Named Rules
**The One Tint Rule.** Rose means "you can press this" or "this is selected". It is never decoration, a heading color, or a background wash for content.

**The Four Meanings Rule.** Order state has exactly four colors: rose for work in progress (the pill's label names the step), red for late, green for done, gray for cancelled. A new status gets a label, not a new color.

**The Fill-Versus-Text Rule.** White labels sit on `tint-fill`. Rose text uses `tint`, which changes per mode. Don't swap the two.

## Typography

**Display Font:** SF Pro (system; `-apple-system` stack on web, Roboto on Android)
**Body Font:** SF Pro (same family)

**Character:** One system family set at Apple's text styles at the default Dynamic Type size, so it scales with the user's setting. Hierarchy comes from size and weight steps (700 for titles, 600 for headline and emphasis), never from a second face.

### Hierarchy
- **largeTitle** (700, 34/41): navigation large titles (drawn in-column as WebTitle on web) and the order's remaining amount.
- **title1** (700, 28/34): order customer name on the detail screen; the shop invite code.
- **title2** (700, 22/28): summary tile values ("4", "1", "3,83tr") and the running remaining total in the order form.
- **title3** (600, 20/25): the shop name heading its row (Shop tab, invite screen) and the wordmark in the wide web rail.
- **headline** (600, 17/22): order row customer names, button labels, empty-state titles, stepper value.
- **body** (400, 17/22): row titles, field input, wide-rail tab labels.
- **callout** (400, 16/21): order date line on the detail screen.
- **subhead** (400, 15/20): row subtitles, money lines, chips, small buttons, toast, courier buttons.
- **footnote** (400, 13/18): section headers (uppercase with Vietnamese locale, +0.2 tracking, the native iOS grouped-list header), section footers, tile labels, segment labels, "Còn X" under pills.
- **caption** (600 in pills, 400 elsewhere; 12/16): status pills and bottom tab-bar labels on web.

### Named Rules
**The Tabular Money Rule.** Every amount, count, and money input sets `tabular-nums` (the `money` prop on text, `font-variant-numeric` on web inputs). Amounts format as VND with dot grouping and a trailing "đ" (`480.000đ`). Summary tiles may abbreviate to "tr".

**The Biggest Number Rule.** On an order, the amount still to collect is the largest type on the screen (largeTitle). Total and paid sit beneath it as subhead lines.

## Layout

Content sits in a single centered column with a 720px maximum width and 16px horizontal padding. Sections start 24px apart. Section headers sit 16px in, 6px above the group. Footers are 6px below. The bottom of the scroll has 64px of padding. Spacing uses a 4-based scale (4, 8, 12, 16, 24, 32), and 12px is the usual gap inside rows and between controls.

Rows are at least 48px tall with 11px vertical and 16px horizontal padding. The detail column takes up to 55% of the width. Separators are hairlines inset 16px. Touch targets are 44px or more (courier buttons, steppers with hitSlop, web tabs).

The Today screen shows a row of three equal tiles (Đơn hôm nay, Trễ, Còn thu), then grouped sections by time of day (Trễ, Sáng, Chiều, Tối, Ngày mai).

Navigation adapts per platform. iOS and Android use NativeTabs with four tabs (Hôm nay, Đơn, Khách, Shop) tinted rose, plus a large-title stack per tab with label-colored titles, rose bar buttons, and no header shadow. Web shows a bottom bar under 900px. At 900px and up it switches to a 240px left rail with the wordmark, the shop name, and rose-wash selection.

## Elevation & Depth

The system is flat and tonal. White cells separate from the gray grouped background, or dark gray from black, by color alone, with no borders or shadows on cells, tiles, or buttons. Depth that does appear belongs to the platform: native sheets and action sheets, the translucent toast, and on web the small shadow under the selected segment thumb, which copies UISegmentedControl.

### Shadow Vocabulary
- **Segment thumb** (`box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 1px rgba(0,0,0,0.04)`): only the selected segment of the web segmented control.

### Named Rules
**The Tonal Lift Rule.** A surface comes forward by moving from the background color to the cell color, never by a shadow or outline.

## Shapes

Corners come in three steps. Section groups, tiles, full-size buttons, error notes, and the toast use 12px (`cell`). Small buttons, courier buttons, and rail items use 10px (`control`). The segmented control nests 9px and 7px inside that. Chips and pills are full capsules (`pill`), and stepper buttons are 36px circles. Groups clip their rows (`overflow: hidden`), so pressed states and the web focus outline stay inside the rounded shape. The only borders are hairline separators.

## Components

### Buttons
Calm, iOS-weight buttons. The whole width is the target, and the label is set in headline weight.
- **Shape:** gently rounded (`cell`, 12px), 50px tall. Small buttons are 36px tall with `control` corners and subhead labels.
- **Filled:** `tint-fill` background with a white label. Used for the single primary action on a screen, such as the next status step ("Bắt đầu làm") or "Thu đủ 480.000đ".
- **Tinted:** rose wash with rose text, for the secondary action beside a filled button ("Số khác") and round call buttons.
- **Plain:** transparent with rose text, for header actions ("Sửa") and retry.
- **Destructive:** `danger-soft` background with red text.
- **States:** opacity 0.7 when pressed, 0.4 when disabled. While loading, an ActivityIndicator in the label color replaces the label. On web, keyboard focus shows a 2px rose outline offset 2px.

### Chips
- **Style:** 36px capsule. Unselected uses `fill` with label text at weight 400.
- **State:** selected switches to `tint-fill` with a white label at weight 600. Chips are used for channel, quick date, and time slot choices.

### Status Pill
- A small capsule (3px by 8px padding) with caption text at weight 600, colored by one of the four meanings. In order rows it sits top-right, above "Còn X" or a green "Đã thu đủ".

### Cards / Containers (Section)
- **Corner Style:** 12px. **Background:** `cell`. **Shadow:** none. **Border:** none, only hairline separators between direct children.
- Optional header in uppercase footnote and optional footer note. The `bare` variant drops the white container for content that draws its own surface (tiles, button stacks).

### Inputs / Fields
- **Style:** a settings-style row inside a Section, with a 92px label column, body-size input, optional suffix ("đ"), and a rose caret and selection.
- **Money field:** number pad, right-aligned tabular input with dot grouping and an "đ" suffix.
- **Stepper:** circular minus and plus buttons on `fill` with the value in headline between them. Each end disables at its limit (opacity 0.35).
- **Dates:** the native date and time pickers on device. On web, browser `input[type=date|time]` with `accentColor` set to rose.
- **Focus:** on web the whole row gets a 2px rose outline inset by -2px. On device, the system caret is the focus indicator.
- **Error:** footnote red text below the field.

### Segmented Control
- The platform's own control (UISegmentedControl or the Material segmented button) tinted rose, 32px tall. On web it is redrawn with an iOS look: a `fill` track, a white thumb with a small shadow, and footnote labels (600 selected, 500 secondary otherwise).

### Navigation
- Native tabs and large-title stacks as described in Layout. Bar buttons are rose glyphs (a 22px plus for "Tạo đơn mới"), and back buttons are minimal. Icons are SF Symbols on iOS and Material Symbols on Android and web, mapped through one table.

### Money Block (signature)
- The Thanh toán section opens with a subhead label ("Còn phải thu" / "Đã thu đủ" / "Đơn đã huỷ · tổng đơn"). Under it the amount is set in largeTitle, label-colored while money is owed, green when fully paid, and secondary when the order is cancelled. Below that are subhead "Tổng đơn" and "Đã thu" lines, then a filled "Thu đủ X" button beside a tinted "Số khác". Rows follow for the VietQR code (shown on a white panel in both modes so it scans) and for sharing an invoice. A successful payment fires a success haptic and a toast.

### Customer Money
- In customer rows, debt comes first, as red subhead text "Còn nợ X" with orders and lifetime spend beneath. With no debt, lifetime spend shows in label color. A missing value shows a secondary dash rather than "0đ".

### Status Change
- The detail screen shows a filled button for the next step, plus a row "Đổi trạng thái", showing the current status, that opens the native action sheet with the current status disabled.

### Courier Handoff
- A wrapping row of 44px `fill` buttons, one per courier app (Grab, Xanh SM, Be, ...). Tapping one copies the delivery details and opens the app, and a toast says what happened.

### Feedback
- **Toast:** dark translucent capsule with subhead text at weight 600, placed above the tab bar. It fades in over 160ms and out over 200ms, with no slide, and is announced to VoiceOver.
- **Loading:** skeleton rows inside a Section, not a centered spinner.
- **Empty:** a centered headline, a secondary subhead, and an optional action.
- **Error note:** a `danger-soft` block with red subhead text and a plain "Thử lại".

## Do's and Don'ts

### Do:
- **Do** build every screen from Screen → Section → Row/Field on the grouped background, inside the 720px column.
- **Do** use the platform control first (NativeTabs, native stack headers, UISegmentedControl, native date pickers, action sheets). Draw an iOS-like stand-in only where the web lacks one.
- **Do** set every amount in tabular figures as VND with dot grouping and a trailing "đ", and give the remaining balance the largest type on an order.
- **Do** color order state with the four status pairs only: rose for in progress, red for late, green for done, gray for cancelled.
- **Do** put white labels on `tint-fill` and use `tint` for rose text and icons.
- **Do** keep one filled button per context. Secondary actions go tinted or plain.
- **Do** show a dash for an unknown amount instead of a fabricated zero.

### Don't:
- **Don't** add a second brand color, gradients, or a themed visual world. The user chose plain native iOS with one rose tint.
- **Don't** use rose for decoration, headings, or content backgrounds. It marks actions and selection.
- **Don't** give a new status its own color. It joins one of the four meanings.
- **Don't** put shadows or borders on cells, tiles, or buttons. Surfaces lift by tone.
- **Don't** replace the money with dashboard tiles or charts that hide what is owed.
- **Don't** introduce a second typeface or sizes outside the iOS text styles.
