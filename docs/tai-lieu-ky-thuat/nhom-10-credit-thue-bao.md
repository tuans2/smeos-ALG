# Nhóm 10 — Credit AI, hạn mức, thuê bao & tên miền riêng (8 chức năng)

Mọi dịch vụ tính phí (AI, SMS, ZNS) quy về một số dư credit của tổ chức (PO Q10). Mọi thay đổi số dư đi qua
`org/infra/organization-repository.ts` và ghi sổ cái `credit_transactions` trong cùng giao dịch (`org/infra/credit-ledger.ts`).
Phân hệ: `src/modules/usage/`, `src/modules/subscription/`, `src/modules/custom-domain/`. Màn cửa hàng `/muc-dung` (khoá production);
Console `/van-hanh`, `/van-hanh/to-chuc/[id]`.

---

### 10.1 Số dư credit và lịch sử tiêu thụ

- **Hành vi:** bảng giá theo tác vụ (ảnh 1, tối ưu 2, video 5…), số dư, phân bổ theo phân hệ, lịch sử giao dịch.
- **Mã chính:** `src/modules/usage/domain/pricing.ts`, `api/usage`, `api/usage/summary`, `src/app/(app)/muc-dung/page.tsx`.
- **Test:** `tt/retry-recharge-credit.test.ts`.

### 10.2 Hoàn 100% credit khi tác vụ lỗi

- **Mã chính:** `src/modules/usage/domain/refund-policy.ts`, `src/modules/usage/use-cases/refund-job.ts`.
- **Test:** `src/modules/usage/domain/refund-policy.test.ts`, `tt/partial-refund.test.ts`.

### 10.3 Hạn mức dịch vụ (trần AI, SMS, Zalo)

- **Hành vi:** bảng `usage_limits`; Console đặt hạn mức credit/tháng (`N3`) và quy đổi SMS/ZNS, hạn mức mặc định; Điều hành đặt trần AI
  tháng (`U2`). Chặn cùng giao dịch khi trừ credit: vượt → 422 `QUOTA_EXCEEDED`, không trừ. Tin SMS/ZNS: hết credit hoặc chạm hạn mức thì
  vẫn gửi trong mức thấu chi (mặc định âm tối đa 50 credit), báo Điều hành khi số dư chuyển âm và khi dùng hết mức; quá mức thì bỏ tin.
- **Mã chính:** `api/platform/organizations/[id]/usage-limit/route.ts`, `api/platform/credit-pricing/route.ts`, `api/usage/limits/route.ts`,
  `src/modules/usage/infra/usage-limit-repository.ts`, `src/modules/usage/domain/message-overdraft.ts`, `gc/use-cases/notify-customer.ts`;
  giao diện `src/components/usage/monthly-limit-card.tsx`, `src/components/platform/credit-ledger-panel.tsx`, `credit-pricing-card.tsx`.
- **Test:** `tt/usage-limits.test.ts`, `tt/greeting-card-notifications.test.ts`, `tp/credit-ledger.test.ts`.

### 10.4 Chi phí thật và biên lợi nhuận

- **Hành vi:** chi phí AI thật (`ai_requests.cost_usd`), chi phí tin theo giá vốn tham chiếu (`provider_cost_entries`); báo cáo biên theo
  tháng và tổ chức: doanh thu (credit đã dùng × giá trị credit) − chi phí.
- **Mã chính:** `src/core/ai/gateway.ts`, `src/modules/usage/infra/provider-cost-repository.ts`, `api/platform/margin/route.ts` (`N4`),
  `src/modules/usage/domain/platform-margin.ts`, `src/components/platform/platform-margin-card.tsx`.
- **Test:** `tp/platform-margin.test.ts`, `tests/unit/usage/platform-margin.test.ts`.

### 10.5 Cảnh báo credit thấp

- **Hành vi:** `CREDIT_LOW` (số dư dưới 20% lần nạp gần nhất, không có thì 20% hạn mức tháng) và `USAGE_LIMIT_NEAR` (80% hạn mức tháng
  hoặc trần AI); một lần mỗi kỳ (cờ trong `usage_limits` bật cùng giao dịch).
- **Mã chính:** `src/modules/notification/domain/events/store-operation-events.ts`, `src/modules/usage/use-cases/credit-alerts.ts`.
- **Test:** `tt/usage-limits.test.ts`.

### 10.6 Nạp / hoàn / tặng credit

- **Hành vi:** Console nạp, tặng, hoàn có lý do (1–1.000.000 credit), ghi sổ cái và nhật ký nền tảng; mã VietQR nạp ghi khoản nạp thật.
- **Mã chính:** `api/platform/organizations/[id]/credits/route.ts` (`N1` đọc, `N3` ghi), `src/components/platform/credit-ledger-panel.tsx`,
  `src/components/platform/vietqr-topup-modal.tsx`.
- **Dữ liệu:** `credit_transactions` (dòng `OPENING` cho số dư sẵn có).
- **Test:** `tp/credit-ledger.test.ts`, `tt/credit-ledger-isolation.test.ts`.

### 10.7 Thuê bao SaaS và thu phí

- **Hành vi:** gói, chu kỳ tháng/năm, giá theo kỳ (Console nhập); hoá đơn VietQR vào tài khoản nền tảng, nội dung = mã hoá đơn; SePay tự
  đối soát khi có `SEPAY_PLATFORM_API_KEY`, Console xác nhận tay; nhắc gia hạn 7 ngày / 1 ngày; quá hạn → chỉ xem (402
  `SUBSCRIPTION_OVERDUE`) và link công khai ngừng nhận đơn; credit tặng theo gói cấp đầu tháng, phần thừa hết hạn.
- **Mã chính:** `api/platform/organizations/[id]/subscription/route.ts` (`N19`), `api/platform/billing-account/route.ts`,
  `api/billing/sepay/route.ts`, `api/platform/subscription-invoices/[id]/mark-paid/route.ts`,
  `src/modules/subscription/use-cases/subscription-guard.ts`, `public-order-guard.ts`; giao diện `src/components/usage/subscription-card.tsx`,
  `src/components/platform/subscription-panel.tsx`, `billing-account-card.tsx`.
- **Dữ liệu:** `subscriptions`, `subscription_invoices` (migration `20261105220000_wave4_credit_usage_subscriptions`).
- **Test:** `tt/subscription-guard.test.ts`, `tp/subscriptions.test.ts`, `tests/unit/subscription-rules.test.ts`, `tt/public-order-subscription.test.ts`.

### 10.8 Tên miền riêng

- **Hành vi:** Điều hành gắn tên miền (tối đa 3), thêm TXT `_smeos-verify.<tên miền>` = `smeos-verify=<mã>` và CNAME về máy chủ hệ thống,
  bấm Kiểm tra; đúng → `VERIFIED`, gọi API Render gắn tên miền và cấp chứng chỉ (thiếu khoá → `MANUAL`). `src/proxy.ts` chỉ phục vụ tên
  miền đã xác minh và chỉ trang danh mục / Thẻ Chào / trang cửa hàng có dữ liệu thuộc đúng tổ chức; trang khác → 404; lỗi tra cứu → 503.
  Console xem (`N1`) và khoá/mở (`N20`); khoá → ngừng phục vụ ngay, cửa hàng không tự gỡ.
- **Mã chính:** `src/modules/custom-domain/domain/custom-domain.ts`, `use-cases/manage-custom-domains.ts`, `use-cases/resolve-custom-domain.ts`,
  `use-cases/platform-custom-domains.ts`, `infra/custom-domain-repository.ts`, `infra/dns-txt.ts`, `adapters/render-custom-domains.ts`,
  `src/proxy.ts`, `api/custom-domains`, `api/platform/custom-domains/[id]/lock`,
  `src/components/organization/custom-domain-settings-tab.tsx`, `src/components/platform/custom-domains-panel.tsx`.
- **Dữ liệu:** `custom_domains` (migration `20261106040000_custom_domains`, có RLS); cấp `N20`: `20261106040100_grant_custom_domains_to_superadmin`.
- **Quyền:** `D19` (trần cứng Điều hành), `N1`, `N20`.
- **Test:** `tt/custom-domains.test.ts`, `src/modules/custom-domain/domain/custom-domain.test.ts`,
  `src/modules/custom-domain/adapters/render-custom-domains.test.ts`.
- **Vận hành:** `docs/handover/OPERATIONS_RUNBOOK.md` §13.
- **Khi nâng cấp:** thêm loại trang công khai mới mở được trên tên miền riêng → thêm vào `classifyCustomDomainPath` và `ownerOf` (khoá tra
  phải đúng khoá trang dùng), kèm test chéo tổ chức.
