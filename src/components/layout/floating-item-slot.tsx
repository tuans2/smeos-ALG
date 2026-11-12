"use client"

import * as React from "react"
import { useOptionalFloatingLayer, type FloatingItem } from "./floating-layer"

/**
 * Đăng ký một phần tử nổi vào `FloatingLayerProvider` thay vì tự `position: fixed` (layouts.md §3).
 * Lớp điều phối xếp các phần tử thành một cột ở góc dưới phải, trên thanh đáy ở di động, nên chúng
 * không đè nhau và không che nội dung giữa màn hình. Không có provider (render đơn lẻ) thì hiện tại chỗ.
 */
export function FloatingItemSlot({
  id,
  priority,
  children,
}: {
  id: string
  priority: FloatingItem["priority"]
  children: React.ReactNode
}) {
  const layer = useOptionalFloatingLayer()
  const registerItem = layer?.registerItem
  const hasContent = children !== null && children !== undefined && children !== false

  React.useEffect(() => {
    if (!registerItem || !hasContent) return
    return registerItem({ id, priority, node: children })
  }, [id, priority, children, hasContent, registerItem])

  if (!layer) return <>{children}</>
  return null
}
