"use client"

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
      {stats.days} ngày qua: {stats.invites_in_chat} lời mời đơn qua Trao đổi nội bộ · {stats.partner_claims} đơn cửa hàng đối tác đã nhận · {stats.partner_stores} cửa hàng đối tác trong vòng bắn đơn
    </p>
  )
}
