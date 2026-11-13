# 04 — Đánh giá control SDAGF-001…030

Thang: PASS / PARTIAL / FAIL / NOT_APPLICABLE / NOT_ASSESSED. Ưu tiên khắc phục P0–P5 khớp `10-implementation-roadmap.md`.

| ID | Control | Trạng thái | Mức | Quan sát & bằng chứng | Khuyến nghị | Ưu tiên | Tin cậy |
|---|---|---|---|---|---|---|---|
| 001 | Inventory asset classes | PARTIAL | High | `asset_kind` có 10 giá trị (`schema.prisma:389`), nhưng chưa có catalog lớp tài sản ngoài ảnh/video (bảng tính, audio, collage, export) | Duyệt `02-asset-inventory.md` thành catalog chính thức | P1 | Cao |
| 002 | System of record mỗi class | PARTIAL | High | Ảnh/video: `assets`/`video_jobs`. Audio, collage, video `videos/…` có ghi tệp không qua `assets` (`music-tracks.ts`, `catalog-collage.ts`, `video_worker.py:133`) | Mọi payload phải có dòng registry | P1 | TB |
| 003 | Storage routing được định nghĩa | PARTIAL | High | Một bucket, hai tiền tố (`org/…`, `videos/…`); chưa có tài liệu routing | `08-storage-routing-matrix.md` | P1 | Cao |
| 004 | Asset ID ổn định | PASS | Medium | UUID cấp phía máy chủ, khớp key (`create-upload-url.ts`, `storage-key.ts`) | — | — | Cao |
| 005 | Metadata bắt buộc được validate | PARTIAL | Medium | `storageKeyMatchesContext`, MIME whitelist; `metadata` là JSON tự do, `file_size` tuỳ chọn và không đối chiếu byte thật | Zod schema cho `metadata`; ghi size/sha thật phía máy chủ | P1 | Cao |
| 006 | Tenant context server-side | PASS* | Critical | `requireTenantContext` + `scopedWhere`; CI chạy `test:tenant` (ci.yml:81). *Trừ route storage, thuộc 007 | — | — | Cao |
| 007 | Không dùng path/ID thay authz | PASS (sau P0-1) | Critical | Bỏ miễn chữ ký `videos/`; chữ ký gắn phương thức; test route | Chuyển link công khai sang `public/` (D-05) | P3 | Cao |
| 008 | Upload validation/quarantine | PARTIAL (sau P0-2) | High | Giới hạn byte, magic-byte, kiểu tệp từ key, SVG sandbox; chưa quét malware/quarantine | ClamAV khi khách yêu cầu (D-07) | P3 | Cao |
| 009 | Secrets không nằm trong repo/log | PASS | Critical | Quét pattern không thấy secret thật; khoá AWS duy nhất là ví dụ chuẩn trong test `sigv4.test.ts:20`; CI có gitleaks (ci.yml:96) | Giữ nguyên; thêm quét log | — | TB (log chưa xem) |
| 010 | Lifecycle state transitions | PARTIAL | High | `asset_state` + `approval_state`; chuyển trạng thái rải trong use-case, không có state machine tập trung; ARCHIVED kiêm luôn "thùng rác" | Hàm chuyển trạng thái thuần trong `domain/` kèm test | P2 | TB |
| 011 | Retention có owner/cơ sở | **FAIL** | High | Chỉ có 30 ngày thùng rác hard-code (`trash-types.ts`); không có ma trận retention | **DECISION REQUIRED** D-03 | P1 | Cao |
| 012 | Deletion xử lý versions/derived | PARTIAL (sau P1) | High | Xoá vĩnh viễn → outbox → cron xoá payload + thumbnail khi không còn tham chiếu; tắt cờ tới khi có backup R2 | Bật cờ sau P1-4 | P1 | Cao |
| 013 | Legal hold | PASS (sau P1, cấp asset) | High | `assets.legal_hold_until`, chặn API/thùng rác/cron, N14 + audit | Hold cấp tenant | P3 | Cao |
| 014 | Versioning không ghi đè trái phép | PARTIAL | High | Key chứa UUID mới mỗi asset nên ít ghi đè; nhưng PUT có thể ghi lại cùng key trong 15 phút và `videos/` ghi đè tự do | Ghi một lần (`If-None-Match: *`) hoặc kiểm tồn tại | P0/P1 | Cao |
| 015 | Provenance input–output | PASS | Medium | `parent_asset_id`, `provider`, `model`, `model_version`, `pipeline_version`, `prompt`, `input/output_sha256` (`schema.prisma:424-460`) | Mở rộng cho video/audio | P3 | Cao |
| 016 | Retry/idempotency | PARTIAL | High | `idempotency_key` unique (org, feature) cho `generation_jobs` (`:525`); upload và xoá chưa idempotent | Áp cho xoá payload/outbox | P2 | TB |
| 017 | Registry/payload reconciliation | PARTIAL (sau P2) | High | `npm run storage:reconcile` chỉ đọc | Chạy định kỳ, quyết định tự dọn | P2 | Cao |
| 018 | Audit cho hành động nhạy cảm | PASS (sau P2) | High | Export (4 route) + xoá vĩnh viễn + legal hold có audit; test kiến trúc cho export | — | — | Cao |
| 019 | Encryption/access storage | NOT_ASSESSED | High | Cấu hình bucket R2 (public, SSE) nằm ngoài repo | Thu bằng chứng từ console (D-06) | P0 | — |
| 020 | Backup scope & RPO/RTO duyệt | PARTIAL | High | RPO 15 phút / RTO 2 giờ là **đề xuất**, "cần PO chốt" (`VAN_HANH…:15-18`); kho tệp ngoài phạm vi | DECISION REQUIRED D-01, D-02 | P1 | Cao |
| 021 | Restore đã kiểm thử | **FAIL** | Critical/High | "Chưa diễn tập lần nào" (`VAN_HANH…:28-29`), không có biên bản có ngày | Diễn tập PITR + restore kho | P1 | Cao |
| 022 | Module dùng contract chuẩn | PARTIAL | Medium | Đa số qua `getStorageProvider()`; Python có SigV4 riêng; route storage dùng chung cho mọi module | Contract `StoragePort` + SDK Python chung | P3 | TB |
| 023 | CI kiểm policy trọng yếu | PARTIAL | High | Có tenant/platform/gitleaks/CodeQL/npm audit; chưa có test cho route storage không chữ ký, giới hạn size, xoá payload | Thêm test kiến trúc + negative test | P4 | Cao |
| 024 | Compatibility plan cho schema/API | PASS | Medium | CI kiểm migration khớp schema (`ci.yml:53-54`); CLAUDE.md yêu cầu PO duyệt schema | — | — | Cao |
| 025 | Handover không lộ secret | PASS | Critical | Có `QUY_TRINH_BAN_GIAO_SACH_TENANT.md`, `HO_SO_BAN_GIAO.md`, gitleaks | Thêm checklist quét kho tệp khi bàn giao | P5 | TB |
| 026 | Orphan/failed artifacts có lifecycle | PARTIAL (sau P1–P2) | Medium | Outbox có thử lại giới hạn; đối soát phát hiện mồ côi | Dọn mồ côi có duyệt | P3 | Cao |
| 027 | Truy cập backup bị giới hạn | NOT_ASSESSED | High | Quyền workspace Render ngoài repo; `handover-backup-engine.ts` xuất JSON "theo nơi lưu tệp" | Xác minh IAM Render; mã hoá tệp snapshot | P1 | — |
| 028 | Test search/export xuyên tenant | PASS | Critical | 119 file `tests/tenant/*` (assets, media, video, audio, vision…) chạy chặn ở CI | Thêm test cho route storage | P4 | TB (chưa đo độ phủ export) |
| 029 | Log/error không lộ payload | NOT_ASSESSED | High | Không thấy lớp redaction trong `src/core/observability` (grep); cần review mẫu log thật | Rà log runtime | P2 | Thấp |
| 030 | Policy exception có owner/hạn | PARTIAL | Medium | `TECHNICAL_DEBT.md`, `.gitleaksignore` có lý do; ngoại lệ `videos/` không có owner/hạn | Sổ đăng ký ngoại lệ (mẫu `16-templates.md`) | P1 | TB |

**Tình trạng sau P0–P2 (29/10):** 007, 008, 011 (D-03 đã duyệt, thực thi một phần), 012, 013, 017, 018, 026 đã cập nhật ở bảng trên; 021 vẫn FAIL tới khi có biên bản diễn tập.

**Tổng ban đầu (30):** PASS 7 (004, 006, 009, 015, 024, 025, 028) · PARTIAL 12 · FAIL 8 (007, 008, 011, 012, 013, 017, 021, 026) · NOT_ASSESSED 3 (019, 027, 029).
