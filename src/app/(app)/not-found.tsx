import Link from "next/link"
import { PageHeader } from "@/components/ui/page-header"

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-md flex-col justify-center gap-6 p-6">
      <PageHeader title="Không tìm thấy trang" description="Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển." />
      <Link
        href="/"
        className="inline-flex self-start items-center justify-center h-12 px-5 text-title-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-dark transition-colors"
      >
        Về trang chủ
      </Link>
    </div>
  )
}
