"use client"

import Link from "next/link"
import type { Route } from "next"
import { ArrowLeft } from "@/components/ui/icon-set/arrow-left"
import { Shield } from "@/components/ui/icon-set/shield"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { CustomRolesManager } from "@/components/organization/custom-roles-manager"
import { useSession } from "@/lib/session"

/** Cài đặt → Đội ngũ → Vai trò & quyền (checklist ALG 1.13, `F5` — chỉ Điều hành). */
export default function CustomRolesPage() {
  const { can } = useSession()
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Link
          href={"/cai-dat/thanh-vien" as Route}
          aria-label="Quay lại Đội ngũ"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-text transition-colors hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-primary"
        >
          <ArrowLeft size={18} />
        </Link>
        <PageHeader
          title={<><Shield size={24} className="text-primary" /> <span>Vai trò & quyền</span></>}
          description="Tạo vai trò riêng cho cửa hàng và chọn việc vai đó được làm."
        />
      </div>
      {can("F5") ? <CustomRolesManager /> : <EmptyState kind="forbidden" title="Chỉ Điều hành quản lý vai trò" reason="Liên hệ chủ cửa hàng nếu cần thêm quyền cho tài khoản." />}
    </div>
  )
}
