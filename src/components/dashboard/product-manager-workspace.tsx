"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import type { Route } from "next"
import { PackagePlus } from "@/components/ui/icon-set/package-plus"
import { BookOpen } from "@/components/ui/icon-set/book-open"
import { DollarSign } from "@/components/ui/icon-set/dollar-sign"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { ChevronRight } from "@/components/ui/icon-set/chevron-right"
import { Package } from "@/components/ui/icon-set/package"
import { Layers } from "@/components/ui/icon-set/layers"
import { useSession } from "@/lib/session"
import { getIndustryTerminology } from "@/modules/organization/domain/industry-profile"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserMenu } from "@/components/layout/user-menu"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { InlineError } from "@/components/ui/inline-error"
import { FeatureGuidanceCard } from "@/components/ui/feature-guidance-card"
import { FlowerPlaceholder } from "@/components/ui/flower-placeholder"
import {
  computeProductReadiness,
  type ProductReadinessInput,
  type ProductReadinessResult,
} from "@/modules/products/domain/product-readiness"
import { PageHeader } from "@/components/ui/page-header"

class ChuaDangNhap extends Error {}

async function layJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url)
  if (res.status === 401) throw new ChuaDangNhap()
  if (res.status === 403) return null
  if (!res.ok) throw new Error(`Không tải được dữ liệu (${res.status})`)
  return (await res.json()) as T
}

export function ProductManagerWorkspace() {
  const router = useRouter()
  const { orgName, userInitials, roleUx, can, organization } = useSession()
  const ti = getIndustryTerminology(organization?.industry)

  const [products, setProducts] = useState<ProductReadinessInput[] | null>(null)
  const [daTai, setDaTai] = useState(false)
  const [loi, setLoi] = useState<string | null>(null)

  const napLai = useCallback(async () => {
    setLoi(null)
    try {
      const data = await layJson<{ items: ProductReadinessInput[] }>("/api/v1/products/master-index?limit=100")
      setProducts(data?.items ?? [])
    } catch (e) {
      if (e instanceof ChuaDangNhap) {
        router.push("/dang-nhap" as Route)
        return
      }
      setLoi(e instanceof Error ? e.message : "Không tải được danh mục sản phẩm")
    } finally {
      setDaTai(true)
    }
  }, [router])

  useEffect(() => {
    napLai()
  }, [napLai])

  // Phân tích mức độ sẵn sàng bán cho từng sản phẩm
  const { unready, ready, averageScore } = useMemo(() => {
    if (!products || products.length === 0) {
      return { unready: [], ready: [], averageScore: 0 }
    }
    const evaluated: { product: ProductReadinessInput; readiness: ProductReadinessResult }[] = products.map((p) => ({
      product: p,
      readiness: computeProductReadiness(p),
    }))

    const unreadyList = evaluated.filter((item) => !item.readiness.isReady)
    const readyList = evaluated.filter((item) => item.readiness.isReady)
    const totalScore = evaluated.reduce((acc, curr) => acc + curr.readiness.score, 0)
    const avg = Math.round(totalScore / evaluated.length)

    return {
      unready: unreadyList,
      ready: readyList,
      averageScore: avg,
    }
  }, [products])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <PageHeader
        className="flex-shrink-0 border-b border-border bg-surface px-4 py-4"
        breadcrumbs={roleUx?.label ?? "Quản lý sản phẩm"}
        title={orgName}
        actions=<UserMenu initials={userInitials} />
      />

      {/* Main Body */}
      <main className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {/* K1: 1 Feature Guidance Card */}
        <FeatureGuidanceCard
          id="product_manager_workspace_guidance"
          badgeLabel="HƯỚNG DẪN QUẢN LÝ SẢN PHẨM"
          title="Tổng quan Sẵn sàng Sản phẩm & Danh mục"
          description={`Theo dõi mức độ hoàn thiện dữ liệu sản phẩm, phát hiện ngay các ${ti.sampleProduct} thiếu ảnh, thiếu giá hoặc thiếu công thức trước khi chào bán cho khách.`}
          tips={[
            `Kiểm tra lý do thiếu để bổ sung ảnh hoặc công thức ${ti.rawMaterialItem}`,
            "Chuyển trạng thái sang ACTIVE khi hoàn tất để mở bán trên toàn hệ thống",
            "Đồng bộ giá chào và danh mục để hỗ trợ đội ngũ Sales tư vấn",
          ]}
        />

        {/* K2: Thanh tác vụ (Tối đa 1 primary + 2 outline) */}
        <div className="flex flex-wrap items-center gap-2">
          {can("L2") && (
            <Button size="sm" variant="primary" onClick={() => router.push("/san-pham" as Route)}>
              <PackagePlus size={16} aria-hidden="true" />
              Thêm sản phẩm
            </Button>
          )}
          {can("L1") && (
            <Button size="sm" variant="outline" onClick={() => router.push("/catalog" as Route)}>
              <BookOpen size={16} aria-hidden="true" />
              Tra cứu Catalog
            </Button>
          )}
          {can("L5") && (
            <Button size="sm" variant="outline" onClick={() => router.push("/gia" as Route)}>
              <DollarSign size={16} aria-hidden="true" />
              Quy tắc giá
            </Button>
          )}
        </div>

        {loi && <InlineError message={loi} onRetry={napLai} />}

        {/* Khối P1: Thống kê nhanh danh mục */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card className="flex flex-col gap-1 p-3.5">
            <span className="text-caption text-text-muted">Tổng sản phẩm</span>
            <span className="text-title font-extrabold text-text">
              {!daTai ? "—" : products?.length ?? 0}
            </span>
          </Card>
          <Card className="flex flex-col gap-1 p-3.5">
            <span className="text-caption text-text-muted">Cần hoàn thiện</span>
            <span className="text-title font-extrabold text-warning">
              {!daTai ? "—" : unready.length}
            </span>
          </Card>
          <Card className="flex flex-col gap-1 p-3.5">
            <span className="text-caption text-text-muted">Sẵn sàng bán</span>
            <span className="text-title font-extrabold text-success">
              {!daTai ? "—" : ready.length}
            </span>
          </Card>
          <Card className="flex flex-col gap-1 p-3.5">
            <span className="text-caption text-text-muted">Điểm sẵn sàng TB</span>
            <span className="text-title font-extrabold text-primary">
              {!daTai ? "—" : `${averageScore}%`}
            </span>
          </Card>
        </div>

        {/* Khối P0: Sản phẩm chưa sẵn sàng để bán */}
        <Card className="flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} className="text-warning" aria-hidden="true" />
              <h2 className="text-title-sm font-bold">
                Sản phẩm chưa sẵn sàng bán {daTai && `(${unready.length})`}
              </h2>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push("/san-pham" as Route)}
              className="text-caption"
            >
              Xem tất cả
              <ChevronRight size={14} aria-hidden="true" />
            </Button>
          </div>

          {!daTai ? (
            <SkeletonBlock lines={3} />
          ) : unready.length === 0 ? (
            <EmptyState
              title="Tất cả sản phẩm đã sẵn sàng bán!"
              reason="100% sản phẩm trong danh mục đã có đủ ảnh chính, giá, định lượng nguyên vật liệu và ở trạng thái kích hoạt."
            />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {unready.slice(0, 8).map(({ product, readiness }) => (
                <li key={product.id}>
                  <Button variant="ghost"
                    type="button"
                    onClick={() => router.push("/san-pham" as Route)}
                    className="text-[length:inherit] justify-start font-[inherit] flex cursor-pointer min-h-12 w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    {product.masterImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.masterImageUrl}
                        alt=""
                        className="h-10 w-10 flex-shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 flex-shrink-0">
                        <FlowerPlaceholder className="h-full w-full rounded-md" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-body font-semibold text-text">
                          {product.name}
                        </span>
                        <span className="rounded-sm bg-surface-alt px-1.5 py-0.5 text-caption font-mono text-text-muted">
                          {product.code}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {readiness.missingReasons.map((reason, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center rounded-full bg-warning-bg px-2 py-0.5 text-caption font-medium text-warning"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-right">
                      <span className="text-caption font-bold text-text-muted">
                        {readiness.score}%
                      </span>
                      <ChevronRight size={16} className="text-text-muted" aria-hidden="true" />
                    </div>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Khối P2: Sản phẩm đã kích hoạt sẵn sàng bán */}
        {daTai && ready.length > 0 && (
          <Card className="flex flex-col gap-3 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-success" aria-hidden="true" />
              <h2 className="text-title-sm font-bold">
                Sản phẩm đang bán hoàn chỉnh ({ready.length})
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {ready.slice(0, 4).map(({ product }) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface p-2.5"
                >
                  {product.masterImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.masterImageUrl}
                      alt=""
                      className="h-10 w-10 flex-shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 flex-shrink-0">
                      <FlowerPlaceholder className="h-full w-full rounded-md" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-body font-semibold text-text">
                      {product.name}
                    </div>
                    <div className="text-caption text-text-muted">
                      {product.category || "Chưa phân loại"} · Mã: {product.code}
                    </div>
                  </div>
                  <span className="rounded-full bg-success-bg px-2 py-0.5 text-caption font-bold text-success">
                    100%
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </main>
    </div>
  )
}
