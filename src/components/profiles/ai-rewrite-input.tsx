"use client"

import React, { useState } from "react"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { Check } from "@/components/ui/icon-set/check"
import { ArrowRight } from "@/components/ui/icon-set/arrow-right"
import { Wand2 } from "@/components/ui/icon-set/wand2"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { rewriteBlockedMessage } from "@/lib/ai-rewrite-error"

export interface AiRewriteInputProps {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  fieldType?: "gift" | "guarantee" | "cta" | "description" | "general"
  label?: string
  helperText?: string
  onAddCustom?: () => void
  addButtonText?: string
}

export function AiRewriteInput({
  value,
  onChange,
  placeholder = "Nhập nội dung...",
  fieldType = "general",
  label,
  helperText,
  onAddCustom,
  addButtonText = "Thêm",
}: AiRewriteInputProps) {
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedStyle, setSelectedStyle] = useState<"luxurious" | "sweet" | "concise" | "creative">("luxurious")
  // Hết credit / thiếu quyền: báo lý do, không hiện gợi ý dựng sẵn
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null)

  const handleRewrite = async (styleOverride?: "luxurious" | "sweet" | "concise" | "creative") => {
    if (!value.trim()) return
    const targetStyle = styleOverride || selectedStyle
    setLoading(true)
    setShowDropdown(true)
    setBlockedMessage(null)

    try {
      const res = await fetch("/api/v1/content-engine/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: value.trim(),
          field_type: fieldType,
          style: targetStyle,
        }),
      })

      const blocked = res.ok ? null : await rewriteBlockedMessage(res)
      if (blocked) {
        setBlockedMessage(blocked)
        setShowDropdown(false)
        return
      }
      if (!res.ok) throw new Error("Yêu cầu viết lại không thành công")
      const suggestions = ((await res.json()) as { data?: { suggestions?: unknown } }).data?.suggestions
      if (Array.isArray(suggestions) && suggestions.length > 0) {
        setSuggestions(suggestions)
      } else {
        setSuggestions([value])
      }
    } catch {
      // Dự phòng tại chỗ
      setSuggestions([
        `${value} (Chuẩn thiết kế thủ công)`,
        `Đặc quyền ${value.toLowerCase()} cao cấp`,
        `${value} — Cam kết chất lượng dịch vụ sản phẩm`,
      ])
    } finally {
      setLoading(false)
    }
  }

  const applySuggestion = (text: string) => {
    onChange(text)
    setShowDropdown(false)
  }

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-caption font-semibold text-text">
          {label}
        </label>
      )}

      <div className="flex gap-2 relative">
        <div className="relative flex-1">
          <Input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-xl border border-border bg-surface pl-3.5 pr-10 py-2 text-body-sm text-text focus:border-primary focus:outline-none transition-colors"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handleRewrite()}
            disabled={loading || !value.trim()}
            title="Nhờ AI trau chuốt câu từ"
            aria-label="Nhờ AI trau chuốt câu từ"
            className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-7 w-7 rounded-lg text-primary hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
          >
            {loading ? (
              <Loader2 size={15} className="animate-spin motion-reduce:animate-none text-primary" />
            ) : (
              <Sparkles size={15} className="text-primary" />
            )}
          </Button>
        </div>

        {onAddCustom && (
          <Button
            type="button"
            variant="outline"
            onClick={onAddCustom}
            disabled={!value.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-4 py-2 text-body-sm font-bold text-text hover:border-primary transition-colors disabled:opacity-40"
          >
            <Check size={15} />
            <span>{addButtonText}</span>
          </Button>
        )}
      </div>

      {helperText && (
        <p className="text-caption text-text-muted">{helperText}</p>
      )}

      {blockedMessage && (
        <p role="alert" className="text-caption text-danger">
          {blockedMessage}
        </p>
      )}

      {/* Popover / Panel gợi ý của AI */}
      {showDropdown && (
        <div className="rounded-xl border border-primary/30 bg-surface p-3.5 shadow-md space-y-3 animate-in fade-in-50 duration-150">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div className="flex items-center gap-1.5 text-caption font-bold text-primary">
              <Wand2 size={14} />
              <span>Gợi ý trau chuốt bởi AI Cố Vấn:</span>
            </div>

            {/* Bộ chọn phong cách nhanh */}
            <div className="flex items-center gap-1 text-caption">
              {(
                [
                  { id: "luxurious", label: "Sang trọng" },
                  { id: "sweet", label: "Ấm áp" },
                  { id: "concise", label: "Ngắn gọn" },
                ] as const
              ).map((s) => (
                <Button variant="ghost"
                  type="button"
                  key={s.id}
                  onClick={() => {
                    setSelectedStyle(s.id)
                    handleRewrite(s.id)
                  }}
                  className={`h-auto gap-0 px-2 py-0.5 rounded-md text-caption transition-colors cursor-pointer ${
                    selectedStyle === s.id
                      ? "bg-primary text-white font-semibold hover:bg-primary"
                      : "bg-surface-alt text-text-muted hover:text-text hover:bg-surface-alt"
                  }`}
                >
                  {s.label}
                </Button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="py-4 text-center space-y-2">
              <Loader2 size={18} className="animate-spin motion-reduce:animate-none text-primary mx-auto" />
              <p className="text-caption text-text-muted">AI đang phân tích & trau chuốt theo tông giọng cửa hàng...</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {suggestions.map((sug, i) => (
                <Button variant="outline"
                  type="button"
                  key={i}
                  onClick={() => applySuggestion(sug)}
                  className="text-[length:inherit] h-auto font-[inherit] w-full text-left rounded-lg p-2.5 border border-border bg-surface-alt/40 hover:border-primary hover:bg-primary/5 transition-all group flex items-start justify-between gap-2 cursor-pointer"
                >
                  <span className="text-body-sm text-text leading-snug">{sug}</span>
                  <span className="shrink-0 text-caption font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 pt-0.5">
                    <span>Chọn</span>
                    <ArrowRight size={12} />
                  </span>
                </Button>
              ))}

              <div className="flex justify-end pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDropdown(false)}
                  className="text-caption font-medium text-text-muted hover:text-text h-auto p-0 hover:bg-transparent"
                >
                  Đóng gợi ý
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
