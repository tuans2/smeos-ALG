"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { ArrowRight } from "@/components/ui/icon-set/arrow-right"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { XCircle } from "@/components/ui/icon-set/x-circle"
import { HelpCircle } from "@/components/ui/icon-set/help-circle"
import { ChevronDown } from "@/components/ui/icon-set/chevron-down"
import { ChevronUp } from "@/components/ui/icon-set/chevron-up"
import { Table } from "@/components/ui/icon-set/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ModuleKnowledgeSpec } from "./knowledge-data"
import type { Route } from "next"

interface KnowledgeModuleCardProps {
  module: ModuleKnowledgeSpec
  onAskCopilot?: (prompt: string) => void
}

export function KnowledgeModuleCard({ module, onAskCopilot }: KnowledgeModuleCardProps) {
  const [showFields, setShowFields] = useState(true)

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-xs overflow-hidden transition-all hover:shadow-md">
      {/* 1. Header Khối Thông Tin Phân Hệ (K1: Card con không lồng FeatureGuidanceCard) */}
      <div className="p-4 sm:p-5 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary/10 text-primary text-caption font-bold px-2.5 py-0.5 uppercase tracking-wider">
            {module.badgeLabel}
          </span>
          <h2 className="text-body font-bold text-text">{module.title}</h2>
        </div>
        <p className="text-caption text-text-muted leading-relaxed">{module.summary}</p>
        {module.tips.length > 0 && (
          <ul className="flex flex-wrap gap-2 pt-1 text-caption text-text-muted">
            {module.tips.map((tip, idx) => (
              <li key={idx} className="flex items-center gap-1 rounded-md bg-surface-alt px-2.5 py-1 text-text">
                <span aria-hidden="true">💡</span> <span>{tip}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 2. Bảng Trường Dữ Liệu Nguyên Tử (Atomic Disaggregated Fields) */}
      <div className="border-t border-border px-4 sm:px-6 py-4 bg-surface-alt/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Table className="h-4 w-4 text-primary" />
            <span className="text-caption font-bold text-text uppercase tracking-wide">
              Các trường dữ liệu nguyên tử cần nhập liệu ({module.atomicFields.length} trường)
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowFields(!showFields)}
            className="h-auto p-0 flex items-center gap-1 text-caption font-semibold text-text-muted hover:text-text"
          >
            <span>{showFields ? "Thu gọn" : "Xem chi tiết"}</span>
            {showFields ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {showFields && (
          <div role="region" tabIndex={0} aria-label={`Bảng tra cứu: ${module.title}`} className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full text-left text-caption">
              <thead className="bg-surface-alt border-b border-border text-caption font-bold text-text-muted uppercase">
                <tr>
                  <th className="px-3 py-2.5">Trường dữ liệu</th>
                  <th className="px-3 py-2.5">Kiểu</th>
                  <th className="px-3 py-2.5">Mô tả nghiệp vụ</th>
                  <th className="px-3 py-2.5">Ví dụ chuẩn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {module.atomicFields.map((field, idx) => (
                  <tr key={idx} className="hover:bg-surface-alt/60 transition-colors">
                    <td className="px-3 py-2.5 font-bold text-text whitespace-nowrap">
                      {field.name}
                      {field.required && <span className="text-warning-text ml-1 font-bold">*</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge className="bg-secondary/20 text-secondary-foreground text-caption font-mono px-1.5 py-0.5">
                        {field.dataType}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-text-muted">{field.description}</td>
                    <td className="px-3 py-2.5 font-mono text-caption text-primary/90 font-medium">
                      {field.example}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. So sánh Chuẩn vs Sai lệch */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 sm:p-6 border-t border-border bg-surface">
        <div className="rounded-xl border border-success-border bg-success-bg p-3.5 space-y-1.5">
          <div className="flex items-center gap-1.5 text-caption font-bold text-primary">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span>Cách nhập liệu chuẩn (Recommended)</span>
          </div>
          <p className="text-caption leading-relaxed text-text">
            {module.goodPractice}
          </p>
        </div>

        <div className="rounded-xl border border-warning/30 bg-warning-bg p-3.5 space-y-1.5">
          <div className="flex items-center gap-1.5 text-caption font-bold text-warning-text">
            <XCircle className="h-4 w-4 text-warning-text" />
            <span>Sai lầm cần tránh (Anti-pattern)</span>
          </div>
          <p className="text-caption leading-relaxed text-warning-text line-through decoration-warning/60">
            {module.badPractice}
          </p>
        </div>
      </div>

      {/* 4. Thanh Tác Vụ 1-Chạm Ở Chân Khối */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-t border-border bg-surface-alt/60">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onAskCopilot?.(module.copilotPrompt)}
          className="h-auto p-0 inline-flex items-center gap-1.5 text-caption font-bold text-primary hover:underline"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Hỏi smeOS Copilot về phân hệ này</span>
        </Button>

        <Link href={module.routePath as Route}>
          <Button
            variant="primary"
            size="sm"
            className="text-caption font-bold gap-1.5 shadow-xs"
          >
            <span>👉 {module.actionButtonLabel}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
