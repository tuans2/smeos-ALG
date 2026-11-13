"use client"

import { useState } from "react"
import Link from "next/link"
import { Check } from "@/components/ui/icon-set/check"
import { Copy } from "@/components/ui/icon-set/copy"
import { ExternalLink } from "@/components/ui/icon-set/external-link"
import { Receipt } from "@/components/ui/icon-set/receipt"
import { Send } from "@/components/ui/icon-set/send"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/select"
import { InlineError } from "@/components/ui/inline-error"
import { formatCurrency } from "@/lib/i18n/formatters"
import { QUOTATION_STATUS_LABELS } from "@/modules/sales/domain/quotation"
import type { ProductItem, QuotationRecord } from "./quotation-types"

interface QuotePreviewCardProps {
  selectedProducts: ProductItem[]
  sampleProductLabel: string
  subtotal: number
  effectiveDiscount: number
  totalAmount: number
  discountAmount: number
  validDays: number
  terms: string
  submitting: boolean
  errorMsg: string | null
  createdQuote: QuotationRecord | null
  copiedText: boolean
  onDiscountChange: (amount: number) => void
  onValidDaysChange: (days: number) => void
  onTermsChange: (terms: string) => void
  onSaveAndSend: () => void
  onCopyText: () => void
  onNavigateOrders: () => void
}

export function QuotePreviewCard({
  selectedProducts,
  sampleProductLabel,
  subtotal,
  effectiveDiscount,
  totalAmount,
  discountAmount,
  validDays,
  terms,
  submitting,
  errorMsg,
  createdQuote,
  copiedText,
  onDiscountChange,
  onValidDaysChange,
  onTermsChange,
  onSaveAndSend,
  onCopyText,
  onNavigateOrders,
}: QuotePreviewCardProps) {
  const [copiedLink, setCopiedLink] = useState(false)

  const copyPublicLink = () => {
    if (!createdQuote) return
    const url = `${window.location.origin}/bg/${createdQuote.publicToken}`
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
  }

  return (
    <Card className="p-4 bg-surface border-border space-y-4 sticky top-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
          <span className="text-body-sm font-bold text-text">Xem trước Báo giá</span>
        </div>
        <Badge tone="neutral" className="text-caption">
          Chuẩn A6 gửi Zalo
        </Badge>
      </div>

      {/* Printable Preview Card */}
      <div className="rounded-xl border-2 border-dashed border-border p-4 bg-surface-alt space-y-4">
        <div className="text-center pb-2 border-b border-border">
          <div className="text-body-sm font-extrabold text-primary tracking-wide uppercase">
            BỘ {sampleProductLabel.toUpperCase()} GỢI Ý
          </div>
          <div className="text-caption text-text-muted mt-0.5">
            Báo giá chi tiết theo ngân sách và nhu cầu của quý khách
          </div>
        </div>

        {selectedProducts.length === 0 ? (
          <div className="py-8 text-center text-text-muted text-caption">
            Chưa có {sampleProductLabel} nào được chọn. Hãy bấm chọn {sampleProductLabel} bên trái để đưa vào báo giá.
          </div>
        ) : (
          <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
            {selectedProducts.map((p, idx) => (
              <div
                key={p.id}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-surface border border-border"
              >
                {p.image_url && (
                  <img
                    src={p.image_url}
                    alt={p.title}
                    className="w-12 h-12 rounded-md object-cover border border-border"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-caption font-bold text-primary">Mẫu {idx + 1}</span>
                    <span className="text-body-sm font-extrabold text-text">
                      {formatCurrency(p.price)}
                    </span>
                  </div>
                  <div className="text-caption font-semibold text-text truncate">{p.title}</div>
                  <div className="text-caption text-text-muted truncate">
                    {p.composition?.join(", ")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedProducts.length > 0 && (
          <div className="pt-2 border-t border-border space-y-1.5 text-caption">
            <div className="flex justify-between text-text-muted">
              <span>Tiền hàng:</span>
              <span className="font-semibold text-text">{formatCurrency(subtotal)}</span>
            </div>
            {effectiveDiscount > 0 && (
              <div className="flex justify-between text-destructive">
                <span>Ưu đãi:</span>
                <span className="font-semibold">-{formatCurrency(effectiveDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-body-sm font-bold text-primary border-t border-border pt-1">
              <span>Tổng cộng:</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Quote Settings */}
      {selectedProducts.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-border text-caption">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-semibold text-text block mb-1">Giảm giá (VNĐ):</label>
              <Input
                type="number"
                value={discountAmount || ""}
                onChange={(e) => onDiscountChange(Number(e.target.value) || 0)}
                placeholder="0"
                className="w-full"
              />
            </div>
            <div>
              <label className="font-semibold text-text block mb-1">Hạn hiệu lực:</label>
              <NativeSelect
                value={validDays}
                onChange={(e) => onValidDaysChange(Number(e.target.value))}
                className="w-full"
              >
                <option value={3}>3 ngày</option>
                <option value={7}>7 ngày</option>
                <option value={14}>14 ngày</option>
                <option value={30}>30 ngày</option>
              </NativeSelect>
            </div>
          </div>

          <div>
            <label className="font-semibold text-text block mb-1">Điều khoản / Ghi chú:</label>
            <Input
              type="text"
              value={terms}
              onChange={(e) => onTermsChange(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
      )}

      {errorMsg && <InlineError message={errorMsg} />}

      {/* Success State */}
      {createdQuote && (
        <div className="p-3 rounded-xl bg-surface-alt border border-border text-caption space-y-2">
          <div className="flex items-center justify-between text-primary font-bold">
            <span>
              {createdQuote.status === "DRAFT" ? "Đã lưu báo giá" : "Đã lưu & gửi báo giá"}: {createdQuote.code}
            </span>
            <span className="text-caption">{QUOTATION_STATUS_LABELS[createdQuote.status]}</span>
          </div>
          {createdQuote.status === "DRAFT" ? (
            <p className="text-text-muted">Báo giá đang là bản nháp. Gửi báo giá để có link chia sẻ cho khách.</p>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyPublicLink}
                className="flex-1 flex items-center justify-center gap-1.5"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? "Đã sao chép link!" : "Sao chép link gửi khách"}</span>
              </Button>
              <Link
                href={`/bg/${createdQuote.publicToken}`}
                target="_blank"
                className="px-2.5 py-1.5 rounded-md border border-border bg-surface hover:bg-surface-alt flex items-center gap-1 text-caption text-text"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Xem</span>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-2 pt-2">
        <Button
          variant="primary"
          size="sm"
          onClick={onSaveAndSend}
          disabled={selectedProducts.length === 0 || submitting}
          className="w-full flex items-center justify-center gap-2"
        >
          <Receipt className="w-4 h-4" aria-hidden="true" />
          <span>{submitting ? "Đang lưu..." : "Lưu báo giá & Lấy link"}</span>
        </Button>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCopyText}
            disabled={!createdQuote}
            title={createdQuote ? undefined : "Lưu báo giá trước rồi sao chép"}
            className="flex items-center justify-center gap-1.5"
          >
            {copiedText ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
            <span>{copiedText ? "Đã sao chép!" : "Sao chép chữ"}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onNavigateOrders}
            className="flex items-center justify-center gap-1.5"
          >
            <Send className="w-4 h-4 text-text-muted" aria-hidden="true" />
            <span>Xem đơn hàng</span>
          </Button>
        </div>
      </div>
    </Card>
  )
}
