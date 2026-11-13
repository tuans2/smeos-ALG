"use client"

import { Button } from "@/components/ui/button"
import React, { useState } from "react"
import { Hand, Heart, ShoppingBag } from "@/components/ui/icons"
import { useI18n } from "@/lib/i18n"
import { SWIPE_SIGNAL, type SwipeTheme } from "./swipe-themes"
import { JourneyContactForm } from "./journey-contact-form"
import { useOrderDraft } from "../../use-order-draft"

interface JourneyIntroProps {
  theme: SwipeTheme
  mode: "onboarding" | "resume"
  catalogName: string
  total: number
  /** Mẫu đã xem / đã thích — cho hộp hỏi tiếp tục */
  progress: { viewed: number; liked: number }
  initialCustomerName?: string | null | undefined
  promotionCta?: { enabled: boolean; percent: number } | undefined
  onStart: () => void
  onStartOver: () => void
}

/**
 * Hướng dẫn lần đầu mở link (2 chặng: Nhập thông tin -> Hướng dẫn siêu ngắn),
 * hoặc hỏi "Tiếp tục xem / Xem lại từ đầu" khi mở lại link.
 */
export function JourneyIntro({
  theme,
  mode,
  catalogName,
  total,
  progress,
  initialCustomerName,
  promotionCta,
  onStart,
  onStartOver,
}: JourneyIntroProps) {
  const { t } = useI18n()
  const { customerName, customerPhone, customerEmail, setContactInfo } = useOrderDraft()
  const [stage, setStage] = useState<"contact" | "guide">("contact")

  const panel = { background: theme.controlBg, borderColor: theme.controlBorder }

  // Chặng 1: Nhập Họ tên (bắt buộc), SĐT & Email (tùy chọn)
  if (mode === "onboarding" && stage === "contact") {
    return (
      <JourneyContactForm
        theme={theme}
        catalogName={catalogName}
        initialName={customerName || initialCustomerName || ""}
        initialPhone={customerPhone}
        initialEmail={customerEmail}
        promotionCta={promotionCta}
        onNext={(contact) => {
          setContactInfo({
            customerName: contact.name,
            customerPhone: contact.phone,
            customerEmail: contact.email,
          })
          setStage("guide")
        }}
      />
    )
  }

  const guideSteps = [
    { icon: Hand, color: SWIPE_SIGNAL.info, text: t("greetingCard.customer.journey.guideTouch") },
    { icon: Heart, color: SWIPE_SIGNAL.like, text: t("greetingCard.customer.journey.guideHeart") },
    { icon: ShoppingBag, color: SWIPE_SIGNAL.info, text: t("greetingCard.customer.journey.guideOrder") },
  ]

  const likedSuffix = progress.liked > 0
    ? t("greetingCard.customer.journey.likedText", { liked: progress.liked })
    : ""

  // Chặng 2 (Hướng dẫn siêu ngắn) hoặc Mở lại (Resume)
  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="journey-intro-title"
      className="flex flex-1 flex-col justify-center gap-5 py-6"
    >
      <div className="text-center">
        <span
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border shadow-2xs"
          style={{ ...panel, color: SWIPE_SIGNAL.like }}
        >
          <Hand size={26} aria-hidden="true" />
        </span>
        <h2 id="journey-intro-title" className="mt-3 text-title font-semibold" style={{ fontFamily: theme.font }}>
          {mode === "onboarding" ? catalogName : t("greetingCard.customer.journey.welcomeBack")}
        </h2>
        <p className="mt-1 text-body-sm" style={{ color: theme.stageMuted }}>
          {mode === "onboarding"
            ? t("greetingCard.customer.journey.itemsWaiting", { count: total })
            : t("greetingCard.customer.journey.progressText", { viewed: progress.viewed, total, likedText: likedSuffix })}
        </p>
      </div>

      {mode === "onboarding" && (
        <ul className="flex flex-col gap-2.5">
          {guideSteps.map(({ icon: Icon, color, text }) => (
            <li key={text} className="flex items-center gap-3 rounded-2xl border p-3.5 text-body font-medium shadow-2xs" style={panel}>
              <Icon size={20} color={color} aria-hidden="true" className="shrink-0" />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2">
        <Button variant="ghost"
          type="button"
          onClick={onStart}
          autoFocus
          className="px-0 py-0 gap-0 h-12 rounded-2xl text-body font-bold shadow-lg transition-transform active:scale-[0.98]"
          style={{ background: theme.ctaBg, color: theme.ctaText }}
        >
          {mode === "onboarding" ? t("greetingCard.customer.journey.start") : t("greetingCard.customer.journey.resume")}
        </Button>
        {mode === "resume" && (
          <Button variant="outline"
            type="button"
            onClick={onStartOver}
            className="px-0 py-0 gap-0 h-12 rounded-2xl border text-body-sm font-semibold transition-transform active:scale-[0.98]"
            style={{ borderColor: theme.controlBorder }}
          >
            {t("greetingCard.customer.journey.startOver")}
          </Button>
        )}
        {mode === "onboarding" && (
          <Button variant="ghost"
            type="button"
            onClick={() => setStage("contact")}
            className="h-auto p-0 font-[inherit] gap-0 mt-1 text-center text-caption underline opacity-75"
            style={{ color: theme.stageMuted }}
          >
            {t("greetingCard.customer.journey.editInfo")}
          </Button>
        )}
      </div>
    </section>
  )
}
