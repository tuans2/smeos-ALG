"use client"

import { Button } from "@/components/ui/button"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Heart, Info } from "@/components/ui/icons"
import type { GreetingCatalogProduct } from "@/modules/greeting-card/domain/greeting-card-types"
import { EnterpriseSpecSheet } from "./enterprise-spec-sheet"
import { SwipeCard } from "./swipe/swipe-card"
import { productPriceText } from "./product-info/product-display"
import { SwipeDeckEnd } from "./swipe/swipe-deck-end"
import { SWIPE_SIGNAL, getSwipeTheme, isLightTheme } from "./swipe/swipe-themes"
import { useStoryNav } from "./swipe/use-story-nav"
import { rootHeight, useEmbeddedPreview } from "./aux/embedded"
import { useSwipeJourney } from "./swipe/use-swipe-journey"
import { useSavedState } from "../use-saved-state"
import { JourneyIntro } from "./swipe/journey-intro"
import { UnavailablePanel } from "./swipe/unavailable-panel"
import { useCustomerJourney } from "../journey-context"
import { filterSwipeDeck, findMood, moodsOf } from "./aux/catalog-filters"
import { SwipeColorFilter } from "./swipe/swipe-color-filter"
import { customDesignMessage, findPriceRange, inPriceRange, priceRangesOf, productInquiryMessage } from "@/modules/greeting-card/domain/collection-browse"

interface SwipeBrochureEngineProps {
  products: GreetingCatalogProduct[]
  catalogName: string
  selectedProductId: string | null
  initialCustomerName?: string | null | undefined
  promotionCta?: { enabled: boolean; percent: number } | undefined
  onSelectProduct: (product: GreetingCatalogProduct) => void
  /** Số kiểu ("01"…"12") hoặc id mẫu */
  styleKey?: string
}

function RoundButton(props: {
  label: string
  color: string
  size: "sm" | "lg"
  bg: string
  border: string
  disabled?: boolean
  /** Nút bật/tắt (tim) — báo trạng thái cho trình đọc màn hình */
  pressed?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  const dim = props.size === "lg" ? "h-16 w-16" : "h-12 w-12"
  return (
    <Button variant="outline"
      type="button"
      aria-label={props.label}
      title={props.label}
      disabled={props.disabled}
      aria-pressed={props.pressed}
      onClick={props.onClick}
      className={`text-[length:inherit] h-auto p-0 font-[inherit] gap-0 ${dim} flex items-center justify-center rounded-full border shadow-[0_6px_20px_rgba(0,0,0,0.18)] transition-transform hover:scale-105 active:scale-90 disabled:pointer-events-none disabled:opacity-35`}
      style={{ color: props.color, background: props.bg, borderColor: props.border }}
    >
      {props.children}
    </Button>
  )
}

/**
 * Xem bộ sưu tập kiểu Facebook Story cho 12 kiểu giao diện (PO 07/10/2026): chạm 2/3 phải hoặc
 * vuốt sang trái = mẫu sau, chạm 1/3 trái hoặc vuốt sang phải = mẫu trước. Chi tiết chỉ mở bằng
 * nút ⓘ; tim bật/tắt trên mẫu đang xem (cộng vào tổng tim của bộ sưu tập). Hướng dẫn lần đầu và
 * hỏi tiếp tục khi mở lại link.
 */
export function SwipeBrochureEngine({
  products,
  catalogName,
  selectedProductId,
  initialCustomerName,
  promotionCta,
  onSelectProduct,
  styleKey = "01",
}: SwipeBrochureEngineProps) {
  const embedded = useEmbeddedPreview()
  const theme = useMemo(() => getSwipeTheme(styleKey), [styleKey])
  const light = isLightTheme(theme)
  const contact = useCustomerJourney()
  // Lọc theo khoảng giá (khách chưa ưng mẫu nào ở màn cuối)
  const [priceKey, setPriceKey] = useSavedState<string | null>(embedded ? "preview-price-filter" : "price-filter", null)
  const range = findPriceRange(priceKey)
  // Lọc theo tông màu (ALG 5.9) — cùng dữ liệu màu với mẫu Bảng màu
  const moods = useMemo(() => moodsOf(products), [products])
  const [moodKey, setMoodKey] = useSavedState<string | null>(embedded ? "preview-color-filter" : "color-filter", null)
  const mood = moods.some((m) => m.id === moodKey) ? findMood(moodKey) : null
  const visible = useMemo(
    () => filterSwipeDeck(products, { mood, inRange: range ? (p) => inPriceRange(p.price, range) : null }),
    [products, mood, range],
  )
  // Tim / mẫu đang xem nhớ trên máy khách: tải lại, Back hay mở lại link vẫn giữ nguyên
  const j = useSwipeJourney(visible, catalogName, embedded)
  const { index, current, liked } = j
  const [inspect, setInspect] = useState<GreetingCatalogProduct | null>(null)
  const [savedToast, setSavedToast] = useState(0)

  useEffect(() => {
    if (!savedToast) return
    const t = window.setTimeout(() => setSavedToast(0), 1400)
    return () => window.clearTimeout(t)
  }, [savedToast])

  const nav = useStoryNav({ onNext: j.next, onPrevious: j.previous, disabled: !current || j.prompt !== null })

  const toggleHeart = useCallback(() => {
    if (j.toggleLike()) setSavedToast(Date.now())
  }, [j])

  const askAbout = contact
    ? (p: GreetingCatalogProduct) => contact.contactZalo(productInquiryMessage(p), p.id)
    : undefined

  // Bàn phím: ← mẫu trước, → mẫu sau, Enter/↑ chi tiết, L thả tim
  useEffect(() => {
    if (embedded) return
    function onKey(e: KeyboardEvent) {
      if (inspect || j.prompt || (e.target instanceof HTMLElement && /INPUT|TEXTAREA/.test(e.target.tagName))) return
      if (e.key === "ArrowLeft") j.previous()
      else if (e.key === "ArrowRight") j.next()
      else if (e.key.toLowerCase() === "l" && current) toggleHeart()
      else if ((e.key === "ArrowUp" || e.key === "Enter") && current) setInspect(current)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [current, inspect, embedded, j, toggleHeart])

  // Tải trước ảnh của 2 thẻ kế tiếp
  useEffect(() => {
    for (const p of visible.slice(index + 1, index + 3)) {
      if (p.imageUrl) new Image().src = p.imageUrl
    }
  }, [index, visible])

  const stageStyle = { background: theme.stage, color: theme.stageText }

  if (products.length === 0) {
    return (
      <div className={`flex ${rootHeight(embedded)} w-full items-center justify-center p-6 text-center`} style={stageStyle}>
        <p className="text-body">Bộ sưu tập này chưa có sản phẩm nào.</p>
      </div>
    )
  }

  const soldOut = current?.available === false
  // Trang khách đứng riêng: khối ngoài cùng là vùng nội dung chính; khi nhúng xem trước thì shell đã có <main>
  const Stage = embedded ? "div" : "main"

  return (
    <Stage className={`flex ${embedded ? "h-full" : "min-h-dvh"} w-full flex-col items-center`} style={stageStyle}>
      <div className="flex w-full max-w-[440px] flex-1 flex-col px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-3">
        <div className="flex items-center justify-between px-1 pb-3">
          <h1 className="truncate text-body font-semibold" style={{ fontFamily: theme.font }}>{catalogName}</h1>
          <span className="shrink-0 text-caption tabular-nums" style={{ color: theme.stageMuted }}>
            {Math.min(index + 1, visible.length)} / {visible.length}
          </span>
        </div>
        {range && (
          <p className="flex items-center justify-between px-1 pb-2 text-caption" style={{ color: theme.stageMuted }}>
            <span>Đang xem mẫu {range.label.toLowerCase()}</span>
            <Button variant="ghost" type="button" className="text-[length:inherit] h-auto p-0 gap-0 font-semibold underline" onClick={() => setPriceKey(null)}>
              Xem tất cả
            </Button>
          </p>
        )}

        {!j.prompt && (
          <SwipeColorFilter
            moods={moods}
            activeId={mood?.id ?? null}
            theme={theme}
            onPick={(id) => {
              setMoodKey(id)
              j.restart()
            }}
          />
        )}

        {j.prompt && j.state ? (
          <JourneyIntro
            theme={theme}
            mode={j.prompt}
            catalogName={catalogName}
            total={visible.length}
            progress={{ viewed: j.state.viewedProductIds.length, liked: liked.length }}
            initialCustomerName={initialCustomerName}
            promotionCta={promotionCta}
            onStart={j.start}
            onStartOver={j.startOver}
          />
        ) : current ? (
          <>
            <div className={`relative flex-1 ${embedded ? "min-h-0" : "min-h-[420px]"}`} style={{ maxHeight: 680 }}>
              <div key={current.id} className="absolute inset-0 z-10 cursor-pointer" style={nav.style} {...nav.handlers}>
                <SwipeCard product={current} theme={theme} index={index} total={visible.length} onInfo={() => setInspect(current)} />
              </div>
              {savedToast > 0 && (
                <p role="status" className="pointer-events-none absolute inset-x-0 top-1/2 z-20 mx-auto w-fit rounded-full px-4 py-2 text-body-sm font-bold shadow-lg" style={{ background: theme.ctaBg, color: theme.ctaText }}>
                  ♥ Đã thả tim
                </p>
              )}
            </div>

            <div className="flex items-center justify-center gap-3 pt-4" role="group" aria-label="Điều khiển thẻ">
              <RoundButton label="Mẫu trước" color={theme.stageText} size="sm" bg={theme.controlBg} border={theme.controlBorder} disabled={!j.canGoBack} onClick={j.previous}>
                <ChevronLeft size={22} strokeWidth={2.5} />
              </RoundButton>
              <RoundButton label="Xem chi tiết" color={SWIPE_SIGNAL.info} size="sm" bg={theme.controlBg} border={theme.controlBorder} onClick={() => setInspect(current)}>
                <Info size={20} strokeWidth={2.5} />
              </RoundButton>
              <RoundButton label={j.isLiked(current.id) ? "Bỏ tim" : "Thả tim"} pressed={j.isLiked(current.id)} color={SWIPE_SIGNAL.like} size="lg" bg={theme.controlBg} border={theme.controlBorder} onClick={toggleHeart}>
                <Heart size={28} strokeWidth={2.5} fill={j.isLiked(current.id) ? "currentColor" : "none"} />
              </RoundButton>
              <RoundButton label="Mẫu sau" color={theme.stageText} size="sm" bg={theme.controlBg} border={theme.controlBorder} onClick={j.next}>
                <ChevronRight size={22} strokeWidth={2.5} />
              </RoundButton>
            </div>

            {soldOut ? (
              <div className="pt-4">
                <UnavailablePanel theme={theme} product={current} products={visible} onJump={j.jumpTo} onContact={askAbout && (() => askAbout(current))} />
              </div>
            ) : (
            <div className="flex items-center gap-2 pt-4">
                {liked.length > 0 && (
                  <span
                    className="flex h-12 shrink-0 items-center gap-1.5 rounded-2xl border px-3 text-body-sm font-semibold"
                    style={{ borderColor: light ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.2)" }}
                    aria-label={`Đã thích ${liked.length} mẫu`}
                  >
                    <Heart size={16} fill={SWIPE_SIGNAL.like} color={SWIPE_SIGNAL.like} aria-hidden="true" />
                    {liked.length}
                  </span>
                )}
                <Button variant="ghost"
                  type="button"
                  onClick={() => onSelectProduct(current)}
                  className="py-0 flex h-12 min-w-0 flex-1 items-center justify-between gap-3 rounded-2xl px-5 text-body font-bold shadow-lg transition-transform active:scale-[0.98]"
                  style={{ background: theme.ctaBg, color: theme.ctaText }}
                >
                  <span>{selectedProductId === current.id ? "Đã chọn mẫu này" : "Đặt mẫu này"}</span>
                  <span className="tabular-nums opacity-90">{productPriceText(current)}</span>
                </Button>
              </div>
            )}
          </>
        ) : (
          <SwipeDeckEnd
            theme={theme}
            liked={liked}
            total={visible.length}
            onOrder={onSelectProduct}
            onRestart={j.restart}
            onRewind={j.previous}
            priceRanges={priceRangesOf(products)}
            onPickPriceRange={(key) => {
              setPriceKey(key)
              j.restart()
            }}
            onAskZalo={contact?.shop.zaloUrl ? () => contact.contactZalo(`Tôi đang xem bộ sưu tập "${catalogName}" và cần shop tư vấn thêm.`) : undefined}
            onCustomDesign={contact?.shop.zaloUrl ? () => contact.contactZalo(customDesignMessage(catalogName)) : undefined}
          />
        )}
      </div>

      {inspect && (
        <EnterpriseSpecSheet
          product={inspect}
          isOpen
          onClose={() => setInspect(null)}
          onSelectProduct={(p) => {
            setInspect(null)
            onSelectProduct(p)
          }}
        />
      )}
    </Stage>
  )
}
