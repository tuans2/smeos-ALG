# Checklist go-live — smeOS (CSDL và vận hành)

> Trạng thái `DRAFT` · chủ sở hữu: Product Owner · soạn 12/11/2026 từ `docs/plan/db-enterprise-architecture.md`,
> ADR-013 … 016, `OPERATIONS_RUNBOOK.md`, `docs/kien-truc/VAN_HANH_SU_CO_VA_SAO_LUU.md`.
> Phạm vi: những gì phải xong ở **CSDL, sao lưu, cách ly, quan trắc, tải và dữ liệu cá nhân** trước khi nhận khách trả
> tiền. Không thay checklist bàn giao chức năng (`BAO_CAO_ANH_XA_123_CHUC_NANG.md`). Mục pháp lý ở đây là việc cần hỏi,
> **không phải tư vấn pháp lý**.

Cách dùng: mỗi dòng có người phụ trách và **bằng chứng** (biên bản, ảnh màn hình, đầu ra lệnh, số PR). Không có bằng
chứng = chưa xong. Cột "Ai": **VH** người vận hành (quyền Render), **PO** chủ sản phẩm, **PL** pháp lý, **KT** kỹ thuật.

Ba mốc, mỗi mốc gồm mọi dòng của mốc trước:

- **A — Thí điểm có trả tiền** (tiệm lẻ, chuỗi nhỏ, chưa cam kết SLA — giai đoạn G-a của ADR-015 D-O2).
- **B — Khách chuỗi có cam kết** (D-40; giai đoạn G-b).
- **C — Khách enterprise / `DEDICATED`** (ADR-016; giai đoạn G-c).

## A. Chặn thí điểm có trả tiền

### A1. Sao lưu và khôi phục — chưa chứng minh thì RPO/RTO chỉ là chữ

| ☐ | Việc | Ai | Bằng chứng | Tham chiếu |
|---|---|---|---|---|
| [ ] | Nâng `smeos-postgres` khỏi `basic-256mb` và workspace có PITR 7 ngày (O-3, D-O2 G-a) | VH + PO (chi phí) | Ảnh màn hình gói + hạn PITR | ADR-015 D-O2 |
| [ ] | Diễn tập PITR lần đầu ra CSDL `…_restore`, chạy `npm run db:verify` xanh, đo RTO ≤ 1 giờ (O-7) | VH | Dòng biên bản §1 `VAN_HANH_SU_CO_VA_SAO_LUU.md` | ADR-015 D-O3 |
| [ ] | Export đêm ra kho **khác nhà cung cấp CSDL**, mã hoá, giữ 35 ngày + 12 tháng — 7 bản liên tiếp (O-6) | VH | Danh sách 7 tệp + lần mở thử 1 tệp | ADR-015 D-O3 |
| [ ] | `PII_ENCRYPTION_KEY` sao lưu **ngoài Render** (két mật khẩu của PO + 1 người dự phòng); thử giải mã bản khôi phục bằng bản sao khoá | VH + PO | Ghi chú nơi cất (không ghi khoá) + kết quả thử | runbook §14 |
| [ ] | Thử khôi phục **một tổ chức** từ gói xuất (`npm run tenant:transfer -- restore …`) trên CSDL tạm, ≤ 4 giờ (S-4) | VH | Dòng biên bản | runbook §17 |
| [ ] | Quy trình sau khôi phục: chạy lại yêu cầu xoá dữ liệu khách có sau mốc khôi phục | KT | `tenant-restore.test.ts` (đã có) + bước trong biên bản | ADR-014 D-P5 |

### A2. Cách ly giữa các tổ chức trên production

| ☐ | Việc | Ai | Bằng chứng | Tham chiếu |
|---|---|---|---|---|
| [ ] | Chạy `scripts/db/create-roles.sql` trên production: 5 tài khoản CSDL, mỗi dịch vụ một chuỗi kết nối, không dịch vụ nào dùng tài khoản chủ (I-1) | VH | `\du` + biến `DATABASE_URL` từng dịch vụ (che mật khẩu) | runbook §12 |
| [ ] | Giới hạn thời gian truy vấn theo tài khoản có hiệu lực: truy vấn 20 s của `smeos_app` bị huỷ (O-8) | VH | Đầu ra `SELECT pg_sleep(20)` bằng `smeos_app` | runbook §12 |
| [ ] | `DB_RLS_MODE=audit` ở `smeos-web` và 3 worker; theo dõi log `db.rls.unscoped_query` | VH | Ảnh biến môi trường | runbook §12 |
| [ ] | Chạy toàn bộ test + e2e ở chế độ ghi nhận trên CSDL khôi phục từ production: 0 sự kiện (I-5) | KT | Tệp `DB_RLS_AUDIT_FILE` rỗng | plan GĐ2 I-5 |
| [ ] | `npm run db:not-valid` trên production in "không còn khoá NOT VALID" (dọn dòng sai do PO duyệt từng khoá) | VH + PO | Đầu ra lệnh | `VAN_HANH_CAP_NHAT_CSDL.md` §7 |

### A3. Phát hành an toàn

| ☐ | Việc | Ai | Bằng chứng | Tham chiếu |
|---|---|---|---|---|
| [ ] | Mỗi dịch vụ Render: *Auto-Deploy = After CI Checks Pass* (kiểm trên dashboard, không chỉ `render.yaml`) | VH | Ảnh 5 dịch vụ | runbook §3 |
| [ ] | Ruleset `main`: bắt buộc PR + 5 check, chặn push thẳng / force push | PO | Ảnh *Settings → Rules* | runbook §3 |
| [ ] | `SEED_DEV_DATA=false` trên production; không còn tài khoản demo mật khẩu cố định | VH | Ảnh biến + truy vấn không có email demo | runbook §2 |
| [ ] | Export nhanh trước mỗi deploy có migration (phần còn lại của O-4) | VH | Bước trong quy trình phát hành | plan GĐ1 O-4 |
| [ ] | Dữ liệu cá nhân đã mã hoá hết: `npm run pii:backfill` in 0 dòng còn lại | VH | Đầu ra lệnh | runbook §14 |

### A4. Quan trắc và trực sự cố

| ☐ | Việc | Ai | Bằng chứng | Tham chiếu |
|---|---|---|---|---|
| [ ] | Bật `pg_stat_statements`; cảnh báo: truy vấn > 1 s lặp lại, kết nối > 80%, dung lượng > 70%, export đêm lỗi, đối soát lệch (O-3, D-O8) | VH | 1 cảnh báo thử tới người trực | ADR-015 D-O8 |
| [ ] | `SENTRY_DSN` ở web + 3 worker; cảnh báo "issue mới" gửi email người trực | VH | 1 lỗi thử hiện trên Sentry | runbook §10 |
| [ ] | Kiểm từ bên ngoài (uptime) cho trang khách `/c/[slug]` và `/api/health` — thêm nhà cung cấp cần PO duyệt | PO | Tên dịch vụ + cảnh báo thử | runbook §10 (S2) |
| [ ] | Danh sách người trực, kênh báo sự cố, cam kết hỗ trợ trong hợp đồng | PO | Runbook §8 đã điền | runbook §8 |

### A5. Tải

| ☐ | Việc | Ai | Bằng chứng | Tham chiếu |
|---|---|---|---|---|
| [ ] | `npm run load:seed` + `npm run load:run` trên CSDL khôi phục PITR, quy mô ít nhất bằng khách thí điểm lớn nhất; mọi kịch bản đạt (O-9) | VH + KT | Bảng `.result.md` trong biên bản §5 | `VAN_HANH_SU_CO_VA_SAO_LUU.md` §5 |

### A6. Dữ liệu cá nhân và pháp lý

| ☐ | Việc | Ai | Bằng chứng | Tham chiếu |
|---|---|---|---|---|
| [ ] | Pháp lý xác nhận các mốc hạn lưu trong `retention_policies` (log kỹ thuật, nhật ký kiểm toán, người nhận, hội thoại, hồ sơ khách 24 tháng, báo giá, job) trước khi bật `enforce` | PL + PO | Văn bản xác nhận; ghi sổ quyết định | runbook §16 |
| [ ] | Chạy `npm run retention:sweep` (chỉ đếm) trên production, PO xem số dòng từng loại rồi mới bật `enforce` từng loại | VH + PO | Đầu ra lệnh + dòng `retention_policies` | runbook §16 |
| [ ] | Pháp lý xác nhận hạn trả lời yêu cầu của khách (mã đang đặt 72 giờ) và người chịu trách nhiệm xử lý màn *Yêu cầu dữ liệu cá nhân* | PL + PO | Ghi sổ quyết định | ADR-014 D-P5 |
| [ ] | Chính sách quyền riêng tư, điều khoản, thoả thuận xử lý dữ liệu với tiệm/chuỗi (tiệm là bên kiểm soát dữ liệu khách của mình) | PL | Bản đã đăng | — |
| [ ] | Quy trình báo sự cố lộ dữ liệu: ai quyết định, báo ai, trong bao lâu | PL + PO | Mục mới trong `VAN_HANH_SU_CO_VA_SAO_LUU.md` §3 | — |
| [ ] | Chọn vùng dữ liệu (hiện Singapore) và ghi vào hợp đồng (P-8) | PO + PL | Ghi sổ quyết định | ADR-014, D-51 |
| [ ] | Chứng từ ghi sổ 10 năm (P-6c, đang hoãn): xác nhận chưa có job nào xoá đơn đã thu / phiếu thu / `usage` | KT | `RETENTION_CATEGORIES` không có loại đó | `retention-policy.ts` |

## B. Thêm trước khi ký khách chuỗi có cam kết

| ☐ | Việc | Ai | Bằng chứng | Tham chiếu |
|---|---|---|---|---|
| [x] | Lỗi đặt đơn đồng thời trong một tổ chức (thử tải 12/11/2026: 70/100 đơn của chuỗi lỗi ở 10 luồng, mã đơn trùng) — **đã sửa 12/11/2026**: số mã đơn cấp từ bộ đếm `order_code_sequences`; chạy lại `load:run` 100 × 10 luồng: 0 lỗi | KT | `tests/tenant/order-code-sequences.test.ts` + bảng chạy lại ở §5 | đặc tả 07 §57 |
| [ ] | O-9 ở **đủ quy mô** D-O7 (200 chi nhánh × 500 đơn/ngày × 12 tháng + 300 tiệm lẻ), p95 ≤ 200 ms, báo cáo ≤ 2 s | VH + KT | Biên bản §5 | ADR-015 D-O7 |
| [ ] | Postgres dòng Pro + bật HA (D-O2 G-b) | VH + PO | Ảnh gói | ADR-015 D-O2 |
| [ ] | RLS chặn thật (`DB_RLS_MODE=enforce`) sau 14 ngày liền không có log `kind=pending` / `kind=unclassified` (I-6) | VH + KT | Truy vấn log 14 ngày + biến môi trường | runbook §12 |
| [ ] | Diễn tập PITR theo quý đã có ít nhất 1 biên bản trong 90 ngày | VH | Biên bản | ADR-015 D-O3 |
| [ ] | Bản sao đọc cho báo cáo nếu O-9 hoặc `pg_stat_statements` cho thấy báo cáo > 2 s | VH + PO | Số đo | runbook §18 |
| [ ] | SLO 4 tuần đầu có số thật, PO xem lại mục tiêu | PO | Bảng theo dõi SLO | runbook §10 |

## C. Thêm trước khách enterprise / `DEDICATED`

| ☐ | Việc | Ai | Bằng chứng | Tham chiếu |
|---|---|---|---|---|
| [ ] | Quyết định lại kiểm thử bảo mật bên ngoài (D-26 hiện "không làm"); nếu làm: báo cáo + sửa lỗi mức cao | PO | Ghi sổ quyết định / báo cáo | plan GĐ6 |
| [ ] | Mẫu triển khai `DEDICATED` + dựng thử một lần từ đầu (S-6) — thêm dịch vụ Render cần PO duyệt | VH + KT | Biên bản dựng | ADR-016 |
| [ ] | Vùng dữ liệu theo hợp đồng (Việt Nam nếu khách yêu cầu, D-51) | PO + PL | Hợp đồng | ADR-016 |
| [ ] | Gói bằng chứng DoD-1 → DoD-17 đã điền, PO ký | PO | `db-enterprise-architecture.md` mục 1 | plan GĐ6 |
| [ ] | Dọn cột bản mã cũ `*_enc` (P-5d-1, rồi P-5d-2 sau khi P-5d-1 đã deploy) | KT | PR + migration | runbook §14 |

## D. Ngày go-live

1. Đóng băng: không merge tính năng mới 24 giờ trước.
2. Export nhanh CSDL (§1 `VAN_HANH_SU_CO_VA_SAO_LUU.md`), ghi giờ — đây là mốc quay lui.
3. Deploy qua CI xanh (runbook §3); không deploy tay trừ khẩn cấp.
4. Kiểm: `/api/health`, `/api/health/ready`; đăng nhập Điều hành; tạo một đơn, xem danh sách đơn, mở báo cáo doanh thu;
   mở một trang khách `/c/[slug]`; một thông báo tới hộp thư trong ứng dụng; lượt cron `smeos-cron-dispatch-sweep` xanh.
5. Theo dõi 24 giờ: Sentry, log `http.internal_error`, `db.rls.unscoped_query`, kết nối CSDL, dung lượng.
6. Quay lui: lỗi mã → *Rollback* trên Render; lỗi dữ liệu → khôi phục PITR theo §1 rồi rollback mã (runbook §4).

## E. Sau go-live

| Khi nào | Việc | Tham chiếu |
|---|---|---|
| Hằng tuần | Số SLO (S1–S4), ngân sách lỗi | runbook §10 |
| Hằng tháng | `npm run db:growth`; xem bảng chạm ngưỡng | runbook §18 |
| Hằng tháng | `npm run retention:sweep` (đếm) — số dòng quá hạn có hợp lý không | runbook §16 |
| Hằng quý | Diễn tập PITR + `db:verify` + biên bản; thử khôi phục một tổ chức | ADR-015 D-O3 |
| Hằng quý | Chạy lại O-9 nếu dữ liệu tăng gấp đôi hoặc thêm khách chuỗi | ADR-015 D-O7 |
| Khi có người rời đội hoặc nghi lộ | Xoay khoá bí mật (lịch định kỳ: PO chốt) | `VAN_HANH_SU_CO_VA_SAO_LUU.md` §4 |
