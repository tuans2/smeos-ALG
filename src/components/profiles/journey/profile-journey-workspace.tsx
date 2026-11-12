"use client"

import React, { useState } from "react"
import { Zap } from "@/components/ui/icon-set/zap"
import { Palette } from "@/components/ui/icon-set/palette"
import { ShieldCheck } from "@/components/ui/icon-set/shield-check"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { ArrowRight } from "@/components/ui/icon-set/arrow-right"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { SlidersHorizontal } from "@/components/ui/icon-set/sliders-horizontal"
import { Layers } from "@/components/ui/icon-set/layers"
import { ChevronRight } from "@/components/ui/icon-set/chevron-right"
import { ExternalLink } from "@/components/ui/icon-set/external-link"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import type { BusinessProfileDetail } from "@/modules/profiles/use-cases/get-business-profile"
import type { BrandProfileDetail } from "@/modules/profiles/use-cases/get-brand-profile"

export interface ProfileJourneyWorkspaceProps {
  business: BusinessProfileDetail | null
  brand: BrandProfileDetail | null
  onSelectTab: (tabId: string) => void
  onToggleExpertMode: () => void
  isExpertMode: boolean
}

export function ProfileJourneyWorkspace({
  business,
  brand,
  onSelectTab,
  onToggleExpertMode,
  isExpertMode,
}: ProfileJourneyWorkspaceProps) {
  // Tính toán mức độ sẵn sàng thực tế (Readiness Score)
  const hasBasicInfo = Boolean(business?.display_name && business?.phone)
  const hasAddress = Boolean(business?.address)
  const hasColors = Boolean(brand?.primary_color)
  const hasLogo = Boolean(brand?.logo_asset_id)
  const hasOffers = Boolean(
    brand?.default_offers &&
    typeof brand.default_offers === "object" &&
    Object.keys(brand.default_offers).length > 0
  )
  const hasMediaAssets = Boolean(
    brand?.brand_assets &&
    typeof brand.brand_assets === "object" &&
    Object.keys(brand.brand_assets).length > 0
  )

  const stepsDone = [hasBasicInfo, hasAddress, hasColors, hasLogo, hasOffers, hasMediaAssets].filter(Boolean).length
  const totalSteps = 6
  const readinessPercentage = Math.round((stepsDone / totalSteps) * 100)

  return (
    <div className="space-y-6">
      {/* 1. KHỐI THƯỚC ĐO MỨC ĐỘ SẴN SÀNG (READINESS METER) */}
      <div className="rounded-2xl border border-primary/20 bg-surface p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-body font-bold text-text">Mức độ Sẵn sàng của Hồ sơ Cửa hàng</h3>
                <span className="text-caption font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {readinessPercentage}% Hoàn tất
                </span>
              </div>
              <p className="text-caption text-text-muted mt-0.5">
                {readinessPercentage >= 75
                  ? "Đã đủ điều kiện tạo Landing Page, Digital Catalog và kích hoạt Video Studio"
                  : readinessPercentage >= 40
                  ? "Đã sẵn sàng nhận đơn đặt hàng cơ bản — Hoàn tất thêm Logo & Màu để mở khóa E-Catalog"
                  : "Vui lòng hoàn thành thiết lập nhanh để cửa hàng sẵn sàng nhận đơn"}
              </p>
            </div>
          </div>

          {/* Công tắc chuyển đổi Chế độ Chuyên gia */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onToggleExpertMode}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-alt px-3.5 py-2 text-caption font-semibold text-text hover:border-primary transition-colors shrink-0"
          >
            {isExpertMode ? <Layers size={14} className="text-primary" /> : <SlidersHorizontal size={14} />}
            <span>{isExpertMode ? "Trở về Chế độ Hành trình" : "Mở Chế độ Chuyên gia (5 Tabs)"}</span>
          </Button>
        </div>

        {/* Thanh tiến trình (Progress Bar) */}
        <div className="mt-4 space-y-2">
          <div className="h-2 w-full rounded-full bg-surface-alt overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${Math.max(readinessPercentage, 5)}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="flex items-center gap-1.5 text-caption">
              <CheckCircle2 size={13} className={hasBasicInfo ? "text-success" : "text-text-muted"} />
              <span className={hasBasicInfo ? "text-text font-medium" : "text-text-muted"}>
                Thông tin kinh doanh ({hasBasicInfo ? "Đạt" : "Chưa đủ"})
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-caption">
              <CheckCircle2 size={13} className={hasColors && hasLogo ? "text-success" : "text-text-muted"} />
              <span className={hasColors && hasLogo ? "text-text font-medium" : "text-text-muted"}>
                Nhận diện thương hiệu ({hasColors && hasLogo ? "Đạt" : "Cần thêm"})
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-caption">
              <CheckCircle2 size={13} className={hasOffers ? "text-success" : "text-text-muted"} />
              <span className={hasOffers ? "text-text font-medium" : "text-text-muted"}>
                Chính sách & Cam kết ({hasOffers ? "Đạt" : "Cần thêm"})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. CÂU HỎI MỤC TIÊU KHỞI ĐẦU: BẠN MUỐN LÀM GÌ HÔM NAY? */}
      <div>
        <div className="mb-3.5">
          <h2 className="text-title-sm font-extrabold text-text">Bạn muốn hoàn thiện nhận diện nào hôm nay?</h2>
          <p className="text-caption text-text-muted">
            Chọn hành trình phù hợp nhất để hệ thống dẫn dắt bạn thiết lập từng bước có cố vấn gợi ý
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Fast-Track */}
          <div className="group rounded-2xl border border-border bg-surface p-5 shadow-xs transition-all hover:border-primary hover:shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Zap size={20} />
                </div>
                {hasBasicInfo && (
                  <span className="inline-flex items-center gap-1 text-caption font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">
                    <CheckCircle2 size={12} />
                    <span>Đã hoàn tất</span>
                  </span>
                )}
              </div>
              <h4 className="text-body font-bold text-text group-hover:text-primary transition-colors">
                1. Thiết lập nhanh để nhận đơn
              </h4>
              <p className="text-caption text-text-muted mt-1.5 leading-relaxed">
                Chỉ mất 2 phút: Nhập tên cửa hàng, số hotline, địa chỉ và giờ mở cửa để sẵn sàng chốt đơn khách.
              </p>
            </div>

            <div className="pt-4 mt-4 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                onClick={() => onSelectTab("business")}
                className="w-full inline-flex items-center justify-between rounded-xl bg-surface-alt px-3.5 py-2 text-body-sm font-bold text-text hover:bg-primary hover:text-white transition-all"
              >
                <span>{hasBasicInfo ? "Kiểm tra / Sửa đổi" : "Bắt đầu ngay (2 phút)"}</span>
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>

          {/* Card 2: Visual & Media Assets */}
          <div className="group rounded-2xl border border-border bg-surface p-5 shadow-xs transition-all hover:border-primary hover:shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent-text">
                  <Palette size={20} />
                </div>
                {hasLogo && hasColors && (
                  <span className="inline-flex items-center gap-1 text-caption font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">
                    <CheckCircle2 size={12} />
                    <span>Đã sẵn sàng</span>
                  </span>
                )}
              </div>
              <h4 className="text-body font-bold text-text group-hover:text-primary transition-colors">
                2. Nhận diện thương hiệu
              </h4>
              <p className="text-caption text-text-muted mt-1.5 leading-relaxed">
                Tải lên Logo cửa hàng, chọn bộ màu sắc, ảnh showroom và video giới thiệu để đóng watermark tự động.
              </p>
            </div>

            <div className="pt-4 mt-4 border-t border-border/60 flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onSelectTab("brand")}
                className="flex-1 inline-flex items-center justify-center rounded-xl bg-surface-alt px-3 py-2 text-caption font-bold text-text hover:bg-primary hover:text-white transition-all"
              >
                <span>Màu sắc thương hiệu</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onSelectTab("assets")}
                className="flex-1 inline-flex items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 px-3 py-2 text-caption font-bold hover:bg-primary hover:text-white transition-all"
              >
                <span>Logo và khung ảnh</span>
              </Button>
            </div>
          </div>

          {/* Card 3: Policies & AI Tone */}
          <div className="group rounded-2xl border border-border bg-surface p-5 shadow-xs transition-all hover:border-primary hover:shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/20 text-secondary">
                  <ShieldCheck size={20} />
                </div>
                {hasOffers && (
                  <span className="inline-flex items-center gap-1 text-caption font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">
                    <CheckCircle2 size={12} />
                    <span>Đã kích hoạt</span>
                  </span>
                )}
              </div>
              <h4 className="text-body font-bold text-text group-hover:text-primary transition-colors">
                3. Chính sách và giọng văn AI
              </h4>
              <p className="text-caption text-text-muted mt-1.5 leading-relaxed">
                Chọn quà tặng kèm, cam kết dịch vụ và thiết lập giọng văn trợ lý AI tư vấn Zalo.
              </p>
            </div>

            <div className="pt-4 mt-4 border-t border-border/60 flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onSelectTab("sales")}
                className="flex-1 inline-flex items-center justify-center rounded-xl bg-surface-alt px-3 py-2 text-caption font-bold text-text hover:bg-primary hover:text-white transition-all"
              >
                <span>Chính sách và cam kết</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onSelectTab("occasions")}
                className="flex-1 inline-flex items-center justify-center rounded-xl bg-surface-alt px-3 py-2 text-caption font-bold text-text hover:bg-primary hover:text-white transition-all"
              >
                <span>Dịp lễ và lời chào</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. KHỐI HÀNH ĐỘNG TIẾP THEO (NEXT BEST ACTIONS) */}
      {readinessPercentage >= 40 && (
        <div className="rounded-2xl border border-border bg-surface-alt/60 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-primary" />
            <h4 className="text-body-sm font-bold text-text uppercase tracking-wider">
              Việc tiếp theo bạn có thể thực hiện ngay với hồ sơ này:
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              href="/catalog"
              className="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5 hover:border-primary transition-colors group"
            >
              <div>
                <div className="text-body-sm font-bold text-text group-hover:text-primary transition-colors">
                  Xem Digital Catalog
                </div>
                <div className="text-caption text-text-muted mt-0.5">Đã gắn logo và bảng màu của bạn</div>
              </div>
              <ExternalLink size={16} className="text-text-muted group-hover:text-primary transition-colors" />
            </Link>

            <Link
              href="/tai-anh"
              className="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5 hover:border-primary transition-colors group"
            >
              <div>
                <div className="text-body-sm font-bold text-text group-hover:text-primary transition-colors">
                  Quét ảnh hoa đầu tiên
                </div>
                <div className="text-caption text-text-muted mt-0.5">AI tự gắn giá và quà tặng mặc định</div>
              </div>
              <ArrowRight size={16} className="text-text-muted group-hover:text-primary transition-colors" />
            </Link>

            <Link
              href="/video"
              className="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5 hover:border-primary transition-colors group"
            >
              <div>
                <div className="text-body-sm font-bold text-text group-hover:text-primary transition-colors">
                  Tự động gắn Watermark logo cửa hàng
                </div>
                <div className="text-caption text-text-muted mt-0.5">Tự động gắn Watermark logo tiệm</div>
              </div>
              <ArrowRight size={16} className="text-text-muted group-hover:text-primary transition-colors" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
