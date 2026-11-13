/**
 * CLIENT QUẢN TRỊ MA TRẬN 4 TẦNG — SAAS MOTHER (CONSOLE VẬN HÀNH)
 * Kết nối trực tiếp với Governance Catalog Registry SSOT
 */
"use client"

import { useMemo, useState } from "react"
import { GovernanceMatrixTable } from "@/components/governance/governance-matrix-table"
import { useI18n } from "@/lib/i18n"
import type { GovernanceMatrixState } from "@/components/governance/governance-matrix-types"
import { useGovernanceMatrix } from "./use-governance-matrix"
import { GovernanceScopeNote } from "./governance-scope-note"
import {
  buildSSOTGovernanceGroups,
  type GovernanceSystemKey,
} from "./governance-catalog-registry"
import { PageHeader } from "@/components/ui/page-header"

type MatrixTab = "PROMOTIONS" | "COMMITMENTS" | "POLICIES" | "PAYMENTS" | "CRAFT_FEES"

interface MotherGovernanceMatrixClientProps {
  defaultTab?: MatrixTab | undefined
}

export function MotherGovernanceMatrixClient({
  defaultTab = "PROMOTIONS",
}: MotherGovernanceMatrixClientProps) {
  const { t, dict } = useI18n()
  const [activeTab] = useState<MatrixTab>(defaultTab)

  const base = useMemo(
    () => buildSSOTGovernanceGroups({ systemKey: activeTab, viewerTier: "MOTHER", industryKey: "FLORAL" }),
    [activeTab]
  )
  const matrix = useGovernanceMatrix("/api/v1/platform/governance-matrix", activeTab, base, "MOTHER")
  const currentGroups = matrix.groups

  const currentState: GovernanceMatrixState = {
    systemKey: activeTab,
    systemTitle: activeTab,
    viewerTier: "MOTHER",
    scopeId: "GLOBAL",
    groups: currentGroups,
    totalItems: currentGroups.reduce((acc, g) => acc + g.items.length, 0),
    lockedCount: currentGroups.reduce((acc, g) => acc + g.items.filter((i) => i.isLocked).length, 0),
    overrideCount: currentGroups.reduce((acc, g) => acc + g.items.filter((i) => i.hasLocalOverride).length, 0),
    loading: matrix.loading,
    error: matrix.error,
  }

  const pageTitleMap: Record<MatrixTab, { title: string; desc: string }> = {
    PROMOTIONS: {
      title: "Ma Trận Ưu Đãi & Khuyến Mãi (SaaS Mother)",
      desc: "Thiết lập trần chiết khấu tối đa toàn sàn, quy định voucher và chính sách ưu đãi phân tầng 4 cấp.",
    },
    COMMITMENTS: {
      title: "Ma Trận Cam Kết Chất Lượng (SaaS Mother)",
      desc: "Thiết lập tiêu chuẩn SOP kiểm duyệt chất lượng, bắt buộc chụp ảnh nghiệm thu thành phẩm trước khi xuất xưởng.",
    },
    POLICIES: {
      title: "Ma Trận Chính Sách & Thỏa Thuận (SaaS Mother)",
      desc: "Quy định điều khoản dịch vụ nền tảng, chính sách đổi trả hàng hóa và SLA xử lý khiếu nại trong 24h.",
    },
    PAYMENTS: {
      title: "Ma Trận Thanh Toán & Đặt Cọc (SaaS Mother)",
      desc: "Quản trị danh mục kênh thanh toán VietQR động, trần sàn đặt cọc tối thiểu cho đơn làm theo yêu cầu.",
    },
    CRAFT_FEES: {
      title: "Ma Trận Phí Gia Công & Thợ (SaaS Mother)",
      desc: "Sàn tiền công tối thiểu và trần khấu trừ phạt lỗi gia công tối đa 30% nhằm bảo vệ quyền lợi người thợ.",
    },
  }

  const currentInfo = pageTitleMap[activeTab]

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full p-6">
      {/* Page Header chuyên biệt cho từng ma trận */}
      <PageHeader
        title={currentInfo.title}
        description={<>{currentInfo.desc}</>}
      />

      <GovernanceScopeNote system={activeTab} />

      {matrix.error && (
        <p role="alert" className="rounded-xl border border-danger-border bg-danger-bg px-4 py-2.5 text-body-sm text-danger-text">
          {matrix.error}
        </p>
      )}

      {/* Bảng Ma Trận Quản Trị Tương Ứng — Hoàn toàn đọc từ SSOT Registry */}
      <GovernanceMatrixTable
        state={currentState}
        canManageHardLocks={true}
        onToggleItem={matrix.toggleItem}
        onResetItem={matrix.resetItem}
        onToggleLock={matrix.toggleLock}
      />
    </div>
  )
}
