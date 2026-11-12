"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Filter } from "@/components/ui/icon-set/filter"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { InlineError } from "@/components/ui/inline-error"
import { formatCurrency } from "@/lib/i18n/formatters"
import { unsentMessage } from "./quotation-send"
import { quotationApi } from "./quotation-api"
import { QuotePreviewCard } from "./quote-preview-card"
import { QuoteLineOptions } from "./quote-line-options"
import type { ProductItem, QuotationRecord } from "./quotation-types"

interface CustomerQuoteBuilderProps {
  products: ProductItem[]
  sampleProductLabel: string
  catalogTitle: string
  loadError: string | null
  onReload: () => void
  onQuotationCreated?: (quote: QuotationRecord) => void
}

export function CustomerQuoteBuilder({
  products,
  sampleProductLabel,
  loadError,
  onReload,
  onQuotationCreated,
}: CustomerQuoteBuilderProps) {
  const router = useRouter()
  const [budgetFilter, setBudgetFilter] = useState<string>("ALL")
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [discountAmount, setDiscountAmount] = useState<number>(0)
  const [variantOf, setVariantOf] = useState<Record<string, string>>({})
  const [shippingFee, setShippingFee] = useState<number>(0)
  const [validDays, setValidDays] = useState<number>(7)
  const [terms, setTerms] = useState<string>("Giá đã bao gồm chi phí đóng gói & thiệp.")
  const [notes, setNotes] = useState<string>("")
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [createdQuote, setCreatedQuote] = useState<QuotationRecord | null>(null)
  const [copiedText, setCopiedText] = useState<boolean>(false)

  const filteredProducts = products.filter((p) => {
    if (categoryFilter !== "ALL" && p.category !== categoryFilter) return false
    if (budgetFilter === "UNDER_500" && p.price >= 500000) return false
    if (budgetFilter === "500_700" && (p.price < 500000 || p.price > 700000)) return false
    if (budgetFilter === "700_1000" && (p.price < 700000 || p.price > 1000000)) return false
    if (budgetFilter === "ABOVE_1000" && p.price <= 1000000) return false
    return true
  })

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }

  // Dòng báo giá theo phiên bản đã chọn: giá và tên phiên bản thay cho giá gốc (checklist ALG 3.8)
  const chosen = products.filter((p) => selectedIds.includes(p.id))
  const optionFor = (p: ProductItem) => (p.options ?? []).find((o) => o.id === variantOf[p.id]) ?? null
  const selectedProducts = chosen.map((p) => {
    const o = optionFor(p)
    return o ? { ...p, price: o.priceVnd, title: `${p.title} — ${o.name}` } : p
  })
  const subtotal = selectedProducts.reduce((sum, p) => sum + p.price, 0)
  const effectiveDiscount = Math.max(0, Math.min(discountAmount, subtotal))
  const totalAmount = Math.max(0, subtotal - effectiveDiscount) + shippingFee

  // Chữ gửi khách lấy từ báo giá ĐÃ LƯU (máy chủ đã kiểm sàn/trần, tính tổng) — không sao chép số tính tạm ở trình
  // duyệt trước khi lưu (audit BL-31)
  const handleCopyText = () => {
    if (!createdQuote) return
    const textLines = createdQuote.items.map((it, idx) => {
      const composition = selectedProducts.find((p) => p.id === it.productId)?.composition?.join(", ") || ""
      return `Mẫu ${idx + 1}: ${it.name} - ${formatCurrency(it.unitPrice)}\n${composition}`
    })
    const summary = `BẢNG BÁO GIÁ SẢN PHẨM\n\n${textLines.join("\n\n")}\n\nTổng thanh toán: ${formatCurrency(createdQuote.totalAmount)}\nĐiều khoản: ${terms}`
    navigator.clipboard.writeText(summary)
    setCopiedText(true)
    setTimeout(() => setCopiedText(false), 2000)
  }

  const handleSaveAndSend = async () => {
    if (selectedProducts.length === 0) return
    setSubmitting(true)
    setErrorMsg(null)
    try {
      const validUntil = new Date(Date.now() + validDays * 86400000).toISOString()
      const quote = await quotationApi.create({
        items: chosen.map((p) => ({
          productId: p.id,
          name: p.title,
          variantLabel: optionFor(p)?.name ?? null,
          qty: 1,
          unitPrice: optionFor(p)?.priceVnd ?? p.price,
        })),
        discountAmount: effectiveDiscount,
        shippingFee,
        validUntil,
        terms,
        notes: notes || null,
      })

      // Gửi lỗi thì vẫn giữ báo giá nháp đã lưu và báo rõ — trước đây lỗi bị nuốt, màn hình như đã gửi (audit BL-31)
      const sentQuote = await quotationApi.send(quote.id).catch((err: unknown) => {
        setErrorMsg(unsentMessage(err))
        return quote
      })
      setCreatedQuote(sentQuote)
      onQuotationCreated?.(sentQuote)
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Đã xảy ra lỗi khi tạo báo giá")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Filter & Product Library (7 cols) */}
      <div className="lg:col-span-7 space-y-4">
        <p className="text-body-sm text-text-muted">
          Mẫu chưa có trong kho?{" "}
          <Link href="/san-pham/tao-moi" className="font-semibold text-primary underline">
            Thêm sản phẩm bằng ảnh
          </Link>{" "}
          — AI phân tích thành phần thật rồi đưa vào kho.
        </p>

        <Card className="p-4 bg-surface border-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-body-sm font-semibold text-text">
              <Filter className="w-4 h-4 text-primary" aria-hidden="true" />
              <span>Lọc {sampleProductLabel} theo nhu cầu của khách</span>
            </div>
            <span className="text-caption text-text-muted">
              {filteredProducts.length} mẫu phù hợp
            </span>
          </div>

          <div>
            <span className="text-caption text-text-muted block mb-1.5">Ngân sách mong muốn:</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "ALL", label: "Tất cả mức giá" },
                { id: "UNDER_500", label: "Dưới 500K" },
                { id: "500_700", label: "500K – 700K" },
                { id: "700_1000", label: "700K – 1 Triệu" },
                { id: "ABOVE_1000", label: "Trên 1 Triệu" },
              ].map((b) => (
                <Button variant="ghost"
                  type="button"
                  key={b.id}
                  onClick={() => setBudgetFilter(b.id)}
                  className={`text-[length:inherit] h-auto justify-start font-[inherit] gap-0 inline-block px-2.5 py-1 rounded-md text-caption font-medium transition-colors cursor-pointer ${
                    budgetFilter === b.id
                      ? "bg-primary text-white font-semibold"
                      : "bg-surface border border-border text-text hover:bg-surface-alt"
                  }`}
                >
                  {b.label}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {loadError && <InlineError message={loadError} onRetry={onReload} />}
        {!loadError && products.length === 0 && (
          <EmptyState
            title="Kho chưa có sản phẩm đang bán có giá"
            reason="Thêm sản phẩm và giá bán trước, rồi quay lại đây để tạo thẻ báo giá gửi khách."
            action={{ label: "Thêm sản phẩm", href: "/san-pham/tao-moi" }}
          />
        )}

        <div className="space-y-2.5">
          {filteredProducts.map((p) => {
            const isSelected = selectedIds.includes(p.id)
            return (
              <div
                key={p.id}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  isSelected
                    ? "border-primary bg-selected/40 shadow-xs"
                    : "border-border bg-surface hover:border-text-muted/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.title}
                      className="w-14 h-14 rounded-lg object-cover border border-border"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-surface-alt border border-border flex items-center justify-center text-caption text-text-muted">
                      Ảnh
                    </div>
                  )}
                  <div>
                    <div className="text-body-sm font-bold text-text">{p.title}</div>
                    <div className="text-caption text-text-muted mt-0.5">
                      {p.composition?.join(" • ") || p.description}
                    </div>
                    <div className="text-body-sm font-extrabold text-primary mt-1">
                      {formatCurrency(p.price)}
                    </div>
                  </div>
                </div>

                <Button
                  variant={isSelected ? "primary" : "outline"}
                  size="sm"
                  onClick={() => toggleSelect(p.id)}
                >
                  {isSelected ? "Đã chọn ✓" : "Chọn vào bộ"}
                </Button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Right Column: Live Quote Card Preview & Actions (5 cols) */}
      <div className="lg:col-span-5 space-y-4">
        {chosen.length > 0 && (
          <QuoteLineOptions
            products={chosen}
            variantOf={variantOf}
            onVariantChange={(id, optionId) => setVariantOf({ ...variantOf, [id]: optionId })}
            shippingFee={shippingFee}
            onShippingChange={setShippingFee}
          />
        )}
        <QuotePreviewCard
          selectedProducts={selectedProducts}
          sampleProductLabel={sampleProductLabel}
          subtotal={subtotal}
          effectiveDiscount={effectiveDiscount}
          totalAmount={totalAmount}
          discountAmount={discountAmount}
          validDays={validDays}
          terms={terms}
          submitting={submitting}
          errorMsg={errorMsg}
          createdQuote={createdQuote}
          copiedText={copiedText}
          onDiscountChange={setDiscountAmount}
          onValidDaysChange={setValidDays}
          onTermsChange={setTerms}
          onSaveAndSend={handleSaveAndSend}
          onCopyText={handleCopyText}
          onNavigateOrders={() => router.push("/don-hang")}
        />
      </div>
    </div>
  )
}
