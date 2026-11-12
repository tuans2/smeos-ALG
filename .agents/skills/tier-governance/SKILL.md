---
name: tier-governance
description: >-
  Kiến trúc 4 tầng ALG (SaaS Mother → SaaS Ngành → ChainOS → StoreOS): xác định tầng,
  ma trận quản trị (ưu đãi, cam kết, chính sách, thanh toán, phí gia công, mẫu), khoá cứng
  tầng trên, khoá công cụ chuỗi → chi nhánh, gói dịch vụ, plugin ngành, xem trước tầng.
  Kích hoạt khi sửa governance-matrix, governance-decisions, components/governance,
  layout/nav, tool-registry, entitlements, industries/, organization_links hoặc /van-hanh, /dieu-phoi.
---

# Tier Governance

Đọc trước, theo thứ tự:
1. `.agents/standards/alg/01-tier-governance.md` — code thật, trạng thái ✅/🟡/🔴, quy tắc agent.
2. `.agents/standards/universal/01-tiered-saas-governance.md` — nguyên tắc chung.

Tóm tắt bắt buộc:
- Động cơ đang chạy: `src/modules/organization/domain/governance-decisions.ts`. Quy luật khoá → ghi đè → mặc định nằm ở lõi chung `src/core/governance/layered-resolver.ts` (dùng chung với thông báo); hệ thống mới gọi lõi này, không viết resolver riêng.
- Tầng trên thật trong ma trận: khoá dựng sẵn → Mẹ → Chuỗi (cạnh chính `organization_links.is_primary`, qua `resolveTierChain`). Tầng Ngành chỉ là plugin code.
- Ghi quyết định: kiểm vi phạm ở server (422 + `violations`) + audit log.
- Ba trục tách biệt: RBAC (capability) · Entitlement (gói / khoá công cụ) · Governance (ma trận).
- Hệ thống mới chưa áp vào luồng thật → `GovernanceScopeNote`.
- Đổi luật bất biến, thêm tầng Ngành vào dữ liệu, đổi schema → hỏi PO.

Gate: `npm test` (governance-decisions, tool-route-entitlement, tier-preview), `npm run test:tenant` (governance-matrix), `npm run check:industry`.
