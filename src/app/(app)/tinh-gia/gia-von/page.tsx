"use client"

import Link from "next/link"
import { Calculator } from "@/components/ui/icon-set/calculator"
import { EmptyState } from "@/components/ui/empty-state"
import { InlineError } from "@/components/ui/inline-error"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { Disclosure } from "@/components/ui/disclosure"
import { ProductPicker, useSelectedProduct } from "@/components/costing/product-picker"
import { formatVnd, useCostingResource } from "@/components/costing/use-costing-api"
import { useCostingProfile } from "@/components/costing/costing-profile-context"
import type { CostResponse } from "@/components/costing/costing-ui-types"

/** #33 — Giá vốn sản phẩm: L0 là một con số + trạng thái đủ/thiếu dữ liệu; phân rã từng dòng ở L2. */
export default function GiaVonPage() {
  const { productId } = useSelectedProduct()
  const { config } = useCostingProfile()
  const { state, reload } = useCostingResource<CostResponse>(productId ? `/api/v1/costing/products/${productId}/cost` : null)
  const ready = productId && state.status === "ready" && state.data.product.id === productId ? state.data : null

  return (
    <section className="flex flex-col gap-4" aria-labelledby="gv-title">
      <h2 id="gv-title" className="sr-only">
        Giá vốn sản phẩm
      </h2>
      <ProductPicker />
      {!productId && <p className="text-body-sm text-text-muted">Chọn một mẫu để xem giá vốn.</p>}
      {productId && state.status === "loading" && <SkeletonBlock lines={4} label="Đang tính giá vốn" />}
      {productId && state.status === "error" && <InlineError message={state.message} onRetry={reload} />}
      {ready && !ready.hasRecipe && (
        <EmptyState
          icon={Calculator}
          title="Mẫu này chưa có công thức"
          reason="Giá vốn được cộng từ công thức — ghi số lượng từng nguyên liệu trước."
          action={{ label: "Ghi công thức", href: "/tinh-gia/cong-thuc" }}
        />
      )}
      {ready?.cost && (
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p className="text-body-sm text-text-muted">Giá vốn một sản phẩm</p>
              <p className="text-title font-bold text-text">{formatVnd(ready.cost.totalVnd)}</p>
            </div>
            {ready.product.priceVnd !== null && (
              <p className="text-body-sm text-text-muted">
                Đang bán: <strong className="text-text">{formatVnd(ready.product.priceVnd)}</strong>
              </p>
            )}
          </div>
          {!ready.cost.complete && (
            <div role="status" className="flex flex-col gap-1 rounded-xl bg-warning-bg px-3.5 py-2.5 text-body-sm text-warning-text">
              <strong>Giá vốn chưa đầy đủ — con số trên đang thấp hơn thực tế.</strong>
              {ready.cost.missingPrices.length > 0 && (
                <span>
                  Chưa có đơn giá: {ready.cost.missingPrices.join(", ")}.{" "}
                  <Link href="/tinh-gia/nguyen-lieu" className="font-semibold underline">
                    Nhập đơn giá
                  </Link>
                </span>
              )}
              {ready.cost.laborMissing && (
                <span>
                  {config.laborModel === "PER_COMPLEXITY"
                    ? "Chưa tính được tiền công vì mẫu chưa có độ khó."
                    : "Chưa tính được tiền công: cần số phút làm trong công thức và đơn giá công mỗi giờ."}{" "}
                  <Link href={(config.laborModel === "PER_COMPLEXITY" ? `/san-pham/${productId}` : "/tinh-gia/cong-thuc") as never} className="font-semibold underline">
                    Bổ sung
                  </Link>
                </span>
              )}
            </div>
          )}
          <dl className="grid gap-2 text-body sm:grid-cols-2">
            {[
              ["Nguyên liệu", ready.cost.materialVnd],
              ["Hao hụt", ready.cost.wasteVnd],
              ["Tiền công", ready.cost.laborVnd],
              ["Bao bì", ready.cost.packagingVnd],
              [`Chi phí chung (${config.overheadPercent}%)`, ready.cost.overheadVnd],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3 rounded-xl bg-surface-alt px-3 py-2">
                <dt className="text-text-muted">{label}</dt>
                <dd className="font-semibold text-text">{formatVnd(value as number)}</dd>
              </div>
            ))}
          </dl>
          <Disclosure label="Chi tiết từng nguyên liệu">
            <table className="w-full text-body-sm">
              <caption className="sr-only">Chi phí từng nguyên liệu</caption>
              <thead>
                <tr className="text-left text-text-muted">
                  <th scope="col" className="py-1.5 font-medium">Nguyên liệu</th>
                  <th scope="col" className="py-1.5 text-right font-medium">Số lượng</th>
                  <th scope="col" className="py-1.5 text-right font-medium">Đơn giá</th>
                  <th scope="col" className="py-1.5 text-right font-medium">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {ready.cost.lines.map((l) => (
                  <tr key={l.materialId} className="border-t border-border text-text">
                    <td className="py-1.5">{l.name}</td>
                    <td className="py-1.5 text-right">
                      {l.quantity.toLocaleString("vi-VN")} {l.unit}
                    </td>
                    <td className="py-1.5 text-right">{l.unitCostVnd === null ? "Chưa có giá" : formatVnd(l.unitCostVnd)}</td>
                    <td className="py-1.5 text-right">{formatVnd(l.lineCostVnd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Disclosure>
          {ready.cost.complete && (
            <Link href="/tinh-gia/gia-ban" className="self-start text-body-sm font-semibold text-primary underline-offset-2 hover:underline">
              Xem gợi ý giá bán →
            </Link>
          )}
        </div>
      )}
    </section>
  )
}
