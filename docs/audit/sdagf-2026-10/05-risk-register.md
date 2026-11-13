# 05 — Risk register

Xếp theo thứ tự ưu tiên của Master Prompt Phase 4. Khả năng xảy ra và tác động: C = Critical, H = High, M = Medium, L = Low.

## Critical / High

| ID | Rủi ro | Nhóm | Tác động | Khả năng | Root cause (bằng chứng) | Control | Xử lý |
|---|---|---|---|---|---|---|---|
| R-01 (**đã xử lý P0-1**) | Đọc/**ghi đè** video không cần xác thực qua `/api/v1/storage/videos/<org>/<job>.mp4` | 1 xuyên tenant, 4 truy cập trái phép | C — phá hoại hoặc thay nội dung video khách, lộ video | M — key là 2 UUID nhưng URL nằm trong trang công khai/catalog nên rò được; biết URL là PUT được | Ngoại lệ `route.ts:15` áp cho cả PUT; URL ổn định `video_worker.py:133` | 007, 014 | P0-1 |
| R-01b (**đã xử lý P0-1**) | Chữ ký HMAC không gắn phương thức: URL **xem** đã ký (kể cả trên catalog công khai) dùng được để **PUT ghi đè** tệp | 1, 4 | C | M | `storage-signing.ts` ký `key:exp` cho mọi phương thức (phát hiện khi triển khai P0-1) | 007, 014 | P0-1 |
| R-02 (**đã xử lý P0-2**) | Upload không giới hạn kích thước, không kiểm nội dung; SVG phục vụ inline cùng origin | 4 | H — DoS bộ nhớ web (`arrayBuffer`), stored XSS qua SVG nếu key `.svg` được ký | M | `route.ts:28-30,52` | 008 | P0-2 |
| R-03 (**đã xử lý P1-3, xoá tệp chờ bật cờ sau backup R2**) | Xoá không xoá payload/bản phái sinh | 5, 8 | H — dữ liệu khách tồn tại sau khi "xoá vĩnh viễn"; chi phí tăng | C (luôn xảy ra) | Provider không có `delete`; `trash-repository.ts:264`, `asset-repository.ts:102` | 012, 026 | P1-3 |
| R-04 | Mất tệp không khôi phục được | 2 | C — mất toàn bộ ảnh/video nếu bucket lỗi hoặc bị xoá nhầm | L–M | Runbook chỉ có DB; versioning bucket: ? | 020, 021 | P1-4 |
| R-05 | Restore DB chưa từng diễn tập | 2 | H | M | `VAN_HANH_SU_CO_VA_SAO_LUU.md:28` | 021 | P1-5 |
| R-06 (**đã xử lý P1-6 + legal hold**) | Purge thùng rác không tin cậy và không có legal hold | 6 | H — xoá sai lúc hoặc không xoá; không giữ được khi tranh chấp | H | Lazy purge fire-and-forget `trash-repository.ts:53,93` | 011, 013 | P1-6, P2 |
| R-07 (**giảm: đối soát report-only P2-1**) | Không đối soát registry↔payload | 5 | H — dòng trỏ tệp không tồn tại, tệp mồ côi không ai biết | H | Không có job | 017 | P2 |
| R-08 | Cấu hình bucket (public, SSE, quyền key) chưa xác minh | 1, 3 | H nếu bucket public | ? | Ngoài repo | 019, 027 | P0-4 (thu bằng chứng) |

## Medium / Low
| ID | Rủi ro | Ghi chú |
|---|---|---|
| R-09 | Ký URL kho bằng `SESSION_SECRET` | Xoay khoá phiên làm hỏng mọi URL; khoá dùng hai mục đích (`storage-signing.ts:18`) |
| R-10 | Hai bản cài SigV4 (TS/Python) | Lệch hành vi khi đổi provider |
| R-11 | Ảnh có `cache-control: public, immutable` 1 ngày | Ảnh đã xoá vẫn nằm trong CDN/proxy cache (`route.ts:70`) |
| R-12 | Một số module ghi tệp không qua registry `assets` | audio, collage, video (C-002) |
| R-13 | Log có thể chứa payload/PII | Chưa đánh giá (C-029) |

| R-14 (**đã xử lý 29/10: `publish_render` đưa video lên kho dùng chung**) | Worker video ghi tệp ra đĩa cục bộ của worker (`workers/media_ai/video/video_worker.py:31-32,102`), không lên kho dùng chung; web (dịch vụ Render khác) nhiều khả năng không đọc được video đã render | Ngoài phạm vi SDAGF P3 — đề xuất task riêng |
| R-15 | `npm run nap:phan-tich` nạp `storage-provider-factory` (`import "server-only"`) qua `tsx` không có `--conditions=react-server` — nhiều khả năng lỗi khi chạy | Ngoài phạm vi; `storage:reconcile` đã dùng cờ này |

| R-16 (**đã xử lý 04/11/2026**) | Xoá vĩnh viễn không kiểm asset đang dùng theo id — mất chứng từ thanh toán, ảnh sản phẩm, logo sau 30 ngày thùng rác | `asset-usage-guard.ts` + test kiến trúc; xem `15-reaudit-2026-11-04.md` |

## Hypothesis (chưa có bằng chứng)
- H-1: ngoại lệ `videos/` được thêm để thẻ `<video>` trên trang công khai phát được mà không cần ký lại. Cần xác nhận với người viết.
