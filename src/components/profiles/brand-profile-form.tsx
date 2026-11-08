"use client"

import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import React, { useState, useEffect } from "react"
import { Type, Sparkles, ShieldAlert, Check, MessageSquareQuote, CheckCircle2 } from "@/components/ui/icons"
import type { BrandProfileDetail } from "@/modules/profiles/use-cases/get-brand-profile"
import type { UpsertBrandProfileInput } from "@/modules/profiles/domain/repositories/brand-profile-repository.interface"
import { isValidHexColor } from "@/modules/profiles/domain/profile-rules"
import { BrandColorsSection, type BrandColors } from "./brand-colors-section"
import { BrandSloganField } from "./brand-slogan-field"
import { FLORIST_TONE_OPTIONS, FLORIST_FORBIDDEN_GROUPS } from "@/modules/profiles/domain/florist-advisor-catalog"
import { AiRewriteInput } from "./ai-rewrite-input"

export interface BrandProfileFormProps {
  initialData: BrandProfileDetail | null
  onSave: (data: UpsertBrandProfileInput) => Promise<boolean>
  saving: boolean
}

const FONT_OPTIONS = [
  { label: "Inter (Hiện đại, rõ nét)", value: "Inter" },
  { label: "Playfair Display (Sang trọng, cổ điển)", value: "Playfair Display" },
  { label: "Montserrat (Mạnh mẽ, phong cách)", value: "Montserrat" },
  { label: "Merriweather (Thanh lịch, dễ đọc)", value: "Merriweather" },
  { label: "Lora (Thơ mộng, nghệ thuật)", value: "Lora" },
]

export function BrandProfileForm({ initialData, onSave, saving }: BrandProfileFormProps) {
  const [colors, setColors] = useState<BrandColors>({
    primary_color: "#e11d48",
    secondary_color: "#fda4af",
    accent_color: "#f59e0b",
    background_color: "#ffffff",
    text_color: "#111827",
  })
  const [fontHeading, setFontHeading] = useState("Playfair Display")
  const [fontBody, setFontBody] = useState("Inter")
  const [toneOfVoice, setToneOfVoice] = useState("romantic")
  const [slogan, setSlogan] = useState("")
  const [hashtagsText, setHashtagsText] = useState("#hoatuoi, #tiemhoa, #hoathietke, #hoasinhnhat")
  const [ctaText, setCtaText] = useState("Ghé thăm cửa hàng hoặc nhắn Zalo để được nghệ nhân tư vấn riêng!")
  const [forbiddenWords, setForbiddenWords] = useState("hoa rẻ, xả hàng tồn, phá giá")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    if (initialData) {
      setColors({
        primary_color: initialData.primary_color || "#e11d48",
        secondary_color: initialData.secondary_color || "#fda4af",
        accent_color: initialData.accent_color || "#f59e0b",
        background_color: initialData.background_color || "#ffffff",
        text_color: initialData.text_color || "#111827",
      })
      setFontHeading(initialData.font_heading || "Playfair Display")
      setFontBody(initialData.font_body || "Inter")
      setToneOfVoice(initialData.tone_of_voice || "romantic")
      setSlogan(initialData.slogan ?? "")

      if (initialData.hashtags) {
        const tags = Array.isArray(initialData.hashtags)
          ? initialData.hashtags
          : (initialData.hashtags as { default?: string[] } | null)?.default || []
        if (Array.isArray(tags) && tags.length > 0) {
          setHashtagsText(tags.join(", "))
        }
      }

      if (initialData.cta_templates) {
        const cta = (initialData.cta_templates as { default?: string } | null)?.default || ""
        if (cta) setCtaText(cta)
      }

      if (initialData.forbidden_styles) {
        const banned = (initialData.forbidden_styles as { banned_words?: string[] } | null)?.banned_words || []
        if (Array.isArray(banned) && banned.length > 0) {
          setForbiddenWords(banned.join(", "))
        }
      }
    }
  }, [initialData])

  const handleColorChange = (key: keyof BrandColors, val: string) => {
    setColors((prev) => ({ ...prev, [key]: val }))
    if (errors[key] && isValidHexColor(val)) {
      setErrors((prev) => {
        const clone = { ...prev }
        delete clone[key]
        return clone
      })
    }
  }

  const handleToggleForbiddenGroup = (words: string[]) => {
    const currentList = forbiddenWords
      .split(",")
      .map((w) => w.trim())
      .filter((w) => w.length > 0)

    const allPresent = words.every((w) => currentList.includes(w))
    let nextList: string[]
    if (allPresent) {
      nextList = currentList.filter((w) => !words.includes(w))
    } else {
      const merged = new Set([...currentList, ...words])
      nextList = Array.from(merged)
    }
    setForbiddenWords(nextList.join(", "))
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    for (const [key, val] of Object.entries(colors)) {
      if (val && !isValidHexColor(val)) {
        errs[key] = "Mã màu phải có dạng #RGB hoặc #RRGGBB"
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate() || !initialData) return

    const hashtagsList = hashtagsText.split(",").map((t) => t.trim()).filter((t) => t.length > 0)

    const bannedList = forbiddenWords
      .split(",")
      .map((w) => w.trim())
      .filter((w) => w.length > 0)

    const payload: UpsertBrandProfileInput = {
      primary_color: colors.primary_color,
      secondary_color: colors.secondary_color,
      accent_color: colors.accent_color,
      background_color: colors.background_color,
      text_color: colors.text_color,
      font_heading: fontHeading,
      font_body: fontBody,
      logo_asset_id: initialData.logo_asset_id,
      brand_assets: initialData.brand_assets,
      tone_of_voice: toneOfVoice,
      hashtags: { default: hashtagsList },
      cta_templates: { default: ctaText.trim() },
      forbidden_styles: { banned_words: bannedList },
      default_offers: initialData.default_offers,
      slogan: slogan.trim() || null,
    }

    const ok = await onSave(payload)
    if (ok) {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    }
  }

  const currentTone = FLORIST_TONE_OPTIONS.find((t) => t.value === toneOfVoice) || FLORIST_TONE_OPTIONS[0]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Khối 1: Bảng 5 mã màu thương hiệu */}
      <BrandColorsSection
        colors={colors}
        errors={errors}
        onColorChange={handleColorChange}
        onResetDefault={() =>
          setColors({
            primary_color: "#e11d48",
            secondary_color: "#fda4af",
            accent_color: "#f59e0b",
            background_color: "#ffffff",
            text_color: "#111827",
          })
        }
      />

      <BrandSloganField value={slogan} onChange={setSlogan} />
      {/* Khối 2: Typography & Phông chữ thương hiệu */}
      <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-2.5 pb-4 border-b border-border mb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-info/10 text-info">
            <Type size={18} />
          </div>
          <div>
            <h3 className="text-body font-bold text-text">Kiểu chữ nhận diện (Typography)</h3>
            <p className="text-caption text-text-muted">Định hình phong thái truyền thông qua phông chữ tiêu đề và nội dung</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-caption font-semibold text-text mb-1.5" htmlFor="brand-font-heading">
              Phông chữ tiêu đề
            </label>
            <NativeSelect id="brand-font-heading"
              value={fontHeading}
              onChange={(e) => setFontHeading(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-body-sm text-text transition-all focus:border-primary focus:outline-none"
            >
              {FONT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div>
            <label className="block text-caption font-semibold text-text mb-1.5" htmlFor="brand-font-body">
              Phông chữ nội dung
            </label>
            <NativeSelect id="brand-font-body"
              value={fontBody}
              onChange={(e) => setFontBody(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-body-sm text-text transition-all focus:border-primary focus:outline-none"
            >
              {FONT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>
      </div>

      {/* Khối 3: Giọng văn thương hiệu & Rào chắn nội dung AI */}
      <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-2.5 pb-4 border-b border-border mb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-warning/10 text-warning-text">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="text-body font-bold text-text">Giọng văn AI & giới hạn nội dung thương hiệu</h3>
            <p className="text-caption text-text-muted">Giữ đúng phong cách và từ ngữ khi AI viết bài tiếp thị và tư vấn khách</p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Dropdown Tông giọng */}
          <div>
            <label className="block text-body-sm font-bold text-text mb-1.5" htmlFor="brand-tone">
              Định vị Tông giọng Trợ lý AI
            </label>
            <NativeSelect id="brand-tone"
              value={toneOfVoice}
              onChange={(e) => setToneOfVoice(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-body-sm text-text transition-all focus:border-primary focus:outline-none"
            >
              {FLORIST_TONE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} — {opt.tagline}
                </option>
              ))}
            </NativeSelect>

            {/* Trích dẫn mẫu câu thoại minh họa */}
            {currentTone && (
              <div className="mt-2.5 rounded-xl border border-border bg-surface-alt/60 p-3.5 flex items-start gap-2.5">
                <MessageSquareQuote size={18} className="text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="text-caption font-bold text-text mb-0.5">Minh họa câu thoại AI sẽ xưng hô với khách:</div>
                  <div className="text-caption text-text-muted italic leading-relaxed">
                    "{currentTone.exampleDialog}"
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-caption font-semibold text-text mb-1.5">
              Bộ Hashtags mặc định (phân cách bằng dấu phẩy)
            </label>
            <Input
              type="text"
              value={hashtagsText}
              onChange={(e) => setHashtagsText(e.target.value)}
              placeholder="#hoatuoi, #tiemhoa, #hoathietke"
              className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-body-sm text-text transition-all focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <AiRewriteInput
              value={ctaText}
              onChange={setCtaText}
              placeholder="Nhắn tin ngay cho tiệm để nhận ưu đãi chế tác theo yêu cầu"
              fieldType="cta"
              label="Mẫu câu kêu gọi hành động mặc định (Default Call-to-Action)"
              helperText="Tự động gắn vào cuối các bài viết tạo bởi AI và tin nhắn chăm sóc khách hàng"
            />
          </div>

          {/* Rào chắn từ cấm */}
          <div className="pt-2 border-t border-border">
            <div className="flex items-center gap-1.5 mb-2">
              <ShieldAlert size={16} className="text-warning" />
              <label className="text-body-sm font-bold text-text">
                Rào chắn từ ngữ cấm kỵ (AI Guardrails)
              </label>
            </div>
            <p className="text-caption text-text-muted mb-3">
              Tick chọn nhanh các nhóm từ cấm chuẩn ngành hoa hoặc tự gõ thêm từ cấm riêng của tiệm:
            </p>

            {/* Checkbox nhóm từ cấm */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3">
              {FLORIST_FORBIDDEN_GROUPS.map((grp) => {
                const wordsList = forbiddenWords.split(",").map((w) => w.trim())
                const isSelected = grp.words.every((w) => wordsList.includes(w))

                return (
                  <Button variant="outline"
                    key={grp.id}
                    type="button"
                    onClick={() => handleToggleForbiddenGroup(grp.words)}
                    className={`text-[length:inherit] h-auto justify-start font-[inherit] gap-0 rounded-xl border p-3 text-left transition-all ${
                      isSelected
                        ? "border-warning bg-warning/10 hover:bg-warning/10"
                        : "border-border bg-surface-alt/40 hover:border-warning/50 hover:bg-surface-alt/40"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-caption font-bold text-text">{grp.title}</span>
                      <div
                        className={`h-3.5 w-3.5 rounded border flex items-center justify-center ${
                          isSelected ? "border-warning bg-warning text-white" : "border-border"
                        }`}
                      >
                        {isSelected && <Check size={10} strokeWidth={3} />}
                      </div>
                    </div>
                    <div className="text-caption text-text-muted leading-tight">
                      {grp.words.slice(0, 3).join(", ")}...
                    </div>
                  </Button>
                )
              })}
            </div>

            <Input
              type="text"
              value={forbiddenWords}
              onChange={(e) => setForbiddenWords(e.target.value)}
              placeholder="hoa rẻ, phá giá, xả hàng tồn, chặt chém..."
              className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-body-sm text-text transition-all focus:border-primary focus:outline-none"
            />
            <p className="mt-1 text-caption text-text-muted">
              AI Gateway sẽ tự động chặn và lọc bỏ tuyệt đối các từ ngữ này trong mọi bài viết và câu tư vấn
            </p>
          </div>
        </div>
      </div>

      {/* Nút lưu ở chân form */}
      <div className="flex justify-end pt-2">
        <Button variant="primary"
          type="submit"
          disabled={saving}
          className="h-auto inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-body-sm font-bold text-white shadow-xs transition-opacity hover:opacity-95 disabled:opacity-50 hover:bg-primary"
        >
          {saving ? (
            <span>Đang lưu...</span>
          ) : saveSuccess ? (
            <>
              <CheckCircle2 size={16} className="text-white" />
              <span>Đã lưu nhận diện thành công!</span>
            </>
          ) : (
            <>
              <Check size={16} />
              <span>Lưu nhận diện thương hiệu</span>
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
