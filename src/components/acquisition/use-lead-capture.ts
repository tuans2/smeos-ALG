"use client"

import { useState } from "react"
import { TURNSTILE_SITE_KEY } from "./turnstile-widget"

/** Đọc `ref` (mã QR/link động) và UTM từ địa chỉ trang để ghi nguồn cho lead. */
function attribution(): { ref?: string; utm?: { source?: string; medium?: string; campaign?: string } } {
  if (typeof window === "undefined") return {}
  const q = new URLSearchParams(window.location.search)
  const pick = (k: string) => q.get(k) || undefined
  const utm = { source: pick("utm_source"), medium: pick("utm_medium"), campaign: pick("utm_campaign") }
  const clean = Object.fromEntries(Object.entries(utm).filter(([, v]) => v)) as Record<string, string>
  const ref = pick("ref")
  return { ...(ref ? { ref } : {}), ...(Object.keys(clean).length ? { utm: clean } : {}) }
}

export interface LeadFields {
  name: string
  phone: string
  consent: boolean
  /** Ô bẫy — người thật không thấy, máy tự điền */
  website: string
}

export function useLeadCapture(catalogSlug: string | undefined) {
  const [fields, setFields] = useState<LeadFields>({ name: "", phone: "", consent: false, website: "" })
  const [token, setToken] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = <K extends keyof LeadFields>(key: K, value: LeadFields[K]) => setFields((f) => ({ ...f, [key]: value }))

  const submit = async () => {
    if (!fields.consent) {
      setError("Vui lòng đồng ý để cửa hàng liên hệ lại.")
      return
    }
    // Xem trước trong trình soạn (chưa có link) → chỉ hiện trạng thái thành công.
    if (!catalogSlug) {
      setSubmitted(true)
      return
    }
    if (TURNSTILE_SITE_KEY && !token) {
      setError("Vui lòng chờ xác minh xong rồi gửi lại.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/public/catalog/${encodeURIComponent(catalogSlug)}/lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fields.name.trim(),
          phone: fields.phone.trim(),
          consent: fields.consent,
          website: fields.website,
          ...(token ? { verificationToken: token } : {}),
          ...attribution(),
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: { message?: string; details?: Record<string, unknown> } }
        const firstDetail = data.error?.details ? Object.values(data.error.details).find((v) => typeof v === "string") : undefined
        throw new Error((firstDetail as string | undefined) || data.error?.message || "Không gửi được thông tin, vui lòng thử lại.")
      }
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không gửi được thông tin, vui lòng thử lại.")
    } finally {
      setSubmitting(false)
    }
  }

  return { fields, update, setToken, submitted, submitting, error, submit }
}
