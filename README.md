# Floied

Sổ đơn chung cho shop hoa nhỏ. Cả shop (chủ + quản lý) cùng thấy đơn hôm nay, đơn trễ, tiền còn thu, và cập nhật realtime khi ai đó đổi trạng thái hay thu tiền. Hoa trước, mô hình dữ liệu để sẵn cho loại đơn khác (bánh, quà…).

- **App**: Expo SDK 58 (React Native 0.88, expo-router). Một codebase cho iOS → web → Android.
- **Server**: Bun + Hono + SQLite (`bun:sqlite`), WebSocket cho realtime. Thư mục `server/`.
- **Dùng chung**: `shared/domain.ts` (schema zod, kiểu dữ liệu, trạng thái đơn) cho cả app và server.

## Chạy thử

```bash
npm install
(cd server && bun install)

npm run server        # API ở http://localhost:8787 (dev: mã OTP in ra console và hiện trên màn đăng nhập)
npx expo start        # i = iOS Simulator, w = web, quét QR bằng Expo Go trên iPhone
```

iPhone thật qua Expo Go: điện thoại và máy tính cùng Wi‑Fi; app tự gọi API ở `http://<IP máy tính>:8787`.

Kiểm tra:

```bash
npm run test:server   # 14 test: OTP, phân quyền theo shop, mời thành viên, tiền, bảng Hôm nay
npm run typecheck
npx expo lint
```

## Đã có (phase 1)

- Đăng nhập email + mã 6 số (rate limit, khoá sau 5 lần sai, phiên 90 ngày trượt).
- Tạo shop, nhiều shop / tài khoản, đổi shop. Vai trò **Chủ** (xoá shop, xoá thành viên) và **Quản lý** (mọi dữ liệu đơn).
- Mời quản lý bằng mã 6 ký tự / link `floied://join/MÃ`, hết hạn 7 ngày, thu hồi được. Người ngoài shop gọi API shop nhận 404.
- Đơn: khách (tự gợi ý khách quen theo tên/SĐT), sản phẩm, giao tận nơi / khách tới lấy, ngày + khung giờ, lời thiệp, ghi chú, phí ship, giảm giá, cọc.
- Trạng thái một chạm: Mới → Đang làm → Chờ khách duyệt → Đang giao (Chờ khách lấy) → Đã giao, huỷ / mở lại. Lịch sử ghi ai làm gì.
- Tiền: còn phải thu luôn hiện to, thu đủ một chạm, thu số khác, mã **VietQR** điền sẵn số tiền + nội dung `DH<số đơn>`, gửi hoá đơn qua Zalo/Messenger (share sheet).
- **Gọi xe giao**: Grab, Xanh SM, Be, Ahamove, Lalamove. Bấm là chép sẵn "lấy hàng / giao tới / thu hộ" rồi mở app (chưa cài thì mở App Store / Play Store).
- Hôm nay: Trễ / Sáng / Chiều / Tối / Xong hôm nay / 7 ngày tới. Danh sách đơn có tìm kiếm, khách hàng có tổng đã mua.
- Realtime giữa các thành viên qua WebSocket, tự kết nối lại.

## Lưu ý quan trọng

- **Deeplink app giao hàng**: Grab, Xanh SM, Be, Ahamove, Lalamove không công bố tham số deeplink để điền sẵn điểm lấy/giao. App chép thông tin vào clipboard rồi mở app. App Store id đã kiểm qua iTunes API; URL scheme (`grab://`, `xanhsm://`, `be://`, `ahamove://`, `lalamove://`) và package Android của Grab/Lalamove **cần thử trên máy thật** (`src/lib/delivery.ts`). Sai scheme thì chỉ mở trang store, không crash.
- **Email OTP**: chưa có `RESEND_API_KEY` thì server in mã ra console. Mã chỉ được trả trong response khi bật `OTP_DEV_ECHO=1` (script `npm run server` bật sẵn cho dev); đừng bật biến này khi deploy.
- **Bundle id** `vn.floied.app` là tạm, đổi trong `app.json` trước khi lên store.
- **SQLite**: một file (`server/data/floied.db`, chế độ WAL). Chạy một instance server; sao lưu bằng Litestream hoặc cron copy.

## Lộ trình

1. Ảnh bó hoa / ảnh giao hàng, danh mục sản phẩm có ảnh.
2. Lịch tháng, danh sách hoa cần mua, thống kê doanh thu.
3. Nhắc việc (push), widget + Live Activity trên iOS.
4. Quét ảnh chụp tin nhắn để lấy tên/SĐT/địa chỉ.
5. Đăng nhập Apple/Google, vai trò nhân viên (không xem doanh thu), loại đơn ngoài hoa.

## Thiết kế

Dùng [Impeccable](https://github.com/pbakaus/impeccable) (`.claude/skills/impeccable`). Hướng đã chọn: chuẩn iOS thuần, tint hồng `#D1336B`, thước đo độ chỉn chu là Momo / app ngân hàng VN. Xem `PRODUCT.md` và `.impeccable/surfaces/src-app.md`.
