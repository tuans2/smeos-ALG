import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { formatDate, formatCurrency } from "@/lib/i18n/formatters"
import { isQuotationExpired, QUOTATION_STATUS_LABELS } from "@/modules/sales/domain/quotation"
import { getQuotationRepository } from "@/modules/sales/infra/quotation-repository"
import { QuoteExportButtons } from "@/components/sales/quotation/quote-export-buttons"

interface PageProps {
  params: Promise<{ token: string }>
}

// Link báo giá là riêng tư của người nhận: không lập chỉ mục, tiêu đề không chứa mã.
export const metadata: Metadata = {
  title: "Bảng báo giá",
  description: "Chi tiết bảng báo giá",
  robots: { index: false, follow: false },
}

export default async function PublicQuotationPage({ params }: PageProps) {
  const { token } = await params
  const quotation =
    token.length <= 128 ? await getQuotationRepository().findPublicByToken(token) : null

  if (!quotation) {
    notFound()
  }

  const expired = isQuotationExpired(quotation)
  const displayStatus = expired && quotation.status !== "CONVERTED" ? "EXPIRED" : quotation.status

  return (
    <main className="min-h-screen bg-bg py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto mb-3 flex justify-end">
        <QuoteExportButtons targetId="quote-card" fileName={`bao-gia-${quotation.code}`} />
      </div>
      <div id="quote-card" className="max-w-3xl mx-auto bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border bg-surface-alt/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-caption font-semibold tracking-wider uppercase text-text-muted">
                  Bảng báo giá
                </span>
                <Badge
                  tone={
                    displayStatus === "CONVERTED" || displayStatus === "ACCEPTED"
                      ? "success"
                      : displayStatus === "EXPIRED" || displayStatus === "REJECTED"
                      ? "danger"
                      : "neutral"
                  }
                  className="text-caption font-bold"
                >
                  {QUOTATION_STATUS_LABELS[displayStatus] ?? displayStatus}
                </Badge>
              </div>
              <h1 className="text-title font-extrabold text-primary mt-1">
                {quotation.code}
              </h1>
            </div>

            <div className="text-left sm:text-right space-y-1 text-caption text-text-muted">
              <div>Ngày tạo: <span className="font-semibold text-text">{formatDate(quotation.createdAt)}</span></div>
              {quotation.validUntil && (
                <div>
                  Hạn hiệu lực:{" "}
                  <span className={`font-semibold ${expired ? "text-destructive font-bold" : "text-text"}`}>
                    {formatDate(quotation.validUntil)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Customer info if any */}
          {quotation.recipientName && (
            <div className="p-4 rounded-xl border border-border bg-surface-alt text-caption space-y-1">
              <span className="font-bold text-text-muted uppercase tracking-wider block mb-1">
                Kính gửi quý khách
              </span>
              <div className="text-body-sm font-bold text-text">
                {quotation.recipientName}
              </div>
            </div>
          )}

          {/* Items Table */}
          <div className="space-y-3">
            <h2 className="text-body-sm font-bold text-text">Danh mục sản phẩm & dịch vụ</h2>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-left text-body-sm">
                <thead className="bg-surface-alt border-b border-border text-caption font-bold text-text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-3">Sản phẩm</th>
                    <th scope="col" className="px-4 py-3 text-center">SL</th>
                    <th scope="col" className="px-4 py-3 text-right">Đơn giá</th>
                    <th scope="col" className="px-4 py-3 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface">
                  {quotation.items.map((it, idx) => (
                    <tr key={it.id || idx} className="hover:bg-surface-alt/40 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-start gap-3">
                          {it.imageUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={it.imageUrl} alt={`Ảnh mẫu ${it.name}`} className="h-16 w-16 flex-shrink-0 rounded-lg object-cover" />
                          )}
                          <div>
                            <div className="font-bold text-text">{it.name}{it.variantLabel && !it.name.includes(it.variantLabel) ? ` — ${it.variantLabel}` : ""}</div>
                            {it.composition.length > 0 && (
                              <div className="text-caption text-text-muted mt-0.5">Thành phần: {it.composition.join(", ")}</div>
                            )}
                            {it.note && (
                              <div className="text-caption text-text-muted mt-0.5">{it.note}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center font-medium text-text">{it.qty}</td>
                      <td className="px-4 py-3.5 text-right font-medium text-text-muted">
                        {formatCurrency(it.unitPrice)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-text">
                        {formatCurrency(it.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pricing Totals */}
          <div className="border-t border-border pt-4">
            <div className="w-full sm:w-72 ml-auto space-y-2 text-body-sm">
              <div className="flex justify-between text-text-muted">
                <span>Tổng tiền hàng:</span>
                <span className="font-semibold text-text">{formatCurrency(quotation.subtotal)}</span>
              </div>
              {quotation.discountAmount > 0 && (
                <div className="flex justify-between text-destructive">
                  <span>Ưu đãi / Giảm giá:</span>
                  <span className="font-semibold">-{formatCurrency(quotation.discountAmount)}</span>
                </div>
              )}
              {quotation.shippingFee > 0 && (
                <div className="flex justify-between text-text-muted">
                  <span>Phí vận chuyển:</span>
                  <span className="font-semibold text-text">{formatCurrency(quotation.shippingFee)}</span>
                </div>
              )}
              <div className="flex justify-between text-title-sm font-extrabold text-primary border-t border-border pt-2">
                <span>Tổng thanh toán:</span>
                <span>{formatCurrency(quotation.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Terms & Conditions */}
          {quotation.terms && (
            <div className="p-4 rounded-xl border border-dashed border-border bg-surface-alt space-y-1.5">
              <div className="text-caption font-bold text-text-muted uppercase">
                Điều khoản & Ghi chú
              </div>
              <p className="text-caption text-text whitespace-pre-line leading-relaxed">
                {quotation.terms}
              </p>
            </div>
          )}

          {/* Contact note */}
          <div className="text-center pt-4 border-t border-border text-caption text-text-muted">
            Quý khách có nhu cầu phản hồi hoặc xác nhận báo giá, xin vui lòng liên hệ hotline cửa hàng.
          </div>
        </div>
      </div>
    </main>
  )
}
