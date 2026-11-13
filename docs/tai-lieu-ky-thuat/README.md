# Tài liệu kỹ thuật ALG — 123 chức năng bàn giao ALG

Bộ tài liệu dành cho đội kỹ thuật bảo trì, cập nhật và nâng cấp ALG. Nội dung mô tả mã nguồn trên nhánh `main`. Mỗi chức năng trong checklist bàn giao ALG (123 chức năng, 10 nhóm) có mục riêng: mã nằm ở đâu, dữ
liệu nào, API nào, ai được dùng, test nào bảo vệ, và cần sửa chỗ nào khi đổi hành vi.

Hướng dẫn thao tác cho người dùng cuối nằm ở [`docs/huong-dan-su-dung/`](../huong-dan-su-dung/README.md).

## Mục lục

**Phần chung**

| Tài liệu | Nội dung |
|---|---|
| [01 — Kiến trúc tổng thể](01-kien-truc-tong-the.md) | Công nghệ, cấu trúc thư mục, tầng domain/infra/adapters, luồng một request, tác vụ nền, AI gateway, lưu trữ tệp, thông báo |
| [02 — Cách ly dữ liệu và phân quyền](02-cach-ly-du-lieu-va-phan-quyen.md) | Ngữ cảnh tổ chức, 404 chéo tổ chức, Row Level Security, mã năng lực và trần cứng, vai hệ thống, phạm vi chi nhánh, Console nền tảng |
| [03 — Quy trình thay đổi và kiểm thử](03-quy-trinh-thay-doi-va-kiem-thu.md) | Quy trình sửa mã, đổi lược đồ, các cổng CI, bộ test, quy tắc bắt buộc, bẫy thường gặp |
| [04 — Vận hành và triển khai](04-van-hanh-va-trien-khai.md) | Dịch vụ trên Render, biến môi trường, migration production, việc định kỳ, cấu hình còn chờ |

**Theo nhóm chức năng**

| Nhóm | Tài liệu | Số chức năng |
|---|---|---:|
| 1 | [Nền tảng chung & phân quyền](nhom-01-nen-tang-phan-quyen.md) | 19 |
| 2 | [Sản phẩm, mẫu hoa & hình ảnh](nhom-02-san-pham.md) | 9 |
| 3 | [Báo giá](nhom-03-bao-gia.md) | 13 |
| 4 | [Đơn hàng](nhom-04-don-hang.md) | 32 |
| 5 | [Thẻ Chào & trang khách hàng](nhom-05-the-chao.md) | 15 |
| 6 | [Báo cáo](nhom-06-bao-cao.md) | 9 |
| 7 | [AI phân tích, nội dung & marketing](nhom-07-ai-noi-dung.md) | 3 |
| 8 | [Landing page](nhom-08-landing-page.md) | 1 |
| 9 | [Chat nội bộ, chuỗi & phân quyền nâng cao](nhom-09-chat-chuoi-nang-cao.md) | 14 |
| 10 | [Credit AI, hạn mức & thuê bao](nhom-10-credit-thue-bao.md) | 8 |

## Cách đọc mục của một chức năng

Mỗi chức năng trong tài liệu nhóm có cùng khung:

- **Hành vi** — chức năng làm gì, đúng như mã đang chạy.
- **Mã chính** — tệp giữ luật nghiệp vụ (domain), use-case, repository, route API, component giao diện.
- **Dữ liệu** — bảng, cột, enum trong `prisma/schema.prisma`.
- **Quyền** — mã năng lực (`R1`, `D19`, `N20`…) mà use-case kiểm; trần cứng nếu có.
- **Test** — tệp test khoá hành vi. Đổi hành vi thì sửa test cùng commit.
- **Khi nâng cấp** — chỗ cần sửa và ràng buộc phải giữ.
- **Giới hạn hiện tại** — phần chưa làm, ghi rõ để không hiểu nhầm là lỗi.

## Ký hiệu đường dẫn rút gọn

| Rút gọn | Đường dẫn đầy đủ |
|---|---|
| `org/` | `src/modules/organization/` |
| `gc/` | `src/modules/greeting-card/` |
| `api/` | `src/app/api/v1/` |
| `tt/` | `tests/tenant/` |
| `tp/` | `tests/platform/` |
| `tu/` | `tests/unit/` |

## Nguồn sự thật liên quan

| Chủ đề | Tài liệu |
|---|---|
| Quy tắc bắt buộc cho người và agent | `CLAUDE.md`, `.agents/AGENT_RULES.md` |
| Danh mục mã năng lực | `docs/dac-ta/02-function-catalog.md`, `src/core/rbac/capability-catalog.ts` |
| Đặc tả API | `docs/dac-ta/06-api-specification.md` (kiểm tự động bằng `npm run check:docs`) |
| Đặc tả CSDL | `docs/dac-ta/07-database-specification.md` (kiểm tự động bằng `npm run check:docs`) |
| Hợp đồng màn hình | `docs/dac-ta/screen-contracts/` (kiểm bằng `npm run check:screen-contracts`) |
| Hệ thống thiết kế giao diện | `docs/design-system/README.md` |
| Vận hành production | `docs/handover/OPERATIONS_RUNBOOK.md` |
| Bằng chứng ánh xạ từng chức năng | `docs/handover/BAO_CAO_ANH_XA_123_CHUC_NANG.md` |

## Giữ tài liệu khớp mã

Sửa hành vi một chức năng thì sửa mục tương ứng trong bộ này cùng commit, cùng với đặc tả 06/07 và hợp đồng màn hình nếu chạm
tới. Đường dẫn tệp trong tài liệu phải là đường dẫn có thật; đổi tên hoặc tách tệp thì cập nhật lại.
