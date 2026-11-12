"use client"

import { parsePricing, sellableOptions } from "@/modules/products/domain/product-pricing"
import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "@/components/ui/icon-set/arrow-left"
import { Receipt } from "@/components/ui/icon-set/receipt"
import { SlidersHorizontal } from "@/components/ui/icon-set/sliders-horizontal"
import { Button } from "@/components/ui/button"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { useSession } from "@/lib/session"
import { getIndustryTerminology } from "@/modules/organization/domain/industry-profile"
import { extractComponentNames } from "@/modules/products/domain/bom"
import { CustomerQuoteBuilder } from "@/components/sales/quotation/customer-quote-builder"
import { PartnerQuoteBuilder } from "@/components/sales/quotation/partner-quote-builder"
import { QuotationsListView } from "@/components/sales/quotation/quotations-list-view"
import type { ProductItem } from "@/components/sales/quotation/quotation-types"
import { PageHeader } from "@/components/ui/page-header"

type ActiveTab = "CUSTOMER" | "PARTNER" | "LIST"

export default function BaoGiaPage() {
  const router = useRouter()
  const { organization } = useSession()
  const ti = getIndustryTerminology(organization?.industry)
  const [activeTab, setActiveTab] = useState<ActiveTab>("CUSTOMER")
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [products, setProducts] = useState<ProductItem[]>([])

  const napDuLieu = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/products?status=ACTIVE&limit=100")
      if (!res.ok) throw new Error(String(res.status))
      const body = (await res.json()) as { data?: Array<Record<string, unknown>> }
      setProducts(
        (body.data ?? [])
          .filter((item) => typeof item.price_vnd === "number")
          .map((item) => ({
            id: String(item.id),
            title: String(item.name ?? ""),
            price: Number(item.price_vnd),
            category: typeof item.category === "string" ? item.category : ti.catalogTitle,
            image_url: typeof item.masterImageUrl === "string" ? item.masterImageUrl : "",
            composition: extractComponentNames((item.attributes as Record<string, unknown> | null)?.bom),
            options: sellableOptions(parsePricing(item.attributes)).map((o) => ({ id: o.id, name: o.name, priceVnd: o.priceVnd })),
          })),
      )
    } catch {
      setLoadError("Chưa tải được danh sách sản phẩm. Hãy thử tải lại trang.")
    }
  }, [ti.catalogTitle])

  useEffect(() => {
    let cancelled = false
    napDuLieu().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [napDuLieu])

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg">
      {/* Top Header */}
      <header className="flex flex-shrink-0 items-center justify-between border-b border-border bg-surface px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-selected text-primary">
            <Receipt className="w-5 h-5" aria-hidden="true" />
          </div>
          <PageHeader
            title="Tạo Thẻ báo giá sản phẩm"
            description="Tạo bộ lựa chọn sản phẩm gửi khách hoặc xuất thẻ báo giá cho đối tác"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/gia")}
            className="flex items-center gap-1.5"
          >
            <SlidersHorizontal className="w-4 h-4 text-text-muted" aria-hidden="true" />
            <span>Cấu hình quy tắc giá</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Trang chủ</span>
          </Button>
        </div>
      </header>

      {/* Mode Selector Tabs */}
      <div className="border-b border-border bg-surface px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={activeTab === "CUSTOMER" ? "primary" : "outline"}
            size="sm"
            onClick={() => setActiveTab("CUSTOMER")}
            className="h-9 px-3.5"
          >
            Gửi khách mua
          </Button>
          <Button
            type="button"
            variant={activeTab === "PARTNER" ? "primary" : "outline"}
            size="sm"
            onClick={() => setActiveTab("PARTNER")}
            className="h-9 px-3.5"
          >
            Báo giá đối tác
          </Button>
          <Button
            type="button"
            variant={activeTab === "LIST" ? "primary" : "outline"}
            size="sm"
            onClick={() => setActiveTab("LIST")}
            className="h-9 px-3.5"
          >
            Danh sách báo giá
          </Button>
        </div>

        <span className="text-caption text-text-muted hidden sm:inline-block">
          {activeTab === "CUSTOMER"
            ? `Tạo bảng báo giá theo yêu cầu gửi khách`
            : activeTab === "PARTNER"
            ? "Chế độ giao việc cho đối tác gia công"
            : "Lịch sử và trạng thái báo giá"}
        </span>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-7xl mx-auto w-full">
        {loading ? (
          <SkeletonBlock lines={4} label="Đang tải dữ liệu sản phẩm..." />
        ) : activeTab === "CUSTOMER" ? (
          <CustomerQuoteBuilder
            products={products}
            sampleProductLabel={ti.sampleProduct}
            catalogTitle={ti.catalogTitle}
            loadError={loadError}
            onReload={napDuLieu}
          />
        ) : activeTab === "PARTNER" ? (
          <PartnerQuoteBuilder
            products={products}
            sampleProductLabel={ti.sampleProduct}
            makerAction={ti.makerAction}
          />
        ) : (
          <QuotationsListView />
        )}
      </div>
    </div>
  )
}
