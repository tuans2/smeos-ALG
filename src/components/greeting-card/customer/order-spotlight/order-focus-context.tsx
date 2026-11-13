"use client"

import React, { createContext, useContext, useMemo, useState } from "react"

/** Bốn khối của form đặt mua: Sản phẩm · Người mua · Giao hàng · Ghi chú (chuẩn Spotlight, AGENTS.md). */
export type OrderFocusBlock = 1 | 2 | 3 | 4

interface OrderFocusContextType {
  activeBlock: OrderFocusBlock
  setActiveBlock: (block: OrderFocusBlock) => void
}

const OrderFocusContext = createContext<OrderFocusContextType | null>(null)

export function OrderFocusProvider({ children }: { children: React.ReactNode }) {
  const [activeBlock, setActiveBlock] = useState<OrderFocusBlock>(1)
  const value = useMemo(() => ({ activeBlock, setActiveBlock }), [activeBlock])
  return <OrderFocusContext.Provider value={value}>{children}</OrderFocusContext.Provider>
}

export function useOrderFocus(): OrderFocusContextType {
  return useContext(OrderFocusContext) ?? { activeBlock: 1, setActiveBlock: () => {} }
}
