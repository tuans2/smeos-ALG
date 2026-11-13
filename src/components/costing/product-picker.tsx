"use client"

import { createContext, useContext, useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/select"
import { InlineError } from "@/components/ui/inline-error"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { normalizeMaterialName } from "@/modules/costing/domain/bom-adapters"
import { useCostingResource } from "./use-costing-api"
import { selectClass, type ProductOption } from "./costing-ui-types"

const Ctx = createContext<{ productId: string; setProductId: (id: string) => void } | null>(null)

/** Giữ mẫu đang chọn khi chuyển giữa Công thức → Giá vốn → Giá bán (layout không bị dựng lại). */
export function SelectedProductProvider({ children }: { children: ReactNode }) {
  const [productId, setProductId] = useState("")
  return <Ctx.Provider value={{ productId, setProductId }}>{children}</Ctx.Provider>
}

export function useSelectedProduct() {
  const v = useContext(Ctx)
  if (!v) throw new Error("useSelectedProduct phải dùng bên trong /tinh-gia")
  return v
}

/** Chọn một mẫu sản phẩm đang bán; có ô lọc khi cửa hàng nhiều mẫu. */
export function ProductPicker() {
  const { productId, setProductId } = useSelectedProduct()
  const { state, reload } = useCostingResource<ProductOption[]>("/api/v1/products?status=ACTIVE&limit=100")
  const [query, setQuery] = useState("")
  const options = useMemo(() => {
    if (state.status !== "ready") return []
    const q = normalizeMaterialName(query)
    return state.data.filter((p) => !q || normalizeMaterialName(p.name).includes(q) || p.id === productId)
  }, [state, query, productId])

  if (state.status === "loading") return <SkeletonBlock lines={1} label="Đang tải danh sách mẫu" />
  if (state.status === "error") return <InlineError message={state.message} onRetry={reload} />
  if (state.data.length === 0)
    return (
      <EmptyState
        title="Chưa có mẫu sản phẩm nào đang bán"
        reason="Cần ít nhất một mẫu để ghi công thức và tính giá."
        action={{ label: "Thêm sản phẩm", href: "/san-pham/tao-moi" }}
      />
    )

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface p-4">
      {state.data.length > 8 && (
        <label className="flex min-w-48 flex-1 flex-col gap-1 text-body-sm text-text">
          Lọc theo tên
          <Input inputSize="sm" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Gõ tên mẫu" />
        </label>
      )}
      <label className="flex min-w-60 flex-[2] flex-col gap-1 text-body-sm text-text">
        Mẫu sản phẩm
        <NativeSelect className={selectClass} value={productId} onChange={(e) => setProductId(e.target.value)}>
          <option value="">Chọn một mẫu…</option>
          {options.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </NativeSelect>
      </label>
      <Link href="/san-pham" className="pb-3 text-body-sm font-medium text-primary underline-offset-2 hover:underline">
        Quản lý sản phẩm
      </Link>
    </div>
  )
}
