# SMEOS · 02 · Storage (đối chiếu code 30/10/2026)

Áp dụng của [universal/02](../universal/02-storage.md). Nguồn: khung SDAGF và audit `docs/governance/sdagf/`, `docs/audit/sdagf-2026-10/` (`672ca64`); chữ ký theo phương thức `e0bedb8`; xoá payload `20861a4`; vòng đời + outbox + legal hold `bf0ea76`; đối soát + audit xuất `1df8926`; registry SSOT + legal hold tổ chức `a95ac1e`; Kho dữ liệu v2 `bdab759`, `587c147`; chặn xoá ảnh đang dùng (audit lại 04/11/2026).

## 1. Bản đồ code

| Thành phần | Vị trí |
|---|---|
| Port | `src/core/ports/storage-provider.ts` (`put/get/delete/list/signedUrl(key, ttl, method)`) |
| Adapter | `src/modules/assets/adapters/` — `s3-storage-provider.ts` (S3/R2, `sigv4.ts`), `local-disk-storage-provider.ts`, `storage-provider-factory.ts` |
| Khoá đường dẫn | `assets/domain/storage-key.ts` — `org/<org>/<product|unfiled>/<asset>.<ext>` |
| Kiểm nội dung tải lên | `assets/domain/upload-content-rules.ts` (`maxUploadBytes`, `checkUploadContent` magic bytes) |
| Ký URL | `assets/infra/storage-signing.ts` (`verifyStorageSignature(key, exp, sig, method)`), env `STORAGE_SIGNING_SECRET` → fallback `SESSION_SECRET` |
| Route phục vụ | `src/app/api/v1/storage/[...key]/route.ts` — GET/PUT đều kiểm chữ ký; SVG kèm CSP sandbox |
| Registry SSOT | `assets/infra/storage-registry-keys.ts` — `STORAGE_REFERENCE_SOURCES` (10 nguồn, gồm JSON `generation_jobs.output.*`, `order_coordinations.metadata.qc_photos/pod_photos`; 09/11/2026 thêm `internal_chat_messages.attachments` — ảnh trong tin trao đổi nội bộ) |
| Vòng đời | `assets/domain/asset-lifecycle.ts` (`isUnderLegalHold`, `MAX_OUTBOX_ATTEMPTS = 5`), `payload-deletion.ts`, `use-cases/process-storage-outbox.ts`; cột `assets.trashed_at/purge_after/legal_hold_until`, bảng `storage_outbox`, `organizations.legal_hold_until` |
| Thùng rác | `storage/use-cases/manage-trash.ts`, `storage/infra/trash-repository.ts` (port `ITrashRepository`) — giữ **30 ngày** |
| Dọn định kỳ | `storage/use-cases/sweep-storage-lifecycle.ts`, gọi từ cron `api/v1/internal/chain-dispatch-sweep` |
| Đối soát | `assets/domain/storage-reconciliation.ts`, `npm run storage:reconcile` (chỉ đọc) |
| Legal hold API | `PUT /api/v1/platform/orgs-data/:id/legal-hold`, `…/assets/:id/legal-hold` — capability **N14**, audit nền tảng |
| Kho dữ liệu v2 | `storage/domain/library.ts`, `use-cases/list-library.ts`, `GET /api/v1/storage/library(/summary)` — quyền đọc theo capability công cụ nguồn; chuỗi chọn phạm vi chi nhánh |

## 2. Trạng thái

| Mục | Trạng thái | Cưỡng chế |
|---|---|---|
| Khoá theo tổ chức | ✅ | `storage-key.test.ts` |
| Chữ ký theo phương thức, bỏ ngoại lệ `videos/` | ✅ | `tests/unit/storage/storage-route-signature.test.ts` |
| Magic bytes + trần kích thước | ✅ | `upload-content-rules.test.ts` |
| Mọi nơi ghi khai nguồn registry (TS + Python) | ✅ | `tests/unit/architecture/storage-write-contract.test.ts` |
| Audit bắt buộc cho route xuất dữ liệu | ✅ | `tests/unit/architecture/export-audit.test.ts` |
| Xoá vĩnh viễn + outbox + audit cùng transaction | ✅ | `tests/tenant/storage-lifecycle.test.ts` |
| Legal hold tệp + tổ chức (API, thùng rác, cron, outbox, bàn giao) | ✅ | `tests/tenant/storage-lifecycle.test.ts` |
| Thùng rác 30 ngày + xoá vĩnh viễn cho video, nội dung, catalog, thẻ chào, landing page (L-4) | ✅ 05/11/2026 | `tests/tenant/library-trash.test.ts`, `manage-trash.test.ts` |
| Chặn xoá ảnh đang được dùng (chứng từ thanh toán, ảnh sản phẩm, logo, video, bản in, chiến dịch…) — API, thùng rác, cron (bỏ qua) | ✅ 04/11/2026 | `tests/unit/architecture/asset-usage-guard.test.ts` (mọi cột `*asset_id*` phải khai), `tests/tenant/storage-lifecycle.test.ts` |
| Xoá payload thật | 🟡 sau cờ `STORAGE_DELETE_PAYLOADS=enabled`, **mặc định tắt** tới khi có backup object store (SDAGF D-06) | — |
| Số ngày thùng rác | ✅ `TRASH_RETENTION_DAYS` + `trashExpiresAt()` (`storage/domain/trash-types.ts`) | nợ #196 (đã trả) |
| `LocalDiskStorageProvider` cho production | 🟡 adapter tạm | nợ #15 |
| Ảnh trang khách qua `next/image` | 🟡 URL ký mỗi lần khác nhau | nợ #187 |

## 3. Quy tắc cho agent

1. Ghi tệp chỉ qua `StorageProvider` (`getStorageProvider().put`) với khoá `buildStorageKey`. Adapter AI/media trả byte; use-case ghi.
2. Nơi ghi mới (TS hoặc `workers/`): thêm nguồn vào `STORAGE_REFERENCE_SOURCES` + `countPayloadReferences` (`assets/infra/payload-references.ts`), khai dòng trong `storage-write-contract.test.ts`. Thiếu → test đỏ.
3. Đọc/hiển thị: chỉ URL ký (`signedUrl(key, ttl, "GET")`). Không tạo URL không ký, không thêm ngoại lệ tiền tố.
4. Xoá: dùng use-case thùng rác / xoá vĩnh viễn có sẵn — tự kiểm legal hold (409), ảnh đang được dùng (409), outbox, audit. Không gọi `storage.delete` trực tiếp. Bảng mới có cột `*asset_id*`: khai vào `ASSET_ID_REFERENCES` (chặn xoá) hoặc `ASSET_ID_REFERENCES_IGNORED` (có lý do) trong `assets/infra/asset-usage-guard.ts` — thiếu → test đỏ.
5. Route xuất dữ liệu mới: ghi audit (test kiến trúc bắt buộc), không log giá trị tìm kiếm.
6. Bật xoá payload thật, đổi số ngày giữ, đổi chính sách legal hold → **hỏi PO** (quyết định SDAGF D-xx).
