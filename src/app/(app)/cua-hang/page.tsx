"use client"

import { useI18n } from "@/lib/i18n"
import { BranchPortalBoard } from "@/components/greeting-card/branch-portal/branch-portal-board"

/** Trang của tài khoản cửa hàng nhận gia công: đơn được mời và đơn đang làm của chi nhánh mình. */
export default function CuaHangPage() {
  const { t } = useI18n()
  return <BranchPortalBoard />
}
