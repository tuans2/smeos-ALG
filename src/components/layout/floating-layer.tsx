"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface FloatingItem {
  id: string
  priority: number // số càng cao càng ở trên
  node: React.ReactNode
  placement?: "bottom-right" | "bottom-center" | "bottom-left"
}

interface FloatingLayerContextType {
  registerItem: (item: FloatingItem) => () => void
}

const FloatingLayerContext = React.createContext<FloatingLayerContextType | null>(null)

export function useFloatingLayer() {
  const ctx = React.useContext(FloatingLayerContext)
  if (!ctx) {
    throw new Error("useFloatingLayer phải được sử dụng bên trong FloatingLayerProvider")
  }
  return ctx
}

/** Như `useFloatingLayer` nhưng trả `null` khi không nằm trong provider (render đơn lẻ, test). */
export function useOptionalFloatingLayer() {
  return React.useContext(FloatingLayerContext)
}

export interface FloatingLayerProviderProps {
  children: React.ReactNode
  className?: string
}

/**
 * FloatingLayer — Bộ điều phối các phần tử nổi trên toàn hệ thống (S3-03).
 *
 * Giải quyết phát hiện UI-F-02:
 * - Ngăn chặn xung đột, xếp chồng giữa Copilot, UI Studio, và StageGateApprovalBar.
 * - Tự động tính toán vị trí theo trục Z và đệm đáy cho BottomNav trên di động (360px - 430px).
 */
export function FloatingLayerProvider({ children, className }: FloatingLayerProviderProps) {
  const [items, setItems] = React.useState<FloatingItem[]>([])

  const registerItem = React.useCallback((item: FloatingItem) => {
    setItems((prev) => {
      const exists = prev.some((i) => i.id === item.id)
      if (exists) {
        return prev.map((i) => (i.id === item.id ? item : i))
      }
      return [...prev, item].sort((a, b) => b.priority - a.priority)
    })

    return () => {
      setItems((prev) => prev.filter((i) => i.id !== item.id))
    }
  }, [])

  const contextValue = React.useMemo(() => ({ registerItem }), [registerItem])

  return (
    <FloatingLayerContext.Provider value={contextValue}>
      {children}
      {/* Vùng neo góc dưới bên phải: xếp chồng các nút nổi theo chiều dọc */}
      <aside
        aria-label="Các công cụ hỗ trợ nổi"
        className={cn(
          "pointer-events-none fixed right-3 sm:right-6 bottom-[calc(4.5rem+env(safe-area-inset-bottom)+12px)] sm:bottom-6 z-40 flex flex-col-reverse items-end gap-3",
          className
        )}
      >
        {items
          .filter((i) => !i.placement || i.placement === "bottom-right")
          .map((item) => (
            <div key={item.id} className="pointer-events-auto transition-all">
              {item.node}
            </div>
          ))}
      </aside>
    </FloatingLayerContext.Provider>
  )
}
