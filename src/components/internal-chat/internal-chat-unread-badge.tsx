"use client"

import { useI18n } from "@/lib/i18n"
import React, { useEffect, useState } from "react"

const POLL_MS = 60_000

/**
 * Số tin chưa đọc của Trao đổi nội bộ cạnh mục menu (IC-7.4). Hỏi lại mỗi phút và khi tab hiện lại; lỗi / không có
 * quyền → ẩn, không làm phiền menu.
 */
export function InternalChatUnreadBadge() {
  const { t } = useI18n()
  const [count, setCount] = useState(0)

  useEffect(() => {
    let alive = true
    const load = async () => {
      if (document.visibilityState === "hidden") return
      try {
        const res = await fetch("/api/v1/internal-chat/unread")
        if (!res.ok) return
        const json = (await res.json()) as { data?: { unread_count?: number } }
        if (alive) setCount(json.data?.unread_count ?? 0)
      } catch {
        // Mất mạng: giữ số cũ
      }
    }
    void Promise.resolve().then(load)
    const timer = setInterval(load, POLL_MS)
    document.addEventListener("visibilitychange", load)
    return () => {
      alive = false
      clearInterval(timer)
      document.removeEventListener("visibilitychange", load)
    }
  }, [])

  if (count <= 0) return null
  return (
    <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-fg text-caption font-semibold inline-flex items-center justify-center" aria-label={t("chat.badge.unread", { count })}>
      {count > 99 ? "99+" : count}
    </span>
  )
}
