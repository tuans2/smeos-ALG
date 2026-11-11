"use client"

import React from "react"
import { BookOpen, Send, Sparkles, ArrowRight, ShieldCheck, Plus, CheckCircle2 } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n"

interface JourneyActionCardsProps {
  catalogCount: number
  sessionCount: number
  onStartCreateCatalog: () => void
  onStartCreateLink: () => void
  onViewPayments: () => void
  onSwitchToExpertMode?: () => void
}

export function JourneyActionCards({
  catalogCount,
  sessionCount,
  onStartCreateCatalog,
  onStartCreateLink,
  onViewPayments,
  onSwitchToExpertMode,
}: JourneyActionCardsProps) {
  const { ti } = useI18n()
  const hasNoCatalog = catalogCount === 0

  return (
    <div className="flex flex-col gap-6">
      {/* Guidance Callout if shop has no catalogs */}
      {hasNoCatalog && (
        <div className="bg-warning-bg/50 border border-warning/30 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-warning/15 text-warning-text flex items-center justify-center shrink-0 mt-0.5">
              <BookOpen size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-body font-extrabold text-text">
                  Cửa hàng chưa có {ti("catalogTitle")}
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-warning/20 text-warning-text text-caption font-bold">
                  Khởi đầu cần thiết
                </span>
              </div>
              <p className="text-body-sm text-text-muted mt-1 leading-relaxed max-w-2xl">
                Khách hàng sẽ lướt xem các {ti("sampleProduct").toLowerCase()} theo bộ sưu tập. Hãy tạo bộ sưu tập đầu tiên trước khi sinh link gửi chào hàng cho khách.
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={onStartCreateCatalog}
            className="bg-primary hover:bg-primary-dark text-white font-bold h-10 px-4 text-body-sm shrink-0 gap-1.5 shadow-sm"
          >
            <Plus size={16} />
            <span>Tạo Bộ Sưu Tập Ngay</span>
          </Button>
        </div>
      )}

      {/* Goal Selector Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-caption font-bold mb-1">
            <Sparkles size={13} />
            <span>HÀNH TRÌNH TÁC VỤ THÔNG MINH (JOURNEY-FIRST)</span>
          </div>
          <h2 className="text-title font-extrabold text-text">
            Bạn muốn thực hiện tác vụ nào hôm nay?
          </h2>
          <p className="text-body-sm text-text-muted mt-0.5">
            Chọn hành trình phù hợp để hoàn thành công việc nhanh chóng theo từng bước hướng dẫn
          </p>
        </div>

        {onSwitchToExpertMode && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSwitchToExpertMode}
            className="text-body-sm h-9 self-start sm:self-auto"
          >
            <span>Chế độ Quản lý chuyên sâu</span>
          </Button>
        )}
      </div>

      {/* 3 Main Journey Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Chuẩn bị Catalog */}
        <div
          className={`group relative flex flex-col justify-between p-5 rounded-2xl border transition-all duration-200 bg-surface ${
            hasNoCatalog
              ? "border-primary shadow-md ring-2 ring-primary/20"
              : "border-border hover:border-primary/50 hover:shadow-md"
          }`}
        >
          <div>
            <div className="flex items-start justify-between mb-3.5">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                <BookOpen size={24} />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-caption font-bold bg-surface-muted text-text-muted border border-border">
                {catalogCount} Bộ sưu tập
              </span>
            </div>

            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-caption font-mono font-bold text-primary">BƯỚC 1</span>
              <h3 className="text-body font-extrabold text-text group-hover:text-primary transition-colors">
                {ti("catalogTitle")}
              </h3>
            </div>
            <p className="text-body-sm text-text-muted leading-relaxed">
              Tạo danh mục các {ti("sampleProduct").toLowerCase()} theo sự kiện và phong cách để khách vuốt chọn.
            </p>
          </div>

          <div className="mt-5 pt-3.5 border-t border-border flex items-center justify-between">
            <Button variant="ghost"
              type="button"
              onClick={onStartCreateCatalog}
              className="h-auto p-0 text-body-sm font-bold text-primary inline-flex items-center gap-1.5 hover:underline"
            >
              <span>{catalogCount === 0 ? "Tạo bộ sưu tập đầu tiên" : `Quản lý & Thêm ${ti("sampleProduct").toLowerCase()}`}</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Button>
            {catalogCount > 0 && (
              <span className="inline-flex items-center gap-1 text-caption text-success font-medium">
                <CheckCircle2 size={13} />
                <span>Đã sẵn sàng</span>
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Tạo link gửi khách */}
        <div
          className={`group relative flex flex-col justify-between p-5 rounded-2xl border transition-all duration-200 bg-surface ${
            !hasNoCatalog
              ? "border-border hover:border-primary/50 hover:shadow-md cursor-pointer"
              : "border-border/60 opacity-80"
          }`}
        >
          <div>
            <div className="flex items-start justify-between mb-3.5">
              <div className="w-12 h-12 rounded-xl bg-selected text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                <Send size={24} />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-caption font-bold bg-primary/10 text-primary border border-primary/20">
                Tác vụ chính
              </span>
            </div>

            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-caption font-mono font-bold text-primary">BƯỚC 2</span>
              <h3 className="text-body font-extrabold text-text group-hover:text-primary transition-colors">
                Tạo Link Gửi Khách Hàng
              </h3>
            </div>
            <p className="text-body-sm text-text-muted leading-relaxed">
              Chọn bộ sưu tập, gán tên khách hàng và nhận link riêng `/b/CODE` cùng QR để gửi ngay qua Zalo hoặc Messenger.
            </p>
          </div>

          <div className="mt-5 pt-3.5 border-t border-border flex items-center justify-between">
            <Button variant="ghost"
              type="button"
              onClick={onStartCreateLink}
              disabled={hasNoCatalog}
              className={`h-auto p-0 text-body-sm font-bold inline-flex items-center gap-1.5 ${
                hasNoCatalog
                  ? "text-text-muted cursor-not-allowed"
                  : "text-primary hover:underline"
              }`}
            >
              <span>{hasNoCatalog ? "Cần tạo catalog trước" : "Tạo link gửi khách ngay"}</span>
              {!hasNoCatalog && <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />}
            </Button>
            <span className="text-caption text-text-muted font-medium">
              {sessionCount} link đã tạo
            </span>
          </div>
        </div>

        {/* Card 3: Giám sát & Duyệt */}
        <div className="group relative flex flex-col justify-between p-5 rounded-2xl border border-border hover:border-primary/50 hover:shadow-md transition-all duration-200 bg-surface">
          <div>
            <div className="flex items-start justify-between mb-3.5">
              <div className="w-12 h-12 rounded-xl bg-success-bg text-success flex items-center justify-center group-hover:scale-105 transition-transform">
                <ShieldCheck size={24} />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-caption font-bold bg-surface-muted text-text-muted border border-border">
                Điều hành
              </span>
            </div>

            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-caption font-mono font-bold text-primary">BƯỚC 3</span>
              <h3 className="text-body font-extrabold text-text group-hover:text-primary transition-colors">
                Duyệt Đơn & Thanh Toán
              </h3>
            </div>
            <p className="text-body-sm text-text-muted leading-relaxed">
              Theo dõi khách lướt chọn {ti("sampleProduct").toLowerCase()} trực tiếp và 1-click đối soát xác nhận chuyển khoản ngân hàng VietQR.
            </p>
          </div>

          <div className="mt-5 pt-3.5 border-t border-border flex items-center justify-between">
            <Button variant="ghost"
              type="button"
              onClick={onViewPayments}
              className="h-auto p-0 text-body-sm font-bold text-primary inline-flex items-center gap-1.5 hover:underline"
            >
              <span>Vào trang đối soát thanh toán</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
