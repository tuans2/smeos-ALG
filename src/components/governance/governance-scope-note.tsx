import { POLICY_SYSTEMS } from "@/modules/organization/domain/governance-decisions"

/** Nói rõ ma trận nào đã áp vào trang khách/báo giá/đặt đơn, ma trận nào mới lưu để tham chiếu. */
export function GovernanceScopeNote({ system }: { system: string }) {
  const applied = (POLICY_SYSTEMS as readonly string[]).includes(system)
  return (
    <p role="note" className="rounded-xl border border-border bg-surface-alt px-4 py-2.5 text-body-sm text-text-muted">
      {applied
        ? "Thay đổi được lưu và áp ngay vào trang đặt hàng của khách, báo giá và đơn mới. Mục bị cấp trên khoá thì không sửa được."
        : "Thay đổi được lưu và áp khoá cho cấp dưới, nhưng chưa tự đổi cách tính thanh toán, đặt cọc hay phí gia công của đơn — các mục đó vẫn chỉnh trong cài đặt riêng của tiệm."}
    </p>
  )
}
