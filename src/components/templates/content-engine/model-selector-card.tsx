"use client"

import React from "react"
import { Cpu } from "@/components/ui/icon-set/cpu"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Zap } from "@/components/ui/icon-set/zap"
import { ShieldCheck } from "@/components/ui/icon-set/shield-check"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import { Button } from "@/components/ui/button"

export type AIContentProvider = "ollama" | "openai" | "gemini"

export interface AIModelOption {
  id: AIContentProvider
  name: string
  subtitle: string
  desc: string
  badge: string
  badgeTone: "success" | "accent" | "neutral"
  icon: React.ElementType
  latency: string
  cost: string
  highlight?: boolean
}

export const AI_CONTENT_MODELS: AIModelOption[] = [
  {
    id: "ollama",
    name: "Qwen 2.5 7B",
    subtitle: "Local Metal GPU (Apple M3)",
    desc: "Chạy hoàn toàn trên máy chủ nội bộ. Không tốn phí API token, dữ liệu bảo mật 100%, độc lập không cần internet.",
    badge: "Khuyên dùng · 0đ",
    badgeTone: "success",
    icon: Cpu,
    latency: "~4-8 giây",
    cost: "Miễn phí (0đ)",
    highlight: true,
  },
  {
    id: "openai",
    name: "OpenAI GPT-4o",
    subtitle: "Cloud API (OpenAI)",
    desc: "Mô hình ngôn ngữ hàng đầu thế giới. Văn phong sắc sảo, câu từ đắt giá, phù hợp chiến dịch truyền thông lớn và sự kiện cao cấp.",
    badge: "Cloud Cao cấp",
    badgeTone: "accent",
    icon: Sparkles,
    latency: "~3-5 giây",
    cost: "Theo OpenAI Token",
  },
  {
    id: "gemini",
    name: "Google Gemini Flash",
    subtitle: "Cloud API (Google AI Studio)",
    desc: "Công nghệ tiên tiến từ Google DeepMind. Tốc độ phản hồi cực nhanh, bắt trend tốt, kho từ vựng phong phú và tự nhiên.",
    badge: "Siêu tốc độ",
    badgeTone: "neutral",
    icon: Zap,
    latency: "~1-2 giây",
    cost: "Theo Google Cloud",
  },
]

export interface ModelSelectorCardProps {
  selectedProvider: AIContentProvider
  onSelectProvider: (provider: AIContentProvider) => void
  disabled?: boolean
  selectedChannelsCount?: number
  onGenerate?: () => void
}

/**
 * ModelSelectorCard - Thẻ lựa chọn Model AI sinh nội dung tiếp thị M07
 */
export function ModelSelectorCard({
  selectedProvider,
  onSelectProvider,
  disabled = false,
  selectedChannelsCount,
  onGenerate,
}: ModelSelectorCardProps) {
  return (
    <Card className="rounded-2xl border border-border bg-surface p-5 shadow-sm flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="text-caption font-semibold text-text-muted">
            Bước 4: Chọn Cỗ máy AI (Model Engine)
          </div>
          <div className="text-title font-extrabold text-text flex items-center gap-2">
            <span>Lựa chọn Model sinh nội dung tiếp thị</span>
            <ShieldCheck size={16} className="text-secondary-text" />
          </div>
        </div>

        <div className="text-caption text-text-muted">
          Đang sử dụng:{" "}
          <strong className="text-primary font-bold">
            {AI_CONTENT_MODELS.find((m) => m.id === selectedProvider)?.name || selectedProvider}
          </strong>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {AI_CONTENT_MODELS.map((model) => {
          const isSelected = model.id === selectedProvider
          const Icon = model.icon

          return (
            <Button variant="ghost" type="button"
              key={model.id}
              onClick={() => !disabled && onSelectProvider(model.id)}
              className={`text-[length:inherit] h-auto justify-start font-[inherit] gap-0 cursor-pointer rounded-xl border p-4 transition-all flex flex-col justify-between gap-3 select-none relative ${
                isSelected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                  : "border-border hover:border-text-muted bg-surface opacity-85 hover:opacity-100"
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {/* Header của Model Card */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`p-2 rounded-lg flex-shrink-0 ${
                      isSelected ? "bg-primary text-white" : "bg-surface-alt text-text-muted"
                    }`}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-body-sm font-black text-text truncate">
                      {model.name}
                    </div>
                    <div className="text-caption text-text-muted truncate font-medium">
                      {model.subtitle}
                    </div>
                  </div>
                </div>

                <Badge tone={model.badgeTone} className="text-caption px-2 py-0.5 flex-shrink-0">
                  {model.badge}
                </Badge>
              </div>

              {/* Mô tả tính năng */}
              <span className="block text-caption text-text-muted leading-relaxed line-clamp-3">
                {model.desc}
              </span>

              {/* Footer: Tốc độ & Chi phí */}
              <div className="pt-2 border-t border-border/60 flex items-center justify-between text-caption">
                <span className="text-text-muted">
                  ⚡ <strong className="font-semibold text-text">{model.latency}</strong>
                </span>
                <span className={`font-bold ${isSelected ? "text-primary" : "text-text-muted"}`}>
                  {model.cost}
                </span>
              </div>
            </Button>
          )
        })}
      </div>

      {/* Thanh chốt hạ hành động sinh bài */}
      {onGenerate && (
        <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-caption text-text-muted">
            {(selectedChannelsCount ?? 0) === 0 ? (
              <span className="text-warning-text font-semibold flex items-center gap-1">
                ⚠️ Vui lòng chọn ít nhất 1 kênh mạng xã hội ở Bước 3 để sinh bài viết.
              </span>
            ) : (
              <span>
                💡 Sẽ sử dụng <strong>{AI_CONTENT_MODELS.find((m) => m.id === selectedProvider)?.name}</strong> để tạo bài viết cho{" "}
                <strong>{selectedChannelsCount} kênh</strong> đã chọn.
              </span>
            )}
          </div>

          <Button
            size="default"
            onClick={onGenerate}
            disabled={disabled || (selectedChannelsCount ?? 0) === 0}
            className="w-full sm:w-auto gap-2 font-bold px-7 shadow-md whitespace-nowrap"
          >
            <Sparkles size={16} />
            {(selectedChannelsCount ?? 0) === 0
              ? "Chưa chọn kênh nào"
              : `Sinh bài bằng ${AI_CONTENT_MODELS.find((m) => m.id === selectedProvider)?.name}`}
          </Button>
        </div>
      )}
    </Card>
  )
}
