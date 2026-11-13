"use client"

import { useState } from "react"
import { Pencil } from "@/components/ui/icon-set/pencil"
import { Plus } from "@/components/ui/icon-set/plus"
import { X } from "@/components/ui/icon-set/x"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export interface ResultFieldItem {
  id: string
  value?: string
  name?: string | null | undefined
  unit?: string | null | undefined
  quantity?: number | string | null | undefined
  role?: string | null | undefined
  color?: string | null | undefined
  extra?: string | null | undefined
}

export interface ResultField {
  key: string
  label: string
  type: "text" | "textarea" | "number" | "list" | "readonly"
  value: string | string[] | number | ResultFieldItem[]
  editable: boolean
  confidence?: number | null
  placeholder?: string
}

export function ConfidenceBadge({ value }: { value: number | null | undefined }) {
  if (value == null) return null
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-caption font-bold",
        value >= 80 ? "bg-success-bg text-secondary"
          : value >= 60 ? "bg-warning-bg text-warning-text"
          : "bg-danger-bg text-danger"
      )}
    >
      Tin cậy {value}%
    </span>
  )
}

export interface FieldCardProps {
  field: ResultField
  onFieldChange?: ((key: string, value: string | number | string[]) => void) | undefined
  onFieldAdd?: ((key: string, item: ResultFieldItem) => void) | undefined
  onFieldRemove?: ((key: string, itemId: string) => void) | undefined
  onItemChange?: ((key: string, itemId: string, item: ResultFieldItem) => void) | undefined
  editable: boolean
}

export function FieldCard({
  field,
  onFieldChange,
  onFieldAdd,
  onFieldRemove,
  onItemChange,
  editable,
}: FieldCardProps) {
  const [localValue, setLocalValue] = useState<string>(
    typeof field.value === "string" ? field.value : String(field.value ?? "")
  )

  if (field.type === "readonly") {
    return (
      <div className="flex items-center justify-between gap-2 py-2">
        <span className="text-body-sm text-text-muted">{field.label}</span>
        <span className="text-body-sm font-semibold text-text">
          {field.value != null && String(field.value).trim() !== "" && String(field.value) !== "—"
            ? String(field.value)
            : "N/A"}
        </span>
      </div>
    )
  }

  if (field.type === "list") {
    const items = field.value as ResultFieldItem[]
    return (
      <div className="flex flex-col gap-2 py-2">
        <div className="flex items-center justify-between">
          <span className="text-body-sm font-semibold text-text">{field.label}</span>
          <ConfidenceBadge value={field.confidence ?? null} />
        </div>
        {items.length === 0 && (
          <div className="rounded-lg bg-surface-alt/50 px-3 py-2 text-meta text-text-muted italic border border-dashed border-border/80">
            N/A (Chưa có dữ liệu)
          </div>
        )}
        {items.map((item) => {
          const isStructured = item.quantity !== undefined || item.unit !== undefined || item.name !== undefined

          if (isStructured) {
            return (
              <div
                key={item.id}
                className="flex flex-wrap items-center gap-2.5 rounded-xl bg-surface-alt/70 p-2.5 border border-border hover:border-primary/40 transition-colors"
              >
                {/* Tên thành phần */}
                <div className="flex-1 min-w-[150px]">
                  {editable ? (
                    <Input
                      type="text"
                      value={item.name ?? ""}
                      onChange={(e) =>
                        onItemChange?.(field.key, item.id, { ...item, name: e.target.value })
                      }
                      placeholder="Tên thành phần"
                    />
                  ) : (
                    <span className="text-body-sm font-semibold text-text">{item.name || "N/A"}</span>
                  )}
                </div>

                {/* Đơn vị */}
                <div className="flex items-center gap-1.5">
                  <span className="text-caption font-medium text-text-muted">Đơn vị:</span>
                  {editable ? (
                    <Input
                      type="text"
                      value={item.unit ?? "cành"}
                      onChange={(e) =>
                        onItemChange?.(field.key, item.id, { ...item, unit: e.target.value })
                      }
                      placeholder="ĐVT"
                      className="w-20"
                    />
                  ) : (
                    <span className="rounded-md bg-surface px-2 py-0.5 text-meta font-medium text-text border border-border/60">
                      {item.unit ?? "cành"}
                    </span>
                  )}
                </div>

                {/* Số lượng */}
                <div className="flex items-center gap-1.5">
                  <span className="text-caption font-semibold text-primary">Số lượng:</span>
                  {editable ? (
                    <Input
                      type="number"
                      min="0"
                      value={item.quantity ?? ""}
                      onChange={(e) => {
                        const val = e.target.value === "" ? null : Number(e.target.value)
                        onItemChange?.(field.key, item.id, { ...item, quantity: val })
                      }}
                      placeholder="SL"
                      className="w-20 text-center font-bold text-primary"
                    />
                  ) : (
                    <span className="font-bold text-body-sm text-primary bg-primary/10 px-2.5 py-0.5 rounded-md">
                      {item.quantity != null ? item.quantity : "N/A"}
                    </span>
                  )}
                </div>

                {/* Badges / Extras */}
                {(item.role || item.color || item.extra) && (
                  <div className="flex flex-wrap items-center gap-1.5 text-caption text-text-muted">
                    {item.role && (
                      <span className="bg-surface px-2 py-0.5 rounded-full border border-border/60 font-medium text-text">
                        {item.role}
                      </span>
                    )}
                    {item.color && (
                      <span className="bg-surface px-2 py-0.5 rounded-full border border-border/60 text-text">
                        {item.color}
                      </span>
                    )}
                    {item.extra && <span className="text-text-muted italic">{item.extra}</span>}
                  </div>
                )}

                {/* Nút xoá */}
                {editable && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onFieldRemove?.(field.key, item.id)}
                    className="ml-auto flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full p-0 text-text-muted hover:bg-danger-bg hover:text-danger"
                    aria-label="Xoá mục này"
                  >
                    <X size={13} strokeWidth={2} />
                  </Button>
                )}
              </div>
            )
          }

          // Simple string item fallback
          return (
            <div key={item.id} className="flex items-center gap-2 rounded-lg bg-surface-alt px-2.5 py-1.5">
              <span className="flex-1 text-body-sm text-text">{item.value}</span>
              {editable && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onFieldRemove?.(field.key, item.id)}
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full p-0 text-text-muted hover:bg-surface"
                  aria-label={`Bỏ ${item.value}`}
                >
                  <X size={13} strokeWidth={2} />
                </Button>
              )}
            </div>
          )
        })}
        {editable && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              const defaultUnit = field.key === "flowers" ? "bông" : field.key === "accessories" ? "cái" : "cành"
              onFieldAdd?.(field.key, { id: crypto.randomUUID(), name: "", unit: defaultUnit, quantity: 1, value: "" })
            }}
            className="mt-0.5 h-auto self-start p-0 flex items-center gap-1.5 text-meta font-bold text-accent-text hover:bg-transparent"
          >
            <Plus size={14} strokeWidth={2.4} /> Thêm dòng
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1 py-1.5">
      <div className="flex items-center justify-between">
        <span className="text-body-sm font-semibold text-text">{field.label}</span>
        <ConfidenceBadge value={field.confidence ?? null} />
      </div>
      {field.type === "textarea" ? (
        editable ? (
          <Textarea
            value={localValue}
            onChange={(e) => {
              setLocalValue(e.target.value)
              onFieldChange?.(field.key, e.target.value)
            }}
            className="min-h-[60px]"
            placeholder={field.placeholder}
          />
        ) : (
          <div className="text-body-sm text-text leading-relaxed">{localValue && localValue !== "—" ? localValue : "N/A"}</div>
        )
      ) : (
        <div className="flex items-center gap-2">
          {editable ? (
            <Input
              type={field.type === "number" ? "number" : "text"}
              value={localValue}
              onChange={(e) => {
                setLocalValue(e.target.value)
                onFieldChange?.(field.key, e.target.value)
              }}
              className="flex-1"
              placeholder={field.placeholder}
            />
          ) : (
            <span className="text-body-sm text-text">{localValue && localValue !== "—" ? localValue : "N/A"}</span>
          )}
          {editable && (
            <Pencil size={14} strokeWidth={1.8} className="text-text-muted" />
          )}
        </div>
      )}
    </div>
  )
}
