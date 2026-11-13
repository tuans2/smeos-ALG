"use client"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import React, { useState } from "react"
import { defaultInquiryMessage, INQUIRY_MESSAGE_MAX } from "@/modules/crm/domain/product-inquiry"
import { LEAD_CONSENT_TEXT } from "@/modules/acquisition/domain/lead-rules"
import { readApiError } from "@/components/greeting-card/api-error"

interface Props {
  /** API nhận tin: link bộ sưu tập hoặc link chào riêng */
  inquiryUrl: string
  product: { id: string; name: string }
  variantName?: string | null | undefined
}

const FIELD = "w-full rounded-lg border border-border bg-bg px-3 text-body text-text focus:outline-none focus:ring-2 focus:ring-primary/20"

/** Form nhắn tin cho cửa hàng → yêu cầu tư vấn trong mục Hội thoại + khách tiềm năng của tiệm. */
export function ProductInquiryForm({ inquiryUrl, product, variantName }: Props) {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [message, setMessage] = useState(() => defaultInquiryMessage(product.name, variantName))
  const [website, setWebsite] = useState("")
  const [consent, setConsent] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  if (sent) {
    return (
      <p role="status" className="rounded-xl bg-success-bg px-3 py-3 text-body-sm text-success">
        Cửa hàng đã nhận tin nhắn của bạn và sẽ liên hệ lại qua số {phone} sớm nhất.
      </p>
    )
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!consent) return setErrors({ consent: "Vui lòng đồng ý để cửa hàng liên hệ lại" })
    setSending(true)
    setErrors({})
    try {
      const res = await fetch(inquiryUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, customerName: name, customerPhone: phone, message, consent, website, ...(variantName ? { variantName } : {}) }),
      })
      if (res.ok) return setSent(true)
      // Lỗi theo trường (400) hiện dưới từng ô; lỗi khác (gửi dồn, mẫu không còn) hiện chung
      const body = (await res.clone().json().catch(() => null)) as { error?: { details?: Record<string, string> } } | null
      const details = body?.error?.details
      setErrors(details && Object.keys(details).length > 0 ? details : { form: await readApiError(res, "Chưa gửi được, vui lòng thử lại.") })
    } catch {
      setErrors({ form: "Mạng không ổn định, vui lòng thử lại." })
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 rounded-xl border border-border p-3" noValidate>
      <label className="flex flex-col gap-1">
        <span className="text-caption font-bold text-text">Tên của bạn</span>
        <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={`${FIELD} h-10`} />
        {errors.customerName && <span className="text-caption text-danger">{errors.customerName}</span>}
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-caption font-bold text-text">Số điện thoại</span>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" className={`${FIELD} h-10`} />
        {errors.customerPhone && <span className="text-caption text-danger">{errors.customerPhone}</span>}
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-caption font-bold text-text">Bạn cần tư vấn gì?</span>
        <Textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={INQUIRY_MESSAGE_MAX} rows={3} className={`${FIELD} py-2`} />
        {errors.message && <span className="text-caption text-danger">{errors.message}</span>}
      </label>
      <label className="flex items-start gap-2 text-caption text-text-muted">
        <Checkbox className="mt-0.5" checked={consent} onCheckedChange={(checked) => setConsent(checked === true)} disabled={sending} />
        <span>{LEAD_CONSENT_TEXT}</span>
      </label>
      {errors.consent && <span className="text-caption text-danger">{errors.consent}</span>}
      {/* Ô bẫy: người thật không thấy, máy tự điền */}
      <Input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" value={website} onChange={(e) => setWebsite(e.target.value)} className="hidden" />
      {errors.form && <span className="text-caption text-danger">{errors.form}</span>}
      <Button variant="primary" type="submit" disabled={sending} className="px-0 py-0 text-[length:inherit] gap-0 h-11 rounded-xl bg-primary font-bold text-white disabled:opacity-50 hover:bg-primary">
        {sending ? "Đang gửi…" : "Gửi tin nhắn"}
      </Button>
    </form>
  )
}
