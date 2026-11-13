"use client"

import React, { useState } from "react"
import { Plus } from "@/components/ui/icon-set/plus"
import { X } from "@/components/ui/icon-set/x"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { IndustryVariantDimensionPreset } from "@/modules/organization/domain/industry-plugin-contract"
import { MAX_DIMENSIONS, MAX_DIMENSION_VALUES, type PriceDimension } from "@/modules/products/domain/product-pricing"

interface Props {
  presets: readonly IndustryVariantDimensionPreset[]
  dimensions: PriceDimension[]
  onChange: (dims: PriceDimension[]) => void
}

const chip = (on: boolean) =>
  `inline-flex items-center gap-1 min-h-8 rounded-full border px-3 text-caption font-semibold transition-colors ${
    on ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-text hover:bg-surface-alt"
  }`

/** Chọn tối đa 2 nhóm đặc điểm (gợi ý theo ngành hoặc tự đặt) và các giá trị của từng nhóm. */
export function PricingDimensionsPicker({ presets, dimensions, onChange }: Props) {
  const [customName, setCustomName] = useState("")
  const used = new Set(dimensions.map((d) => d.key))
  const full = dimensions.length >= MAX_DIMENSIONS

  const addDimension = (d: PriceDimension) => !full && onChange([...dimensions, d])
  const update = (i: number, d: PriceDimension) => onChange(dimensions.map((x, j) => (j === i ? d : x)))
  const remove = (i: number) => onChange(dimensions.filter((_, j) => j !== i))

  return (
    <div className="space-y-3">
      <div>
        <span className="block text-caption text-text-muted mb-1">
          Giá khác nhau theo đặc điểm nào? (tối đa {MAX_DIMENSIONS} nhóm)
        </span>
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <Button
              key={p.key}
              type="button"
              variant="outline"
              size="sm"
              disabled={used.has(p.key) || full}
              onClick={() => addDimension({ key: p.key, label: p.label, values: p.values.slice(0, 3) })}
              className={`${chip(used.has(p.key))} disabled:opacity-60 h-auto p-0 px-3`}
            >
              {!used.has(p.key) && <Plus className="h-3 w-3" aria-hidden />}
              {p.label}
            </Button>
          ))}
        </div>
        {!full && (
          <div className="mt-2 flex gap-2">
            <Input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Hoặc tự đặt tên nhóm, ví dụ: Kiểu nơ"
              aria-label="Tên nhóm đặc điểm khác"
              className="h-9 flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!customName.trim()}
              onClick={() => {
                addDimension({ key: `CUSTOM_${Date.now()}`, label: customName.trim(), values: [] })
                setCustomName("")
              }}
              className="h-9 text-body-sm font-semibold text-text"
            >
              Thêm nhóm
            </Button>
          </div>
        )}
      </div>

      {dimensions.map((d, i) => (
        <DimensionValues
          key={d.key}
          dimension={d}
          suggested={presets.find((p) => p.key === d.key)?.values ?? []}
          onChange={(next) => update(i, next)}
          onRemove={() => remove(i)}
        />
      ))}
    </div>
  )
}

function DimensionValues({
  dimension,
  suggested,
  onChange,
  onRemove,
}: {
  dimension: PriceDimension
  suggested: readonly string[]
  onChange: (d: PriceDimension) => void
  onRemove: () => void
}) {
  const [draft, setDraft] = useState("")
  const has = (v: string) => dimension.values.some((x) => x.toLowerCase() === v.toLowerCase())
  const toggle = (v: string) =>
    onChange({ ...dimension, values: has(v) ? dimension.values.filter((x) => x.toLowerCase() !== v.toLowerCase()) : [...dimension.values, v] })
  const extra = dimension.values.filter((v) => !suggested.some((s) => s.toLowerCase() === v.toLowerCase()))
  const canAdd = dimension.values.length < MAX_DIMENSION_VALUES
  const addDraft = () => {
    const v = draft.trim()
    if (v && !has(v)) onChange({ ...dimension, values: [...dimension.values, v] })
    setDraft("")
  }

  return (
    <div className="rounded-xl border border-border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-body-sm font-semibold text-text">{dimension.label}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="text-caption text-text-muted hover:text-danger h-auto p-0 hover:bg-transparent font-normal"
        >
          Bỏ nhóm này
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {[...suggested, ...extra].map((v) => (
          <Button
            key={v}
            type="button"
            variant="outline"
            size="sm"
            aria-pressed={has(v)}
            disabled={!has(v) && !canAdd}
            onClick={() => toggle(v)}
            className={`${chip(has(v))} h-auto p-0 px-3`}
          >
            {v}
            {has(v) && extra.includes(v) && <X className="h-3 w-3" aria-hidden />}
          </Button>
        ))}
      </div>
      {canAdd && (
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              // Nằm trong form sản phẩm: Enter thêm giá trị, không gửi form
              if (e.key === "Enter") {
                e.preventDefault()
                addDraft()
              }
            }}
            placeholder={`Thêm ${dimension.label.toLowerCase()} khác`}
            aria-label={`Thêm giá trị cho ${dimension.label}`}
            className="h-9 flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addDraft}
            className="h-9 text-body-sm font-semibold text-text"
          >
            Thêm
          </Button>
        </div>
      )}
    </div>
  )
}
