import { PageHeader } from "@/components/ui/page-header"
import { AcquisitionClient } from "@/components/acquisition/acquisition-client"

export const metadata = {
  title: "Thu hút khách hàng | ALG",
  description: "Mã QR và link bán hàng có thống kê, danh sách khách để lại thông tin",
}

export default async function ThuHutKhachPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams
  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <PageHeader title="Thu hút khách hàng" description="Mã QR và link bán hàng có thống kê, danh sách khách để lại thông tin" className="mb-4" />
      <AcquisitionClient initialTab={tab === "leads" ? "leads" : "links"} />
    </div>
  )
}
