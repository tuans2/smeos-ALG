"use client"

import { Checkbox } from "@/components/ui/checkbox"
import React from "react"
import { Gift, Camera, Clock, CheckCircle2, ArrowRight, Loader2 } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TurnstileWidget } from "@/components/acquisition/turnstile-widget"
import { useLeadCapture } from "@/components/acquisition/use-lead-capture"
import { LEAD_CONSENT_TEXT } from "@/modules/acquisition/domain/lead-rules"

interface LandingTemplateLeadProps {
  archetypeId: string
  occasionTitle?: string
  /** Slug của catalog đang xem — dùng để gọi API lưu lead */
  catalogSlug?: string | undefined
  /** Nội dung khối do AI/mẫu soạn — ưu đãi chỉ có khi tiệm bật trong Hồ sơ tiệm */
  lead?: { tag?: string; title?: string; description?: string } | undefined
}

export function LandingTemplateLead({
  archetypeId,
  occasionTitle,
  catalogSlug,
  lead,
}: LandingTemplateLeadProps) {
  const { fields, update, setToken, submitted, submitting, error: submitError, submit } = useLeadCapture(catalogSlug)

  const isLuxury = archetypeId === "minimal-luxury"
  const isRomantic = archetypeId === "pastel-romantic"
  const isFestive = archetypeId === "festive-sale"
  const isModern = archetypeId === "modern-split"

  const containerStyle = isLuxury
    ? "bg-surface-alt/60 text-text border-primary/30 rounded-3xl p-6 sm:p-8 shadow-md"
    : isFestive
    ? "bg-primary/10/15 text-text border-2 border-primary/40 rounded-2xl p-6 sm:p-7 shadow-md"
    : isRomantic
    ? "bg-surface-alt/70 text-text border-primary/20 rounded-3xl p-6 sm:p-7 shadow-xs"
    : isModern
    ? "bg-surface text-text border-2 border-border rounded-xl p-6 sm:p-7 shadow-sm"
    : "bg-surface text-text border-border rounded-3xl p-5 sm:p-6 shadow-sm"

  const titleFont = isLuxury
    ? "font-display text-title sm:text-display font-normal"
    : isFestive
    ? "font-semibold text-title sm:text-display text-primary"
    : isModern
    ? "font-semibold text-title sm:text-display"
    : "font-semibold text-title sm:text-title-lg"

  const badgeStyle = isLuxury
    ? "bg-primary/10 text-primary border border-primary/20 rounded-full font-display uppercase tracking-widest text-caption"
    : isFestive
    ? "bg-primary text-primary-foreground rounded-md uppercase font-semibold tracking-wide text-caption shadow-xs"
    : isRomantic
    ? "bg-primary/10 text-primary rounded-full font-bold text-caption"
    : "bg-surface-alt text-text border border-border rounded-md font-mono uppercase text-caption"

  const buttonStyle = isLuxury
    ? "bg-primary hover:bg-primary-dark text-primary-foreground rounded-full font-display px-6"
    : isFestive
    ? "bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold px-5 shadow-sm"
    : isRomantic
    ? "bg-primary hover:bg-primary-dark text-primary-foreground rounded-full font-bold px-5"
    : isModern
    ? "bg-text text-surface hover:bg-text/90 rounded-lg font-bold px-5"
    : "bg-primary hover:bg-primary-dark text-primary-foreground font-semibold px-4"

  const inputStyle = `h-10 text-caption bg-surface text-text border-border ${isLuxury ? "rounded-full px-4" : isModern ? "rounded-lg" : "rounded-xl"}`

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void submit()
  }

  return (
    <div className={`border space-y-4 sm:space-y-5 ${containerStyle}`}>
      <div className="text-center max-w-md mx-auto space-y-2">
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 ${badgeStyle}`}>
          <Gift size={12} className="shrink-0" />
          <span>{lead?.tag || "Đặt trước"}</span>
        </div>
        <h3 className={`tracking-tight leading-snug ${titleFont}`}>
          {lead?.title || "Để lại số điện thoại để được tư vấn mẫu"}
        </h3>
        <p className={`text-caption sm:text-body-sm text-text-muted leading-relaxed ${isLuxury ? "font-display italic" : ""}`}>
          {lead?.description || `Tiệm sẽ liên hệ lại để tư vấn và giữ mẫu${occasionTitle ? ` cho "${occasionTitle}"` : ""}.`}
        </p>
      </div>

      {submitted ? (
        <div className="p-4 rounded-2xl bg-success/10 border border-success/30 text-success text-center space-y-1 animate-in fade-in">
          <div className="flex items-center justify-center gap-1.5 text-caption font-bold">
            <CheckCircle2 size={16} />
            <span>Cửa hàng đã nhận thông tin của bạn!</span>
          </div>
          <p className="text-caption text-text">
            Tiệm sẽ liên hệ lại qua Zalo để xác nhận mẫu cho bạn.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <form onSubmit={handleSubmit} className="max-w-sm mx-auto flex flex-col gap-2">
            <Input
              placeholder="Tên của bạn"
              value={fields.name}
              onChange={(e) => update("name", e.target.value)}
              className={inputStyle}
              autoComplete="name"
              required
              disabled={submitting}
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="tel"
                placeholder="Số điện thoại Zalo"
                value={fields.phone}
                onChange={(e) => update("phone", e.target.value)}
                className={inputStyle}
                autoComplete="tel"
                required
                disabled={submitting}
              />
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className={`h-10 text-caption shrink-0 flex items-center justify-center gap-1.5 shadow-xs ${buttonStyle}`}
              >
                {submitting ? (
                  <Loader2 size={13} className="animate-spin motion-reduce:animate-none" />
                ) : (
                  <>
                    <span>Tư vấn ngay</span>
                    <ArrowRight size={13} />
                  </>
                )}
              </Button>
            </div>
            {/* Ô bẫy: ẩn với người thật, máy tự điền sẽ bị từ chối */}
            <Input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="hidden"
              value={fields.website}
              onChange={(e) => update("website", e.target.value)}
            />
            <label className="flex items-start gap-2 text-left text-caption text-text-muted">
              <Checkbox
                className="mt-0.5 accent-primary"
                checked={fields.consent}
                onCheckedChange={(checked) => update("consent", (checked === true))}
                required
                disabled={submitting}
              />
              <span>{LEAD_CONSENT_TEXT}</span>
            </label>
            <TurnstileWidget onToken={setToken} />
          </form>
          {submitError && (
            <p className="text-center text-caption text-primary mt-1">{submitError}</p>
          )}
        </div>
      )}

      {/* 3 điểm dịch vụ trung tính — không cam kết khi tiệm chưa khai */}
      <div className={`pt-3 border-t border-border/50 grid grid-cols-3 gap-2 text-caption text-text-muted text-center ${isLuxury ? "font-display" : ""}`}>
        <div className="flex flex-col items-center gap-1">
          <Camera size={14} className={isFestive ? "text-primary" : "text-warning-text"} />
          <span className="font-medium">Xem mẫu thật</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Clock size={14} className="text-primary" />
          <span className="font-medium">Giao tận nơi</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <CheckCircle2 size={14} className="text-success" />
          <span className="font-medium">Kèm lời chúc</span>
        </div>
      </div>
    </div>
  )
}

