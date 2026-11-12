# Báo cáo đổi nhận diện sang ALG (mức 3)

Quyết định của người giao việc ngày 12/11/2026: mức 3 (đổi toàn bộ), dùng logo trong repo (`public/brand/avi-lotus/`), đồng ý bảng màu trạng thái đề xuất, tên sản phẩm hiển thị **ALG** (viết tắt AVI Lotus Group). **PO cần xác nhận trước khi gộp nhánh** (đổi token cần PO duyệt — `docs/design-system/README.md` §3).

## 1. Đã đổi

| Hạng mục | Thay đổi | Vị trí |
|---|---|---|
| Bộ giao diện | Preset `alg` mặc định cho mọi tầng (Console, Chuỗi giữ mật độ gọn); cửa hàng vẫn chọn lại được preset cũ | `src/styles/tokens/themes.css`, `src/lib/ui-system/` |
| Màu | Chính `#133D31`, nền `#F0EFEF`, chữ `#242C28`; trạng thái từ màu phụ của brand kit | như trên |
| Phông | Google Sans (SIL OFL, kèm giấy phép), trục đậm 400–700, lọc Latin + tiếng Việt, woff2 56/59 KB | `src/app/fonts/google-sans/`, `src/app/layout.tsx` |
| Logo, favicon | Logo ngang ở trang đăng nhập; favicon và icon iPhone cắt từ biểu tượng hoa sen | `src/app/(auth)/dang-nhap/page.tsx`, `src/app/icon.png`, `src/app/apple-icon.png` |
| Tên | "smeOS" → "ALG" ở 109 dòng chữ hiển thị (tiêu đề trang, Copilot, chân trang, trang khách, phiếu in, i18n, lời chào trợ lý); tên và logo gom về `src/lib/brand.ts` | 71 tệp |
| Email thông báo | Tiêu đề `[ALG]`, nút màu `#133D31`, chữ Jet Set, phông Google Sans (dự phòng Arial) | `email-adapter.ts` |
| Phiếu in | Màu "đã thu"/"quá hạn" theo màu trạng thái ALG | `order-evidence-print.tsx` |
| Ảnh xem trước khi chia sẻ link | Nền xanh Botanical Garden, điểm nhấn vàng Yellow Balloon | `og/catalog-collage-image.tsx` |

### Màu trạng thái — vì sao không dùng nguyên màu phụ cho chữ
`text-success` được dùng làm màu chữ ở 426 chỗ, `text-info` 49 chỗ; `#93A87C` và `#9DB4D4` chỉ đạt 2,1–2,6:1 với nền trắng/chữ trắng. Vì vậy màu gốc của brand kit dùng cho **nền nhạt và viền** (`-border`), còn chữ và nền đậm dùng **sắc đậm hơn cùng tông**. Vàng cảnh báo dùng đúng `#E7C447` làm nền; 16 chỗ chữ trắng trên nền vàng đã đổi sang chữ tối. Test `tests/unit/ux/alg-brand-theme.test.ts` kiểm 29 cặp chữ/nền ≥ 4,5:1.

## 2. Cố ý giữ nguyên

| Chỗ | Lý do |
|---|---|
| Mã liên kết Telegram `SMEOS-…`, User-Agent | Định dạng kỹ thuật; đổi làm hỏng mã đã phát |
| Tên chủ tài khoản ngân hàng nạp credit (`vietqr-billing.ts`) | Là tài khoản thật — cần ALG cung cấp tài khoản mới |
| Tên cột và tên tệp mẫu Excel nhập hàng loạt | Giữ để tệp mẫu cũ vẫn nhập được |
| Tiêu đề OpenAPI, tiêu đề hợp đồng JSON, ghi chú "FloraOS v1" | Tài liệu kỹ thuật/lịch sử, không hiển thị cho người dùng |
| Prompt hệ thống gửi AI (thẩm định ảnh, QC, POD, trợ lý sản phẩm) | Không hiển thị; đổi có thể ảnh hưởng hành vi AI — cần kiểm riêng |
| Mã QR in ấn | Dùng logo và màu **của từng cửa hàng** |
| Thương hiệu khách AVI GIFT trong mã | Chưa có quyết định |

## 3. Cần ALG/PO cung cấp hoặc quyết

1. **Tên miền**: mã còn `app.smeos.vn`, `docs.smeos.vn`, `smeos.vn/shop` (liên kết thật). Cần tên miền ALG.
2. **Tài khoản ngân hàng** nạp credit nền tảng (đang là "CONG TY CONG NGHE SMEOS").
3. Prompt AI có đổi tên trợ lý/nền tảng sang ALG không.
4. Logo bản trắng cho nền tối (repo đã có `*-white.png`; chưa dùng ở màn nào).

## 4. Kiểm tra

- Typecheck, lint ratchet, `lint:ux` (23, không tăng), `check:docs`, `npm test` (chỉ còn `public-url` đỏ do `.env` local, có từ trước).
- Trên server dev: phông Google Sans nạp thật trên mọi màn đã kiểm; axe không còn lỗi tương phản màu trên 12 lượt màn (đăng nhập, trang chủ, Thẻ chào, Chính sách AI, Sản phẩm, Đơn hàng × 390/1280); favicon và ảnh OG trả 200.
- Phát hiện khi kiểm: trước khi sửa, phông chữ **không được nạp** (body nhận chuỗi gốc từ `@theme`, biến của `next/font` chỉ đặt trên body). Đã sửa bằng `className` của phông. Cách nạp Be Vietnam Pro cũ giống hệt nên nhiều khả năng lỗi có từ trước (chưa đối chiếu với `main`).
- **Chưa chạy**: `test:tenant`, `test:platform`, `test:e2e:ux` — ảnh chụp chuẩn của e2e sẽ khác toàn bộ vì đổi màu, cần sinh lại trên CI sau khi PO duyệt.
- Phông thương hiệu chỉ đến độ đậm 700: 623 chỗ dùng `font-extrabold`/`font-black` hiển thị ở 700 (khớp hướng dẫn "hạn chế Bold" của brand kit).
