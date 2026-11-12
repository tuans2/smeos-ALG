"use client"

import React from "react"
import Link from "next/link"
import { StatTile } from "@/components/ui/stat-tile"
import { InfoTip } from "@/components/ui/info-tip"
import { Layers } from "@/components/ui/icon-set/layers"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { ExternalLink } from "@/components/ui/icon-set/external-link"
import { ShieldCheck } from "@/components/ui/icon-set/shield-check"
import { Package } from "@/components/ui/icon-set/package"
import { Printer } from "@/components/ui/icon-set/printer"
import { SlidersHorizontal } from "@/components/ui/icon-set/sliders-horizontal"
import { PlusCircle } from "@/components/ui/icon-set/plus-circle"
import { INDUSTRY_REGISTRY } from "@/modules/organization/domain/industries"
import { Badge } from "@/components/ui/badge"

export function IndustryEcosystemBoard() {
  const industries = Object.values(INDUSTRY_REGISTRY)

  return (
    <div className="space-y-6">
      {/* Thẻ tóm tắt tổng quan - Chuẩn StatTile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          label="Ngành kích hoạt"
          value={`${industries.length} / 7`}
          tip="Số lượng plugin ngành hàng đã được cấu hình và chuẩn hóa trên toàn hệ thống"
          icon={<Layers className="w-4 h-4 text-primary" aria-hidden="true" />}
        />

        <StatTile
          label="Danh mục chuẩn"
          value={industries.reduce((acc, ind) => acc + ind.taxonomy.defaultCategories.length, 0)}
          tip="Tổng số danh mục phân loại sản phẩm theo đặc thù từng ngành hàng"
          icon={<Package className="w-4 h-4 text-success" aria-hidden="true" />}
        />

        <StatTile
          label="Mẫu ấn phẩm"
          value={industries.reduce((acc, ind) => acc + ind.templates.printables.length, 0)}
          tip="Mẫu in ấn tem nhãn, thẻ thông tin, menu, hướng dẫn và phiếu bảo hành"
          icon={<Printer className="w-4 h-4 text-info" aria-hidden="true" />}
        />

        <StatTile
          label="Bối cảnh Studio"
          value={industries.reduce((acc, ind) => acc + ind.aiConfig.studioBackgroundStyles.length, 0)}
          tip="Phong cách bối cảnh hình ảnh thương phẩm phục vụ chế tác tự động bằng AI"
          icon={<Sparkles className="w-4 h-4 text-warning-text" aria-hidden="true" />}
        />
      </div>

      {/* Bảng so sánh ma trận 7 ngành */}
      <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-body font-bold text-text">
              Ma trận 7 Ngành Hàng
            </h3>
            <InfoTip label="Ma trận 7 Ngành Hàng">
              Hệ thống tự động thích ứng terminology, định mức nguyên liệu, taxonomy và AI prompt theo từng ngành mà không cần sửa CSDL.
            </InfoTip>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/van-hanh/nganh"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-alt border border-border hover:bg-surface text-caption font-bold text-text transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
              <span>Cấu hình ma trận</span>
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-body-sm">
            <thead>
              <tr className="border-b border-border bg-surface-alt/50 text-caption font-bold text-text-muted uppercase tracking-wider">
                <th className="py-3 px-4">Ngành hàng</th>
                <th className="py-3 px-4">Người làm / Sản phẩm mẫu</th>
                <th className="py-3 px-4">Danh mục & Dịp</th>
                <th className="py-3 px-4">Đơn vị & Định mức</th>
                <th className="py-3 px-4">Ấn phẩm A6</th>
                <th className="py-3 px-4">Đặc tả chuẩn</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {industries.map((ind) => (
                <tr key={ind.identity.key} className="hover:bg-surface-alt/30 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-text flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      {ind.identity.name}
                    </div>
                    <div className="text-caption text-text-muted font-mono mt-0.5">
                      {ind.identity.key}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-text">{ind.terminology.makerTitle}</div>
                    <div className="text-caption text-text-muted">
                      Mẫu: {ind.terminology.sampleProduct}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-text">
                      {ind.taxonomy.defaultCategories.length}
                    </span>{" "}
                    danh mục ·{" "}
                    <span className="font-semibold text-text">
                      {ind.taxonomy.occasions.length}
                    </span>{" "}
                    dịp
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="text-caption text-text">
                      {ind.bomSpec.measurementUnits.slice(0, 3).join(", ")}
                      {ind.bomSpec.measurementUnits.length > 3 ? "..." : ""}
                    </div>
                    <div className="text-caption text-text-muted">
                      {ind.bomSpec.componentRoles.length} vai trò nguyên liệu
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 font-semibold text-text">
                      {ind.templates.printables.length} mẫu
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge tone="success" className="bg-success-bg text-success border border-success/30 font-semibold text-caption gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      5/5 Trụ cột
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      href="/van-hanh/nganh"
                      className="inline-flex items-center gap-1 text-caption font-bold text-primary hover:underline"
                    >
                      <span>Cấu hình</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
