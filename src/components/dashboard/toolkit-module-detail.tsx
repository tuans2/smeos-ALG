"use client"

import React from "react"
import Link from "next/navigation"
import { ArrowLeft } from "@/components/ui/icon-set/arrow-left"
import { Folder } from "@/components/ui/icon-set/folder"
import { Button } from "@/components/ui/button"
import { IconTile } from "@/components/ui/app-icon"
import { InfoTip } from "@/components/ui/info-tip"
import type { BusinessModule } from "@/modules/toolkit/domain/business-modules"
import { getAllTools, type ToolDefinition } from "@/modules/toolkit/domain/toolkit-catalog"
import { Disclosure } from "@/components/ui/disclosure"
import { BrandKitTiles } from "@/components/brand-kit/tiles/brand-kit-tiles"
import { ContentStudioTiles } from "@/components/content-studio/content-studio-tiles"
import { ModuleCatalogSections } from "./module-catalog-sections"
import { MODULE_TONES } from "./toolkit-module-grid"
import { ModuleKpiStripComponent } from "./module-kpi-strip"

interface ModuleDetailProps {
  module: BusinessModule
  isDev: boolean
  onBack?: () => void
}

export function ModuleDetail({ module, isDev, onBack }: ModuleDetailProps) {
  const tone = MODULE_TONES[module.key] ?? "plum"
  const toolMap = new Map<number, ToolDefinition>(getAllTools().map((t) => [t.id, t]))

  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        {onBack ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 -ml-2 text-body-sm font-medium text-text-muted hover:text-primary"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Tất cả các mục
          </Button>
        ) : (
          <div />
        )}

        <a
          href="/kho-du-lieu"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-body-sm font-medium text-text-muted hover:text-primary hover:bg-surface-alt border border-border/70 transition-colors"
        >
          <Folder className="w-4 h-4" aria-hidden="true" />
          <span>Asset đã tạo</span>
        </a>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-surface shadow-sm ring-1 ring-border/60">
        <div className="flex items-center gap-4 min-w-0">
          <IconTile name={module.icon} tone={tone} variant="solid" />
          <div className="min-w-0">
            <span className="text-caption font-semibold text-text-muted">Mục tiêu {module.order}</span>
            <div className="flex items-center gap-2">
              <h2 className="text-display font-extrabold text-text tracking-tight">{module.name}</h2>
              <InfoTip label={module.name} side="bottom">{module.purpose}</InfoTip>
            </div>
          </div>
        </div>

        {/* Dải chỉ số KPI thực tế cho module (PO 01/11/2026, PR-7) */}
        <ModuleKpiStripComponent moduleKey={module.key} />
      </div>

      {/* Quy trình bán hàng chuẩn cho module sales (PO 01/11/2026, PR-4) */}
      {module.key === "sales" && (
        <div className="p-4 rounded-xl border border-border bg-surface-alt/70 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-caption font-bold text-primary uppercase tracking-wide">
              Quy trình bán hàng & chốt đơn chuẩn
            </span>
            <span className="text-caption text-text-muted">5 bước khép kín</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            {[
              { step: 1, label: "Chọn khách", desc: "CRM & Khách tiềm năng", href: "/khach-hang" },
              { step: 2, label: "Tư vấn mẫu", desc: "Bộ sưu tập riêng", href: "/the-chao" },
              { step: 3, label: "Lập báo giá", desc: "Bảng tính chi phí có số", href: "/bao-gia" },
              { step: 4, label: "Chốt duyệt", desc: "Gửi link báo giá khách", href: "/bao-gia" },
              { step: 5, label: "Đơn hàng", desc: "Tự động chuyển thành đơn", href: "/don-hang" },
            ].map((s) => (
              <a
                key={s.step}
                href={s.href}
                className="p-3 rounded-lg bg-surface border border-border hover:border-primary transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-1.5 text-caption font-bold text-text group-hover:text-primary">
                    <span className="w-5 h-5 rounded-full bg-selected text-primary flex items-center justify-center text-caption font-extrabold">
                      {s.step}
                    </span>
                    <span>{s.label}</span>
                  </div>
                  <div className="text-caption text-text-muted mt-1 leading-snug">
                    {s.desc}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Quy trình chăm sóc khách hàng chuẩn cho module care (PO 01/11/2026, PR-5) */}
      {module.key === "care" && (
        <div className="p-4 rounded-xl border border-border bg-surface-alt/70 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-caption font-bold text-primary uppercase tracking-wide">
              Quy trình chăm sóc & giữ chân khách hàng
            </span>
            <span className="text-caption text-text-muted">4 bước chu đáo</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            {[
              { step: 1, label: "Phân nhóm khách", desc: "Theo RFM, dịp & sự đồng ý", href: "/cham-soc" },
              { step: 2, label: "Chọn mục tiêu", desc: "Sau mua, sinh nhật, quay lại", href: "/cham-soc" },
              { step: 3, label: "Soạn thiệp chăm sóc", desc: "Mẫu thiệp #48–#52, #55 trang trọng", href: "/cham-soc" },
              { step: 4, label: "Gửi & Ghi nhận", desc: "Mở Zalo, gọi & lưu nhật ký", href: "/cham-soc" },
            ].map((s) => (
              <a
                key={s.step}
                href={s.href}
                className="p-3 rounded-lg bg-surface border border-border hover:border-primary transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-1.5 text-caption font-bold text-text group-hover:text-primary">
                    <span className="w-5 h-5 rounded-full bg-selected text-primary flex items-center justify-center text-caption font-extrabold">
                      {s.step}
                    </span>
                    <span>{s.label}</span>
                  </div>
                  <div className="text-caption text-text-muted mt-1 leading-snug">
                    {s.desc}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Quy trình in ấn chuẩn xuất file PDF chất lượng cao cho module print (PO 01/11/2026, PR-6) */}
      {module.key === "print" && (
        <div className="p-4 rounded-xl border border-border bg-surface-alt/70 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-caption font-bold text-primary uppercase tracking-wide">
              Quy trình xuất bản in chất lượng cao
            </span>
            <span className="text-caption text-text-muted">4 bước chuẩn nhà in</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            {[
              { step: 1, label: "Khổ in & Vật liệu", desc: "A4, A5, A6, Standee, Danh thiếp", href: "/in-an" },
              { step: 2, label: "Soạn nội dung", desc: "Tiêu đề, lời chào, mã QR", href: "/in-an" },
              { step: 3, label: "Kiểm quy cách", desc: "Preflight: Bleed 3mm, 300 DPI, vùng an toàn", href: "/in-an" },
              { step: 4, label: "Xuất file PDF", desc: "Bản in sắc nét kèm dấu xén thành phẩm", href: "/in-an" },
            ].map((s) => (
              <a
                key={s.step}
                href={s.href}
                className="p-3 rounded-lg bg-surface border border-border hover:border-primary transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-1.5 text-caption font-bold text-text group-hover:text-primary">
                    <span className="w-5 h-5 rounded-full bg-selected text-primary flex items-center justify-center text-caption font-extrabold">
                      {s.step}
                    </span>
                    <span>{s.label}</span>
                  </div>
                  <div className="text-caption text-text-muted mt-1 leading-snug">
                    {s.desc}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {module.journey === "BRAND_KIT" ? (
        <BrandKitTiles />
      ) : module.journey === "CONTENT_STUDIO" ? (
        <ContentStudioTiles />
      ) : (
        <ModuleCatalogSections assets={module.assets} tools={module.tools} toolMap={toolMap} isDev={isDev} tone={tone} />
      )}

      {/* PHÁT_TRIỂN_SAU (PO 08/11/2026): nội dung cũ của nhóm — chỉ môi trường phát triển nhận được */}
      {isDev && module.deferredAssets.length + module.deferredTools.length > 0 && (
        <Disclosure label={`Phát triển sau — chỉ hiện ở môi trường phát triển (${module.deferredAssets.length} ấn phẩm · ${module.deferredTools.length} công cụ)`}>
          <div className="space-y-8 pt-4">
            <ModuleCatalogSections assets={module.deferredAssets} tools={module.deferredTools} toolMap={toolMap} isDev={isDev} tone={tone} />
          </div>
        </Disclosure>
      )}
    </section>
  )
}
