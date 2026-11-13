"use client"

import { Button } from "@/components/ui/button"
import React from "react"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { ArrowRight } from "@/components/ui/icon-set/arrow-right"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { COMING_SOON_LABEL } from "@/lib/feature-lock"
import type { JourneyDefinition } from "@/modules/journey/domain/journey-model"
import { useSession } from "@/lib/session"
import { getIndustryTerminology } from "@/modules/organization/domain/industry-profile"

interface FeaturedSpotlightCardProps {
  journey: JourneyDefinition
  onSelect: (journey: JourneyDefinition) => void
  disabled?: boolean
}

export function FeaturedSpotlightCard({
  journey,
  onSelect,
  disabled = false,
}: FeaturedSpotlightCardProps) {
  const { organization } = useSession()
  const terms = getIndustryTerminology(organization?.industry)
  return (
    <Button variant="ghost"
      type="button"
      disabled={disabled}
      onClick={() => {
        if (!disabled) onSelect(journey)
      }}
      aria-disabled={disabled || undefined}
      title={disabled ? COMING_SOON_LABEL : undefined}
      className={`text-[length:inherit] h-auto justify-start font-[inherit] gap-0 group relative w-full text-left p-5 sm:p-6 md:p-7 rounded-2xl border-2 transition-all duration-200 cursor-pointer overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary ${
        disabled
          ? "opacity-50 cursor-not-allowed bg-surface-alt border-border hover:bg-surface-alt"
          : "bg-surface border-primary/30 hover:border-primary hover:shadow-xl hover:-translate-y-0.5 hover:bg-surface"
      }`}
    >
      {/* Lớp nền tinh tế và ánh sáng viền */}
      <div
        className="absolute inset-0 bg-selected/30 pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-selected/60 blur-2xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Khối nội dung chính bên trái */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-warning-bg text-warning-text border border-warning text-caption font-bold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{journey.badgeText || "Nổi bật"}</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-success-bg text-success text-caption font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              <span>Sẵn sàng sử dụng</span>
            </span>
          </div>

          <div>
            <h2 className="text-display md:text-display-lg font-extrabold text-text group-hover:text-primary transition-colors tracking-tight">
              {journey.goal}
            </h2>
            <p className="text-body text-text-muted mt-1.5 leading-relaxed max-w-2xl">
              {journey.description}
            </p>
          </div>

          {/* Các điểm nổi bật của quy trình */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
            {journey.id === "view-platform-overview" ? (
              <>
                <div className="flex items-center gap-2 text-body-sm font-medium text-text">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                  <span>Số liệu vận hành thời gian thực</span>
                </div>
                <div className="flex items-center gap-2 text-body-sm font-medium text-text">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                  <span>Sức khỏe microservices & CSDL</span>
                </div>
                <div className="flex items-center gap-2 text-body-sm font-medium text-text">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                  <span>Giám sát tổ chức & hạn mức AI</span>
                </div>
              </>
            ) : journey.id === "industry-ecosystem-overview" ? (
              <>
                <div className="flex items-center gap-2 text-body-sm font-medium text-text">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                  <span>7 Ngành hàng chuẩn hóa thống nhất</span>
                </div>
                <div className="flex items-center gap-2 text-body-sm font-medium text-text">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                  <span>Đồng bộ định mức nguyên liệu & ấn phẩm in A6</span>
                </div>
                <div className="flex items-center gap-2 text-body-sm font-medium text-text">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                  <span>Bộ chuẩn thị giác AI theo ngành</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-body-sm font-medium text-text">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                  <span>Gửi link qua Zalo / Tin nhắn</span>
                </div>
                <div className="flex items-center gap-2 text-body-sm font-medium text-text">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                  <span>Khách tự chọn mẫu và gửi thông tin</span>
                </div>
                <div className="flex items-center gap-2 text-body-sm font-medium text-text">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                  <span>Đơn vào hệ thống và giao việc cho {terms.makerTitle.toLowerCase()}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Khối Call-To-Action bên phải */}
        <div className="flex lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-border">
          <div className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary group-hover:bg-primary-dark text-surface text-body-sm font-bold shadow-md group-hover:shadow-lg transition-all duration-200">
            <span>
              {disabled
                ? COMING_SOON_LABEL
                : journey.id === "view-platform-overview"
                ? "Xem tổng quan vận hành"
                : journey.id === "industry-ecosystem-overview"
                ? "Khám phá hệ sinh thái"
                : organization?.industry && organization.industry !== "FLORAL"
                ? `Tạo link ${terms.catalogTitle.toLowerCase()}`
                : "Tạo link đặt hàng"}
            </span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </div>
          <span className="text-caption font-medium text-text-muted">
            {journey.id === "view-platform-overview"
              ? "Dành cho Quản trị viên Nền tảng"
              : journey.id === "industry-ecosystem-overview"
              ? "Dành cho Quản trị SaaS Đa Ngành"
              : "Nên dùng mỗi ngày cho cửa hàng"}
          </span>
        </div>
      </div>
    </Button>
  )
}
