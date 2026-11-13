"use client"

import { InlineError } from "@/components/ui/inline-error"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { ProductPicker, useSelectedProduct } from "@/components/costing/product-picker"
import { RecipeEditor, type RecipeResponse } from "@/components/costing/recipe-editor"
import { useCostingResource } from "@/components/costing/use-costing-api"
import type { MaterialRow } from "@/components/costing/costing-ui-types"

/** #31 — Công thức & định mức. */
export default function CongThucPage() {
  const { productId } = useSelectedProduct()
  const recipe = useCostingResource<RecipeResponse>(productId ? `/api/v1/costing/recipes/${productId}` : null)
  const materials = useCostingResource<MaterialRow[]>("/api/v1/costing/materials")

  return (
    <section className="flex flex-col gap-4" aria-labelledby="ct-title">
      <h2 id="ct-title" className="sr-only">
        Công thức và định mức
      </h2>
      <ProductPicker />
      {!productId && <p className="text-body-sm text-text-muted">Chọn một mẫu để xem hoặc ghi công thức.</p>}
      {productId && (recipe.state.status === "loading" || materials.state.status === "loading") && <SkeletonBlock lines={4} label="Đang tải công thức" />}
      {productId && recipe.state.status === "error" && <InlineError message={recipe.state.message} onRetry={recipe.reload} />}
      {materials.state.status === "error" && <InlineError message={materials.state.message} onRetry={materials.reload} />}
      {productId && recipe.state.status === "ready" && materials.state.status === "ready" && recipe.state.data.product.id === productId && (
        <RecipeEditor
          key={`${productId}-${recipe.state.data.recipe?.version ?? 0}`}
          data={recipe.state.data}
          materials={materials.state.data}
          onSaved={() => undefined}
          onMaterialsChanged={materials.reload}
        />
      )}
    </section>
  )
}
