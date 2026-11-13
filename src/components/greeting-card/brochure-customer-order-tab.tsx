"use client"

import React, { useState } from "react"
import { Check, Copy } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { useApi } from "@/components/greeting-card/greeting-api"
import { OrderVatForm, type OrderVatData } from "./order-vat-form"
import { CopyProductImageButton } from "./copy-product-image-button"
import type { OrderSlipExtras } from "@/modules/greeting-card/domain/order-slip-extras"
import type { OrderDetailModalTarget } from "./brochure-order-detail-modal"
import { useSession } from "@/lib/session"
import { getIndustryTerminology, getIndustryOrderTerms } from "@/modules/organization/domain/industry-profile"
import {
  buildCustomerOrderSlipLines,
  buildCustomerOrderSlipText,
} from "@/modules/greeting-card/domain/customer-order-slip"

/** Thẻ Đơn Khách hàng — phiếu xác nhận đơn gửi khách (có giá bán, đã thu, còn lại). */
export function BrochureCustomerOrderTab({ target }: { target: OrderDetailModalTarget }) {
  const { organization } = useSession()
  const terms = getIndustryTerminology(organization?.industry)
  const orderTerms = getIndustryOrderTerms(organization?.industry)
  const [copied, setCopied] = useState(false)
  const { data, mutate } = useApi<{ data: OrderVatData & Partial<OrderSlipExtras> }>(target.orderId ? `/api/v1/greeting-card/orders/${target.orderId}/vat` : null)
  const vat = data?.data
  const slip = vat
    ? {
        ...target,
        totalVnd: vat.totalVnd,
        paidVnd: vat.paidVnd,
        balanceVnd: vat.balanceVnd,
        vatAmountVnd: vat.vatAmountVnd,
        vatRate: vat.vatRate,
        vatCompanyName: vat.companyName,
        vatTaxCode: vat.taxCode,
        vatCompanyAddress: vat.companyAddress,
        vatEmail: vat.email,
        productCode: vat.productCode,
        customerNote: vat.customerNote,
        deliveryNote: vat.deliveryNote,
      }
    : target
  const slipInput = {
    ...slip,
    sampleProductLabel: terms.sampleProduct,
    printablesTitle: terms.printablesTitle,
    deliveryTimeLabel: orderTerms.deliveryTimeLabel,
    customerLabel: orderTerms.customerRoleLabel,
    recipientLabel: orderTerms.recipientRoleLabel,
    addressLabel: orderTerms.addressLabel,
  }
  const groups = buildCustomerOrderSlipLines(slipInput)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildCustomerOrderSlipText(slipInput))
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch { /* Trình duyệt chặn clipboard — người dùng chép tay */ }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
        <div className="min-w-0">
          <span className="text-caption font-extrabold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            Thẻ Đơn Khách hàng
          </span>
          <p className="mt-1 text-caption text-text-muted">Gửi khách để xác nhận lại đơn, giá và lịch hẹn/giao.</p>
        </div>
        <div className="flex flex-wrap gap-2">
        <CopyProductImageButton imageUrl={vat?.productImageUrl ?? target.productImageUrl} driveLink={vat?.productDriveLink} />
        <Button type="button" variant="outline" size="sm" onClick={handleCopy} className="h-8 shrink-0 gap-1.5 whitespace-nowrap text-caption font-semibold text-text">
          {copied ? <Check size={13} className="text-primary" /> : <Copy size={13} />}
          <span>{copied ? "Đã chép text" : "Copy text Zalo"}</span>
        </Button>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-surface p-5 text-text shadow-md">
        <div className="border-b border-border/60 pb-3">
          <h3 className="text-body font-extrabold">Xác nhận đơn hàng #{target.orderCode || target.sendCode || "---"}</h3>
          {target.saleName && <p className="text-body-sm text-text-muted">Nhân viên tư vấn: <strong className="text-text">{target.saleName}</strong></p>}
        </div>
        {groups.map((group, i) => (
          <dl key={i} className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-3 gap-y-1 border-b border-dashed border-border/60 py-3 last:border-b-0 text-body-sm">
            {group.map((line) => (
              <React.Fragment key={line.label}>
                <dt className="text-text-muted">{line.label}:</dt>
                <dd className="min-w-0 font-semibold break-words [overflow-wrap:anywhere]">{line.value}</dd>
              </React.Fragment>
            ))}
          </dl>
        ))}
      </div>

      {vat && <OrderVatForm key={`${vat.vatEnabled}-${vat.vatRate}-${vat.totalVnd}`} vat={vat} onSaved={(next) => void mutate({ data: next }, { revalidate: false })} />}
    </div>
  )
}
