# 00 — Tóm tắt điều hành: Audit SDAGF cho ALG

| Mục | Giá trị |
|---|---|
| Framework | SDAGF 0.1.0-draft (`docs/governance/sdagf/`) |
| Repo / commit | `antranhub22/smeOS` @ `49e7d86`, branch `claude/focused-faraday-nlh8p6` |
| Ngày audit | 2026-10-29 |
| Phương pháp | Đọc tĩnh code, schema, config, CI, tài liệu vận hành. **Không** chạy DB, không truy cập Render/R2, không chạy test. |
| Trạng thái | Chỉ báo cáo — không sửa code. Chờ PO duyệt kiến trúc mục tiêu và roadmap. |

## Kết luận chính

ALG có nền tảng tenancy ở tầng dữ liệu khá tốt: `scopedWhere`, đường dẫn kho theo `org/<organization_id>/…` dựng phía máy chủ, 119 file test cách ly tenant chạy trong CI, gitleaks và CodeQL. Ngược lại, **tầng lưu trữ tệp (object storage) chưa được quản trị**: không có xoá payload, không có sao lưu cho kho tệp, chưa có retention/legal hold, và có một lỗ hổng truy cập nghiêm trọng.

### Critical / High (xem `05-risk-register.md`)

| ID | Mức | Phát hiện |
|---|---|---|
| R-01 | **Critical** | `src/app/api/v1/storage/[...key]/route.ts:15` — mọi key bắt đầu bằng `videos/` **bỏ qua kiểm chữ ký cho cả GET lẫn PUT**. Ai biết hoặc đoán được key đều đọc được và **ghi đè** được video của tenant khác mà không cần đăng nhập. |
| R-02 | High | PUT storage không giới hạn kích thước và không kiểm magic-byte; `content-type` lấy từ client (`route.ts:28-30`). Route GET còn phục vụ `.svg` là `image/svg+xml` cùng origin (`route.ts:52`). |
| R-03 | High | Xoá asset chỉ xoá dòng DB (`asset-repository.ts:101-104`, `trash-repository.ts:264`); `StorageProvider` không có phương thức `delete`. Payload, bản phái sinh và thumbnail còn lại vĩnh viễn → mồ côi, vi phạm cam kết xoá, tốn chi phí. |
| R-04 | High | Không có sao lưu hoặc versioning cho kho tệp (R2/S3). Runbook chỉ nói PITR Postgres (`VAN_HANH_SU_CO_VA_SAO_LUU.md:11`), và chưa từng diễn tập restore (`:28`). |
| R-05 | High | Purge thùng rác 30 ngày chạy "lười" khi người dùng mở danh sách, kiểu fire-and-forget và nuốt lỗi (`trash-repository.ts:53,93`). Không có job định kỳ, không có legal hold. |
| R-06 | High | URL video công khai, ổn định, không hết hạn (`workers/media_ai/video/video_worker.py:133`), cùng `cache-control: public, immutable` cho ảnh (`route.ts:70`). |

### Bảng control (chi tiết ở `04-control-assessment.md`)
PASS 7 · PARTIAL 12 · FAIL 8 · NOT_ASSESSED 3. Không gộp thành điểm trung bình.

### Trạng thái thực thi (29/10/2026)
P0–P4 đã làm trong repo (PR antranhub22/smeOS#72), P5 có đánh giá lại và checklist bàn giao: **PASS 15 · PARTIAL 11 · FAIL 1 (021 — chưa diễn tập khôi phục) · NOT_ASSESSED 3** (`13-reassessment.md`). Chưa đạt cổng Commercial/Production/Handover — phần còn lại nằm ngoài repo (backup R2, diễn tập, bằng chứng Render/R2, DPA), xem `14-handover-checklist.md`.

### Đề xuất ưu tiên
1. **P0 (ngay):** bỏ ngoại lệ `videos/` (chuyển sang URL ký có hạn), chặn PUT không chữ ký, giới hạn kích thước, kiểm magic-byte, ngừng phục vụ SVG inline.
2. **P1:** thêm `delete` vào `StorageProvider`, xoá payload theo outbox, job purge định kỳ, bật versioning hoặc sao chép kho R2.
3. **P2+:** ma trận retention do PO chốt, legal hold, job đối soát registry↔payload, diễn tập restore.

Không có tuyên bố nào về chứng nhận ISO/SOC 2 từ audit này.
