"use client"

import React, { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Copy } from "@/components/ui/icon-set/copy"
import { Check } from "@/components/ui/icon-set/check"
import { Lock } from "@/components/ui/icon-set/lock"
import { ShieldCheck } from "@/components/ui/icon-set/shield-check"
import type { StoreFieldRecord } from "@/modules/field-platform/use-cases/get-store-folder-data"

interface FieldDataTableProps {
  readonly fields: readonly StoreFieldRecord[]
}

export function FieldDataTable({ fields }: FieldDataTableProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const handleCopy = (key: string, val: string) => {
    void navigator.clipboard.writeText(val)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const getSensitivityBadge = (sens: string) => {
    switch (sens) {
      case "S0_PUBLIC":
        return <Badge tone="neutral" className="text-caption">S0 Công khai</Badge>
      case "S1_INTERNAL":
        return <Badge tone="accent" className="text-caption">S1 Nội bộ</Badge>
      case "S2_CONFIDENTIAL":
        return <Badge tone="warning" className="text-caption">S2 Bảo mật</Badge>
      default:
        return null
    }
  }

  const getFormatBadge = (target: string) => {
    switch (target) {
      case "RAW":
        return (
          <span className="px-2 py-0.5 rounded text-caption font-bold bg-success-bg text-primary border border-primary/20">
            RAW (Nguyên bản)
          </span>
        )
      case "MASKED":
        return (
          <span className="px-2 py-0.5 rounded text-caption font-bold bg-warning-bg text-warning-text border border-warning/30">
            MASKED (Đã che)
          </span>
        )
      case "AGGREGATED":
        return (
          <span className="px-2 py-0.5 rounded text-caption font-bold bg-surface-alt text-text-muted border border-border">
            AGGREGATED (Tổng hợp)
          </span>
        )
      default:
        return (
          <span className="px-2 py-0.5 rounded text-caption font-bold bg-surface-alt text-text-muted">
            {target}
          </span>
        )
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full text-left border-collapse text-body-sm">
        <thead>
          <tr className="border-b border-border bg-surface-alt text-text-muted text-caption uppercase tracking-wider font-bold">
            <th className="py-3 px-4">Tên trường & Mã khóa</th>
            <th className="py-3 px-4">Giá trị thu thập thực tế</th>
            <th className="py-3 px-4">Độ nhạy</th>
            <th className="py-3 px-4">Dạng chia sẻ</th>
            <th className="py-3 px-4 text-right">Sao chép</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {fields.map((field) => (
            <tr key={field.fieldKey} className="hover:bg-surface-alt/50 transition-colors">
              <td className="py-3.5 px-4">
                <div className="font-bold text-text">{field.fieldNameVi}</div>
                <div className="text-caption font-mono text-text-muted mt-0.5">{field.fieldKey}</div>
                {field.purpose && (
                  <div className="text-caption text-text-muted italic flex items-center gap-1 mt-1">
                    <Lock size={10} />
                    <span>Mục đích: {field.purpose}</span>
                  </div>
                )}
              </td>

              <td className="py-3.5 px-4 font-medium text-text">
                <span className="font-mono bg-surface-alt px-2.5 py-1 rounded-lg border border-border/80 inline-block max-w-xs truncate">
                  {field.displayValue}
                </span>
              </td>

              <td className="py-3.5 px-4">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {getSensitivityBadge(field.sensitivity)}
                  {field.isPii && (
                    <span className="px-1.5 py-0.5 rounded text-caption font-bold bg-danger/10 text-danger border border-danger/20">
                      Cá nhân
                    </span>
                  )}
                </div>
              </td>

              <td className="py-3.5 px-4">{getFormatBadge(field.effectiveTarget)}</td>

              <td className="py-3.5 px-4 text-right">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(field.fieldKey, field.displayValue)}
                  className="h-8 w-8 p-0 rounded-lg border border-border hover:bg-surface-alt text-text-muted hover:text-text transition-colors inline-flex items-center justify-center"
                  title="Sao chép giá trị"
                >
                  {copiedKey === field.fieldKey ? (
                    <Check size={14} className="text-primary" />
                  ) : (
                    <Copy size={14} />
                  )}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
