# Test cách ly tenant

Chạy bằng `npm run test:tenant`. Bắt buộc xanh trước mọi merge.

Hình dạng của bộ test: dựng hai tổ chức bằng đúng luồng đăng ký thật, rồi đọc
bản ghi của tổ chức A bằng ngữ cảnh phiên của tổ chức B. Kết quả phải là không
tìm thấy — không phải lỗi quyền, vì lỗi quyền đã tiết lộ rằng bản ghi có tồn
tại.

| Tệp | Phủ |
|---|---|
| `cach-ly-repository.test.ts` | Mọi bảng có `organization_id`: `workspaces` · `branches` · `roles` · `memberships`, cộng với `organizations` mà khoá lọc là chính cột `id` |
| `cach-ly-endpoint.test.ts` | Sáu endpoint của P1. `POST /session/organization` là chỗ duy nhất client nêu tên một tổ chức, nên cũng là chỗ duy nhất phép thử "404 chứ không 403" có nghĩa |
| `khong-khoa-ghi-toan-cuc.test.ts` | `YC-T9` — hai tổ chức ghi đồng thời không ai chặn ai; mã chi nhánh duy nhất trong phạm vi tổ chức chứ không toàn hệ thống |
| `khong-import-prisma-ngoai-infra.test.ts` | Phép quét mã nguồn: không tệp nào ngoài `infra/` chạm tới client cơ sở dữ liệu |

Bộ test cần một Postgres thật và lược đồ đã đẩy lên: `npx prisma db push` trước
khi chạy. Nó dọn sạch bảy bảng nền giữa các trường hợp, nên đừng trỏ
`DATABASE_URL` vào cơ sở dữ liệu có dữ liệu cần giữ.

Còn phải phủ khi các pha sau tới: đường dẫn lưu trữ, dòng job từ lúc tạo tới
lúc worker đọc, và endpoint duyệt.
