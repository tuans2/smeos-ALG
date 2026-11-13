"use client"

import { PageHeader } from "@/components/ui/page-header"
import { Badge } from "@/components/ui/badge"
import { CONNECTOR_CATALOG } from "@/modules/integration-hub/domain/connector-catalog"
import { GOVERNANCE_TIERS } from "@/core/governance/layered-resolver"
import type { TierRole } from "@/modules/integration-hub/domain/connector-manifest"
import { CATEGORY_LABEL } from "./integration-labels"
import { PlatformGovernanceSection } from "./platform-governance-section"

const TIER_LABEL = { MOTHER: "Nền tảng", INDUSTRY: "Ngành", CHAIN: "Chuỗi", STORE: "Cửa hàng" } as const
const ROLE_LABEL: Record<TierRole, string> = {
  PROVIDE: "Cung cấp",
  ENABLE: "Bật/tắt",
  CONNECT: "Tự kết nối",
  INHERIT: "Dùng của chuỗi",
  NONE: "—",
}
const STATUS_TEXT = { GA: "Đang chạy", BETA: "Thử nghiệm", MANAGED: "Đang chạy", LEGACY: "Màn hình cũ", COMING_SOON: "Sắp ra mắt" } as const

/** Tầng Mẹ: ma trận vai theo tầng (chỉ đọc) + khoá tích hợp cho toàn nền tảng và từng ngành (GĐ3). */
export function PlatformIntegrationsMatrix() {
  const rows = CONNECTOR_CATALOG.filter((m) => !m.devOnly)
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <PageHeader title="Tích hợp" description="Danh mục dịch vụ bên ngoài và vai trò của từng tầng với mỗi dịch vụ." />
      <div role="region" tabIndex={0} aria-label="Danh mục tích hợp" className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[720px] text-body-sm">
          <thead className="bg-surface-alt text-left text-text">
            <tr>
              <th scope="col" className="p-3">Dịch vụ</th>
              <th scope="col" className="p-3">Nhóm</th>
              <th scope="col" className="p-3">Trạng thái</th>
              {GOVERNANCE_TIERS.map((t) => (
                <th key={t} scope="col" className="p-3">{TIER_LABEL[t]}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {rows.map((m) => (
              <tr key={m.key}>
                <th scope="row" className="p-3 text-left font-semibold text-text">{m.label}</th>
                <td className="p-3 text-text-muted">{CATEGORY_LABEL[m.category]}</td>
                <td className="p-3"><Badge>{STATUS_TEXT[m.status]}</Badge></td>
                {GOVERNANCE_TIERS.map((t) => (
                  <td key={t} className="p-3 text-text">{ROLE_LABEL[m.tiers[t]]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PlatformGovernanceSection />
    </div>
  )
}
