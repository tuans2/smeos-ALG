"use client"

import type { ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { BookOpen } from "@/components/ui/icon-set/book-open"
import { Calculator } from "@/components/ui/icon-set/calculator"
import { ClipboardList } from "@/components/ui/icon-set/clipboard-list"
import { Package } from "@/components/ui/icon-set/package"
import { TrendingUp } from "@/components/ui/icon-set/trending-up"
import { TabActionHeader, type TabItem } from "@/components/ui/tab-header"
import { EntitlementGate } from "@/components/ui/entitlement-gate"
import { InlineError } from "@/components/ui/inline-error"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { useCostingResource, type CostingProfile } from "@/components/costing/use-costing-api"
import { CostingProfileProvider } from "@/components/costing/costing-profile-context"
import { SelectedProductProvider } from "@/components/costing/product-picker"
import { PageHeader } from "@/components/ui/page-header"

/** Nhóm công cụ 6 — một không gian, 5 công cụ theo đúng thứ tự dữ liệu (#32 → #31 → #33 → #34 → #35). */
const TABS: (TabItem & { href: string })[] = [
  { id: "nguyen-lieu", label: "Nguyên liệu & đơn giá", icon: Package, href: "/tinh-gia/nguyen-lieu" },
  { id: "cong-thuc", label: "Công thức", icon: BookOpen, href: "/tinh-gia/cong-thuc" },
  { id: "gia-von", label: "Giá vốn", icon: Calculator, href: "/tinh-gia/gia-von" },
  { id: "gia-ban", label: "Giá bán & lợi nhuận", icon: TrendingUp, href: "/tinh-gia/gia-ban" },
  { id: "du-toan", label: "Dự toán mua", icon: ClipboardList, href: "/tinh-gia/du-toan" },
]

export default function TinhGiaLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { state, reload } = useCostingResource<CostingProfile>("/api/v1/costing/profile")
  const active = TABS.find((t) => pathname.startsWith(t.href))?.id ?? "nguyen-lieu"

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6">
      <PageHeader
        title="Giá vốn & định giá"
        description="Nhập đơn giá nguyên liệu, ghi công thức từng mẫu — hệ thống tính giá vốn, gợi ý giá bán và số nguyên liệu cần mua."
      />
      {state.status === "loading" && <SkeletonBlock lines={4} label="Đang tải cấu hình tính giá" />}
      {state.status === "error" && <InlineError message={state.message} onRetry={reload} />}
      {state.status === "ready" && (
        <EntitlementGate
          allowed={state.data.supported}
          reason="Ngành của cửa hàng chưa được hỗ trợ cho công cụ tính giá. Hiện hỗ trợ ngành Hoa & Cây cảnh; các ngành khác sẽ được bổ sung."
        >
          <CostingProfileProvider profile={state.data}>
            <TabActionHeader tabs={TABS} activeTab={active} onTabChange={(id) => router.push((TABS.find((t) => t.id === id)?.href ?? "/tinh-gia") as never)} />
            <SelectedProductProvider>{children}</SelectedProductProvider>
          </CostingProfileProvider>
        </EntitlementGate>
      )}
    </div>
  )
}
