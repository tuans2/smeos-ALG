# Hướng dẫn điểm duyệt Bước 5 — Đóng băng và cắt bản giao GD1

Dành cho chủ dự án. Kế hoạch gốc: `docs/plan/BANGIAO_GD1_123_CHUC_NANG.md` (Bước 5). Thời gian đọc: 45–60 phút.

Mục đích: trước khi gắn tag `gd1-rc-<ngày>`, bạn xác nhận bản cắt **bỏ đúng**, **giữ đủ**, **không sót** phần chưa giao, và **không lộ** dữ liệu.

## 1. Lấy báo cáo cắt

Cách A — từ CI (không cần máy):

1. Mở PR của nhánh trên GitHub → tab **Checks** → workflow **Bản giao GD1** → lượt chạy mới nhất màu xanh.
2. Cuối trang lượt chạy, mục **Artifacts** → tải `gd1-cut-report` → mở `gd1-cut.report.md`.

Cách B — chạy tại máy (cần bản sao đủ lịch sử, Node 22, `.env` như README):

```bash
npm run release:cut -- gd1 HEAD /tmp/gd1-cut
```

Báo cáo nằm ở `/tmp/gd1-cut.report.md`, bản cắt ở `/tmp/gd1-cut`.

Ghi lại **mốc nguồn** (dòng đầu báo cáo, mã commit): mọi xác nhận dưới đây gắn với mốc đó.

## 2. Xem từng phần của báo cáo

| Phần trong báo cáo | Bạn kiểm gì | Đạt khi |
|---|---|---|
| Dòng đầu: số trang, số API | So với phạm vi đã chốt (`docs/plan/BANGIAO_GD1_PHAM_VI.md`) | 90 trang, ~475 API, khớp danh sách 123 chức năng |
| **Tệp bị bỏ theo lý do** | Lý do nào có số lớn bất thường so với lượt trước | Không có lý do mới mà bạn không hiểu |
| **Test bị bỏ** — dòng **[xem lại]** | Test chạm code *được giao* nhưng phải bỏ vì cần phần không giao (54 dòng ngày 11/11/2026) | Mỗi dòng: chức năng được giao vẫn còn test khác giữ hành vi (xem mục 3) |
| Tài liệu giữ lại vì code còn đọc | Không có tài liệu nội bộ nhạy cảm (giá, đối tác, khách) | Chỉ tài liệu kỹ thuật |
| Lệnh npm bị bỏ | Không bỏ lệnh ALG cần để chạy, build, test | Chỉ lệnh của phần không giao |
| Baseline làm lại | Chỉ **bỏ** mục, không thêm | Mọi dòng ghi "bỏ N mục" |
| Lớp phủ | Đúng 5 tệp riêng của ALG (`.env.example`, CI, README, `render.yaml`, test blueprint) | Không có tệp lạ |
| Tài liệu căn theo bản cắt | Đặc tả API chỉ còn endpoint có trong bản cắt | Có dòng "bỏ N dòng" |
| Báo nhầm gitleaks mang sang | Mỗi dòng là chỗ quét bí mật báo nhầm (tên biến có chữ "key"), không phải khoá thật | Bạn mở thử 2–3 dòng, thấy không có giá trị khoá |
| **Phụ thuộc vào vùng không giao** | Code được giao còn nhắc route không giao | Chỉ còn lược đồ hợp đồng (`_contracts/*`), không có trang hay nút gọi tới |
| SHA-256 | Dấu vân tay bản cắt | Ghi lại để so ở Bước 6 |

## 3. 54 test "[xem lại]" — cách duyệt nhanh

Không cần đọc mã. Với mỗi nhóm (nhìn tên thư mục đầu dòng):

1. Tên tệp thiếu (phần "thiếu `…`") thuộc chức năng **không giao** → chấp nhận.
2. Test thuộc chức năng **được giao** mà không còn test nào khác cho chức năng đó → đánh dấu, gửi lại cho người làm để tách phần chạy được (cách đã làm với 22 tệp: bọc riêng phần không giao).

Mẹo: tìm chữ `[xem lại]` trong báo cáo; các dòng cùng thư mục thường cùng một lý do, duyệt theo nhóm.

## 4. Rò rỉ dữ liệu

1. Workflow **Bản giao GD1** có bước "Kiểm rò rỉ trên bản cắt" và "Quét bí mật trên bản cắt (gitleaks)" xanh.
2. Danh sách được chấp nhận: `releases/gd1/leak-baseline.json` (346 mục: số điện thoại, email, tên bên khác, mật khẩu mẫu, đường dẫn máy). Mở tệp, đọc lướt cột tên tệp: chỉ được là test, script mẫu, tài liệu kỹ thuật. Thấy tệp thật của khách → dừng, báo lại.
3. Quyết định đã chốt 11/11/2026: giữ 9 số điện thoại giả trong test (bộ kiểm của ứng dụng đòi số di động hợp lệ). Baseline chỉ được **giảm** từ đây.

## 5. Hai quyết định của Bước 5

1. **Bảng CSDL**: giữ đủ 154 bảng (mặc định, an toàn: migration giữ nguyên, nâng cấp sau dễ) hay bỏ 13 bảng không dùng (gọn hơn, nhưng phải viết migration riêng cho bản giao). Đề xuất: **giữ đủ**.
2. **Gắn tag**: khi mục 2–4 đạt, trả lời "Gắn tag gd1-rc-<ngày>". Người làm sẽ chạy:

```bash
git tag -a gd1-rc-2026-11-12 -m "Ứng viên bản giao GD1" <mốc nguồn>
```

```bash
git push origin gd1-rc-2026-11-12
```

Sau tag chỉ nhận sửa lỗi phát hiện ở Bước 6.

## 6. Mẫu trả lời

```
Điểm duyệt Bước 5 — mốc <mã commit>
- Bỏ/giữ: đạt / không đạt (ghi dòng)
- 54 test xem lại: chấp nhận / cần tách: <danh sách>
- Rò rỉ: đạt / không đạt
- Bảng CSDL: giữ đủ 154 / bỏ 13
- Gắn tag: có / chưa
```
