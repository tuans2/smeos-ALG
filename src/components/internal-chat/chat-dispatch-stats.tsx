"use client"

import { useI18n } from "@/lib/i18n"
import React, { useEffect, useState } from "react"

interface Stats {
  days: number
  invites_in_chat: number
  partner_claims: number
  partner_stores: number
}

/**
 * Dòng số liệu cho chuỗi (IC-6.3): 30 ngày qua bao nhiêu lời mời đơn đi qua Trao đổi nội bộ và bao nhiêu đơn cửa hàng
 * đối tác đã nhận. Ẩn khi tổ chức chưa có cửa hàng đối tác (vd. người xem là cửa hàng) hoặc không tải được.
 */
export function ChatDispatchStats() {
  const { t } = useI18n()
  const [stats, setStats] = useState<Stats | null>(null)
  useEffect(() => {
    let alive = true
    void fetch("/api/v1/internal-chat/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { data?: Stats } | null) => {
        if (alive && j?.data) setStats(j.data)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [])
  if (!stats || stats.partner_stores === 0) return null
  return (
    <p className="text-caption text-text-muted" role="status">
      {t("chat.page.stats", { days: stats.days, invites: stats.invites_in_chat, claims: stats.partner_claims, stores: stats.partner_stores })}
    </p>
  )
}
