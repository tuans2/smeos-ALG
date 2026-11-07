"use client"

import { useI18n } from "@/lib/i18n"
import React, { useState } from "react"
import Link from "next/link"
import { BookOpen } from "@/components/ui/icon-set/book-open"
import { Search } from "@/components/ui/icon-set/search"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Bot } from "@/components/ui/icon-set/bot"
import { Filter } from "@/components/ui/icon-set/filter"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { ExternalLink } from "@/components/ui/icon-set/external-link"
import { HelpCircle } from "@/components/ui/icon-set/help-circle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { FeatureGuidanceCard } from "@/components/ui/feature-guidance-card"
import { KNOWLEDGE_MODULES } from "@/components/knowledge-base/knowledge-data"
import { KnowledgeModuleCard } from "@/components/knowledge-base/knowledge-module-card"
import { OnboardingProgressBar } from "@/components/knowledge-base/onboarding-progress-bar"
import { useSession } from "@/lib/session"
import { getIndustryTerminology } from "@/modules/organization/domain/industry-profile"
import type { Route } from "next"
import { MobileMenuButton } from "@/components/layout/mobile-nav-context"
import { PageHeader } from "@/components/ui/page-header"

export default function KnowledgeBasePage() {
  const { t } = useI18n()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>("ALL")
  const { organization } = useSession()
  const ti = getIndustryTerminology(organization?.industry)

  // Bộ lọc modules
  const filteredModules = KNOWLEDGE_MODULES.filter((m) => {
    const matchesFilter =
      selectedModuleFilter === "ALL" || m.code === selectedModuleFilter

    const q = searchQuery.toLowerCase().trim()
    if (!q) return matchesFilter

    const matchesSearch =
      m.title.toLowerCase().includes(q) ||
      m.summary.toLowerCase().includes(q) ||
      m.atomicFields.some(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q)
      ) ||
      m.tips.some((t) => t.toLowerCase().includes(q))

    return matchesFilter && matchesSearch
  })

  function handleAskCopilot(prompt: string) {
    // Kích hoạt Copilot toàn cục và tự động gửi câu hỏi mẫu
    window.dispatchEvent(new CustomEvent("smeos:open-copilot", { detail: { prompt } }))
  }

  return (
    <div className="flex flex-col min-h-screen bg-bg">
      {/* 1. Standardized Top-Right Action Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-bg/95 px-6 py-4 backdrop-blur-sm">
        <div className="flex items-start"><MobileMenuButton /><div>
          <PageHeader
            title="Cẩm nang tri thức"
            tip="Bảng tra cứu các trường bắt buộc, tiêu chuẩn thao tác và ví dụ chuẩn cho toàn bộ 7 phân hệ smeOS."
          />
        </div></div>

        {/* Top-Right Action Toolbar (K2: 1 primary + 1 secondary) */}
        <div className="flex items-center gap-3">
          <Link href={"/hoi-thoai/kenh-tich-hop" as Route}>
            <Button
              variant="outline"
              size="sm"
              className="text-caption font-bold gap-1.5 border-border hover:bg-surface-alt"
            >
              <Bot className="h-3.5 w-3.5 text-primary" />
              <span>Kênh hội thoại đa kênh</span>
            </Button>
          </Link>

          <Button
            variant="primary"
            size="sm"
            onClick={() => handleAskCopilot("Hỏi Copilot")}
            className="font-bold text-caption gap-1.5 shadow-xs"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Mở smeOS Copilot (⌘K)</span>
          </Button>
        </div>
      </header>

      {/* 2. Main Content */}
      <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Banner Hướng Dẫn Chuẩn FeatureGuidanceCard (K1: đúng 1 card duy nhất) */}
        <FeatureGuidanceCard
          badgeLabel="CẨM NANG VẬN HÀNH THƯƠNG MẠI SSOT"
          badgeIcon={BookOpen}
          title="Quy Chuẩn Nhập Liệu Nguyên Tử (Atomic Disaggregated Data)"
          description={`Để hệ thống smeOS hoạt động chính xác 100% khi tính giá vốn, đo SLA ${ti.makerTitle} và tư vấn AI bán hàng, mọi thông tin phải được phân rã thành các trường độc lập (Tên ${ti.rawMaterialItem}, Số lượng, Đơn vị tính, Màu sắc...). Tuyệt đối không gộp chung văn bản và số lượng vào cùng một ô tự do.`}
          tips={[
            { icon: "⚡", text: "Atomic Fields: Sửa trực tiếp từng ô dữ liệu nguyên tử mà không làm hỏng cấu trúc" },
            { icon: "🛡️", text: "Dữ liệu tách riêng: Dữ liệu của mỗi cửa hàng được giữ riêng, cửa hàng khác không xem hay ghi đè được" },
            { icon: "💬", text: "AI Copilot: Bấm 'Hỏi smeOS Copilot' để được trợ lý ảo hướng dẫn từng bước 24/7" },
            { icon: "🖨️", text: `In ấn bảo mật: Luôn dùng phiếu ${ti.makerAction} giấu giá cho thợ và phiếu A6 cho shipper` },
          ]}
        />

        {/* Thước đo tiến độ dữ liệu cửa hàng */}
        <OnboardingProgressBar />

        {/* Thanh Tìm Kiếm & Bộ Lọc Phân Hệ */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface p-3 rounded-2xl border border-border shadow-xs">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted z-10" />
            <Input
              type="text"
              placeholder="Tìm kiếm trường nhập liệu, quy chuẩn, mẹo thao tác (vd: đếm cành, giá sàn, ẩn giá, zalo)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Module Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { code: "ALL", label: "Tất cả" },
              { code: "M01", label: "Nhận diện ảnh" },
              { code: "M02", label: "Cấu hình giá" },
              { code: "M04c", label: "Studio video" },
              { code: "M06", label: "Bộ mẫu catalog" },
              { code: "M08", label: "Hội thoại tư vấn" },
              { code: "M09", label: "Khách hàng CRM" },
              { code: "M10", label: "Quản lý đơn hàng" },
            ].map((tab) => (
              <Button
                key={tab.code}
                type="button"
                variant={selectedModuleFilter === tab.code ? "primary" : "ghost"}
                size="sm"
                onClick={() => setSelectedModuleFilter(tab.code)}
                className="px-3 py-1.5 text-caption font-bold rounded-xl whitespace-nowrap h-auto"
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Danh Sách Các Phân Hệ Cẩm Nang Nhập Liệu */}
        <div className="space-y-6">
          {filteredModules.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-surface">
              <HelpCircle className="mx-auto h-8 w-8 text-text-muted mb-2" />
              <div className="text-body-sm font-bold text-text">Không tìm thấy hướng dẫn phù hợp</div>
              <p className="text-caption text-text-muted mt-1">
                Thử thay đổi từ khóa tìm kiếm hoặc chọn bộ lọc &apos;Tất cả&apos;
              </p>
            </div>
          ) : (
            filteredModules.map((mod) => (
              <KnowledgeModuleCard
                key={mod.id}
                module={mod}
                onAskCopilot={handleAskCopilot}
              />
            ))
          )}
        </div>
      </main>
    </div>
  )
}
