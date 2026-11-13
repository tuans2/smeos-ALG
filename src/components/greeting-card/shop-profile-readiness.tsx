"use client"

import { Button } from "@/components/ui/button"
import React, { useState } from "react"
import Link from "next/link"
import type { Route } from "next"
import { AlertTriangle, Check, Loader2 } from "@/components/ui/icons"
import { apiSend, useApi } from "@/components/greeting-card/greeting-api"
import { useSession } from "@/lib/session"
import {
  CONFIRMED_DEMO_CONTACT_SETTINGS_KEY,
  isConfirmedDemoContact,
  shopProfileGap,
} from "@/modules/greeting-card/domain/shop-contact"

/**
 * Nhắc hoàn tất Hồ sơ tiệm trước khi bán (PO 08/10/2026): khách thấy tên, số điện thoại, Zalo lấy từ
 * Hồ sơ tiệm. Hồ sơ còn là dữ liệu mẫu thì máy chủ nhắc xác nhận hoặc sửa; thiếu số điện thoại thì chỉ nhắc.
 */
export function ShopProfileReadiness() {
  const { can } = useSession()
  const profile = useApi<{ display_name?: string | null; phone?: string | null } | null>("/api/v1/business-profile")
  const org = useApi<{ settings?: Record<string, unknown> | null } | null>("/api/v1/organizations/current")
  const [isConfirming, setIsConfirming] = useState(false)

  if (profile.isLoading || org.isLoading || profile.error) return null

  const isConfirmed = isConfirmedDemoContact(org.data?.settings)
  const gap = shopProfileGap(
    profile.data ? { name: profile.data.display_name ?? null, phone: profile.data.phone ?? null } : null,
    isConfirmed
  )
  if (!gap) return null

  const handleConfirm = async () => {
    try {
      setIsConfirming(true)
      await apiSend("/api/v1/organizations/current", "PATCH", {
        settings: { [CONFIRMED_DEMO_CONTACT_SETTINGS_KEY]: true },
      })
      await org.mutate()
    } catch {
      // Giữ nguyên trạng thái nếu có sự cố mạng
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <div role="status" className="flex flex-col gap-2 rounded-xl border border-warning-border bg-warning-bg p-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2 text-body-sm text-warning-text">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>{gap}</span>
      </p>
      <div className="flex shrink-0 items-center gap-2">
        {can("F2") && (
          <Button variant="outline"
            type="button"
            onClick={handleConfirm}
            disabled={isConfirming}
            className="h-auto flex items-center gap-1.5 rounded-lg border border-warning-border bg-surface px-3 py-2 text-body-sm font-bold text-text hover:bg-surface-alt disabled:opacity-50"
          >
            {isConfirming ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" /> : <Check size={14} className="text-success" />}
            <span>Xác nhận dùng thông tin này</span>
          </Button>
        )}
        {can("F2") ? (
          <Link href={"/ho-so" as Route} className="shrink-0 rounded-lg border border-warning-border bg-surface px-3 py-2 text-body-sm font-bold text-warning-text hover:bg-surface-alt">
            Mở hồ sơ cửa hàng
          </Link>
        ) : (
          <span className="shrink-0 text-caption text-text-muted">Hồ sơ cửa hàng chưa đủ thông tin. Hãy báo Điều hành cập nhật để tạo link gửi khách.</span>
        )}
      </div>
    </div>
  )
}

