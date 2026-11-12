import { PageHeader } from "@/components/ui/page-header"
import type { Metadata } from "next"
import { CampaignWorkspace } from "@/components/marketing-center/campaign/campaign-workspace"

export const metadata: Metadata = {
  title: "Chiến dịch quảng bá | ALG",
  description: "Quản lý chiến dịch quảng bá theo dịp, liên kết tư liệu và theo dõi chuyển đổi đơn hàng.",
}

export default function ChienDichPage() {
  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <PageHeader title="Chiến dịch quảng bá" description="Quản lý chiến dịch theo dịp, liên kết tư liệu và theo dõi đơn hàng chuyển đổi" className="mb-4" />
      <CampaignWorkspace />
    </div>
  )
}
