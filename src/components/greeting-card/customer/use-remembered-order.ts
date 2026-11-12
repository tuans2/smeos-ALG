"use client"

import "@/lib/brand-storage-migration"

import { useEffect, useState } from "react"

const PREFIX = "alg:catalog-order:"
const LEGACY_PREFIX = "floraos:catalog-order:"
const TTL_MS = 30 * 86_400_000

/**
 * Link bộ sưu tập chung (`/g`, `/bst`) không có phiên trước khi đặt: đơn nằm ở phiên `/b/<mã>` riêng.
 * Nhớ mã phiên đó trên máy khách để khi khách mở lại đúng link cũ (từ tin nhắn Zalo…) thì về thẳng
 * trang đơn — thấy QR / "đã báo chuyển khoản, chờ xác nhận" — thay vì quay lại xem mẫu.
 */
export function rememberCatalogOrder(catalogId: string, sendCode: string): void {
  try {
    window.localStorage.setItem(PREFIX + catalogId, JSON.stringify({ sendCode, at: Date.now() }))
  } catch {
    // bộ nhớ trình duyệt bị chặn — bỏ qua
  }
}

function readCatalogOrder(catalogId: string): string | null {
  try {
    const raw = window.localStorage.getItem(PREFIX + catalogId) ?? window.localStorage.getItem(LEGACY_PREFIX + catalogId)
    if (!raw) return null
    const saved = JSON.parse(raw) as { sendCode?: unknown; at?: unknown }
    if (typeof saved.sendCode !== "string" || typeof saved.at !== "number" || Date.now() - saved.at > TTL_MS) {
      window.localStorage.removeItem(PREFIX + catalogId)
      window.localStorage.removeItem(LEGACY_PREFIX + catalogId)
      return null
    }
    return saved.sendCode
  } catch {
    return null
  }
}

/** `true` khi máy này đã đặt đơn từ bộ sưu tập này và đang chuyển sang trang đơn. */
export function useResumeCatalogOrder(catalogId: string): boolean {
  const [redirecting, setRedirecting] = useState(false)
  useEffect(() => {
    const sendCode = readCatalogOrder(catalogId)
    if (!sendCode) return
    setRedirecting(true) // eslint-disable-line react-hooks/set-state-in-effect -- chỉ đọc được localStorage sau khi chạy ở trình duyệt
    window.location.replace(`/b/${encodeURIComponent(sendCode)}`)
  }, [catalogId])
  return redirecting
}
