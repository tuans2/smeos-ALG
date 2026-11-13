"use client"

import React, { useEffect, useState } from "react"
import type { PublicCatalogResult } from "@/modules/catalog-links/use-cases/get-public-catalog"
import { CatalogStorefront } from "../catalog-storefront"

export const PREVIEW_MESSAGE_TYPE = "storefront-preview"
export const PREVIEW_READY_TYPE = "storefront-preview-ready"

/** Nhận dữ liệu từ cửa sổ cha CÙNG nguồn gốc rồi vẽ trang khách; nguồn khác bị bỏ qua. */
export function StorefrontPreviewFrame() {
  const [data, setData] = useState<PublicCatalogResult | null>(null)

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      const msg = event.data as { type?: string; payload?: PublicCatalogResult } | null
      if (msg?.type === PREVIEW_MESSAGE_TYPE && msg.payload?.status === "ACTIVE") setData(msg.payload)
    }
    window.addEventListener("message", onMessage)
    window.parent?.postMessage({ type: PREVIEW_READY_TYPE }, window.location.origin)
    return () => window.removeEventListener("message", onMessage)
  }, [])

  if (!data) {
    return <div className="flex min-h-dvh items-center justify-center bg-bg text-body-sm text-text-muted">Đang dựng bản xem trước…</div>
  }
  // key theo nội dung để trang vẽ lại trạng thái lọc/tìm khi dữ liệu đổi
  return <CatalogStorefront key={JSON.stringify(data).length} initialData={data} />
}
