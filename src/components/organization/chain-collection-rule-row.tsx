"use client"

import React from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/select"
import { type FieldDefinitionV2, type PropagationTarget } from "@/modules/field-platform/domain/field-registry-v2"
import { type CollectionRule } from "@/modules/field-platform/domain/chain-collection-profile"

interface RuleRowProps {
  readonly field: FieldDefinitionV2
  readonly rule: CollectionRule
  readonly onChangeRule: (updated: CollectionRule) => void
}

export function ChainCollectionRuleRow({ field, rule, onChangeRule }: RuleRowProps) {
  const isS2 = field.sensitivity === "S2_CONFIDENTIAL" || field.pii.isPii

  const getSensitivityBadge = () => {
    switch (field.sensitivity) {
      case "S0_PUBLIC":
        return <Badge tone="neutral" className="text-caption">Công khai</Badge>
      case "S1_INTERNAL":
        return <Badge tone="accent" className="text-caption">Nội bộ</Badge>
      case "S2_CONFIDENTIAL":
        return <Badge tone="warning" className="text-caption">Bảo mật</Badge>
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border/80 hover:border-primary/40 bg-surface transition-all">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-body-sm text-text">{field.fieldName.vi}</span>
          {getSensitivityBadge()}
          {field.pii.isPii && (
            <span className="px-1.5 py-0.5 rounded text-caption font-semibold bg-danger/10 text-danger-text border border-danger/20">
              Cá nhân
            </span>
          )}
        </div>
        
        {isS2 && (
          <Input
            type="text"
            placeholder="Mục đích thu thập (bắt buộc với dữ liệu cá nhân)…"
            value={rule.purpose ?? ""}
            aria-label={`Mục đích thu thập — ${field.fieldName.vi}`}
            onChange={(e) => onChangeRule({ ...rule, purpose: e.target.value })}
            className="mt-2 w-full text-caption"
          />
        )}
      </div>

      <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
        <div className="flex flex-col items-start gap-1">
          <label className="text-caption font-semibold text-text-muted">Mức tối thiểu</label>
          <NativeSelect
            aria-label={`Mức tối thiểu — ${field.fieldName.vi}`}
            value={rule.minForm}
            onChange={(e) => onChangeRule({ ...rule, minForm: e.target.value as PropagationTarget })}
            className="text-body-sm h-8"
          >
            <option value="NONE">Không thu</option>
            <option value="AGGREGATED">Tổng hợp</option>
            <option value="MASKED">Che bảo mật</option>
            <option value="RAW">Nguyên bản</option>
          </NativeSelect>
        </div>

        <div className="flex flex-col items-start gap-1">
          <label className="text-caption font-semibold text-text-muted">Trần của chuỗi</label>
          <NativeSelect
            aria-label={`Trần của chuỗi — ${field.fieldName.vi}`}
            value={rule.maxForm ?? field.propagation.ceiling.toChain}
            onChange={(e) => onChangeRule({ ...rule, maxForm: e.target.value as PropagationTarget })}
            className="text-body-sm h-8"
          >
            <option value="AGGREGATED">Tổng hợp</option>
            <option value="MASKED">Che bảo mật</option>
            <option value="RAW">Nguyên bản</option>
          </NativeSelect>
        </div>
      </div>
    </div>
  )
}
