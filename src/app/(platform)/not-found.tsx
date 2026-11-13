import Link from "next/link"
import { PageHeader } from "@/components/ui/page-header"

export default function PlatformNotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-md flex-col justify-center gap-6 p-6">
      <PageHeader title="Không tìm thấy trang Console" description="Tuyến vận hành nền tảng bạn yêu cầu không tồn tại hoặc đã được chuyển vị trí." />
      <Link
        href="/van-hanh"
        className="inline-flex self-start items-center justify-center h-12 px-5 text-title-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-dark transition-colors"
      >
        Về Console
      </Link>
    </div>
  )
}
