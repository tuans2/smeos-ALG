# Hệ thống tiêu chuẩn phát triển

Nội bộ — nằm trong `.agents/` nên **không** vào bản giao khách (`.gitattributes` export-ignore, kiểm bằng `npm run handover:check`).

## Hai lớp

| Lớp | Thư mục | Dùng cho | Nội dung |
|---|---|---|---|
| **Chung** | `universal/` | Mọi dự án SaaS sau này | Nguyên tắc, mẫu kiến trúc, checklist, cách cưỡng chế bằng test. Không nhắc tên ngành, tên sản phẩm, đường dẫn cụ thể. |
| **Áp dụng ALG** | `smeos/` | Dự án ALG | Ánh xạ từng nguyên tắc vào code thật: file, hàm, test, trạng thái (✅ đã có / 🟡 lộ trình / 🔴 lệch chuẩn). |

Dự án mới: chép `universal/`, viết thư mục áp dụng riêng theo mẫu `smeos/`.

## Quy tắc viết tiêu chuẩn

1. **Code là bằng chứng.** Mỗi mục áp dụng ghi file/hàm/test. Tài liệu nói một đằng, code một nẻo → ghi trạng thái 🔴, không tô hồng.
2. **Phân biệt thực tế và đích đến.** Agent chỉ coi mục ✅ là chuẩn đang chạy.
3. **Mỗi chuẩn có cưỡng chế** (test, lint, ratchet) hoặc ghi rõ "chưa có cưỡng chế".
4. **Nguồn gốc:** ghi commit/PO-date đã chốt quyết định để truy lại được.
5. Thứ tự ưu tiên khi mâu thuẫn: chỉ thị người dùng → `AGENT_RULES.md` → tiêu chuẩn này → `AGENTS.md` → code hiện có.

## Danh mục

| # | Chủ đề | Chung | ALG |
|---|---|---|---|
| 01 | Quản trị phân tầng SaaS (Mother → Ngành → Chuỗi → Cửa hàng) | [universal/01-tiered-saas-governance.md](universal/01-tiered-saas-governance.md) | [smeos/01-tier-governance.md](smeos/01-tier-governance.md) |
| 02 | Storage (vòng đời tệp, ký URL, registry, legal hold) | [universal/02-storage.md](universal/02-storage.md) | [smeos/02-storage.md](smeos/02-storage.md) |
| 03 | UX (Progressive Disclosure, Journey-First, UI System) | [universal/03-ux.md](universal/03-ux.md) | [smeos/03-ux.md](smeos/03-ux.md) |
| 04 | i18n · l10n · UX Writing | [universal/04-i18n.md](universal/04-i18n.md) | [smeos/04-i18n.md](smeos/04-i18n.md) |
| 05 | Bảo mật, phân quyền & nhật ký | [universal/05-security-authz.md](universal/05-security-authz.md) | [smeos/05-security-authz.md](smeos/05-security-authz.md) |
| 06 | Thông báo đa tầng, đa kênh | [universal/06-notifications.md](universal/06-notifications.md) | [smeos/06-notifications.md](smeos/06-notifications.md) |
| 07 | AI & sinh nội dung | [universal/07-ai-content.md](universal/07-ai-content.md) | [smeos/07-ai-content.md](smeos/07-ai-content.md) |
| 08 | Plugin ngành & tính giá | [universal/08-industry-extensibility.md](universal/08-industry-extensibility.md) | [smeos/08-industry-extensibility.md](smeos/08-industry-extensibility.md) |
| 09 | Giám sát & truy vết | [universal/09-observability.md](universal/09-observability.md) | [smeos/09-observability.md](smeos/09-observability.md) |
| 10 | Mở rộng ngang & độ tin cậy | [universal/10-scalability.md](universal/10-scalability.md) | [smeos/10-scalability.md](smeos/10-scalability.md) |

## Lộ trình

[ROADMAP.md](ROADMAP.md) — 4 giai đoạn (G0 dọn nền → G1 production-ready → G2 commercial → G3 enterprise), 13 hạng mục E0–E12, quyết định PO Q1–Q6.
