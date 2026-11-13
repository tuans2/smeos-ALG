"use client"

import React, { useState, useRef, useEffect } from "react"
import { ChevronDown } from "@/components/ui/icon-set/chevron-down"
import { X } from "@/components/ui/icon-set/x"
import { Check } from "@/components/ui/icon-set/check"
import { Plus } from "@/components/ui/icon-set/plus"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface MultiSelectDropdownProps {
  options: string[]
  /** Giá trị hiện tại dưới dạng chuỗi phân cách bằng dấu phẩy */
  value: string
  onChange: (value: string) => void
  placeholder?: string
  customPlaceholder?: string
  className?: string
  id?: string
  /** Tên đọc cho trình đọc màn hình (nhãn hiển thị của trường) */
  ariaLabel?: string
}

export function MultiSelectDropdown({
  options,
  value,
  onChange,
  placeholder = "Chọn (nhiều lựa chọn)...",
  customPlaceholder = "Nhập thêm lựa chọn khác...",
  className,
  id,
  ariaLabel,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false)
  const [customInput, setCustomInput] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  const selected = value
    ? value.split(",").map((s) => s.trim()).filter(Boolean)
    : []

  // Tất cả options bao gồm các item được thêm mới từ selected
  const allOptions = Array.from(new Set([...options, ...selected]))

  const toggle = (opt: string) => {
    const next = selected.includes(opt)
      ? selected.filter((s) => s !== opt)
      : [...selected, opt]
    onChange(next.join(","))
  }

  const removeChip = (opt: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(selected.filter((s) => s !== opt).join(","))
  }

  const handleAddCustom = () => {
    const trimmed = customInput.trim()
    if (!trimmed) return
    if (!selected.includes(trimmed)) {
      onChange([...selected, trimmed].join(","))
    }
    setCustomInput("")
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div ref={ref} className={`relative ${className ?? ""}`} id={id}>
      {/* Trigger */}
      <div
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        tabIndex={0}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            if (e.target === e.currentTarget) {
              e.preventDefault()
              setOpen(!open)
            }
          } else if (e.key === "Escape") {
            setOpen(false)
          }
        }}
        className="flex min-h-10 w-full items-start justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-1.5 text-body-sm cursor-pointer outline-none hover:border-primary/60 focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
      >
        <div className="flex flex-wrap gap-1 flex-1 pt-0.5">
          {selected.length === 0 ? (
            <span className="text-text-muted text-body-sm py-0.5">{placeholder}</span>
          ) : (
            selected.map((opt) => (
              <span
                key={opt}
                className="inline-flex items-center gap-0.5 rounded-md bg-primary/10 px-1.5 py-0.5 text-caption font-medium text-primary"
              >
                {opt}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={(e) => removeChip(opt, e)}
                  aria-label={`Bỏ chọn ${opt}`}
                  className="h-4 w-4 p-0 hover:bg-transparent hover:text-danger"
                >
                  <X size={10} />
                </Button>
              </span>
            ))
          )}
        </div>
        <ChevronDown
          size={14}
          className={`mt-1.5 flex-shrink-0 text-text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </div>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[220px] rounded-xl border border-border bg-surface shadow-lg overflow-hidden">
          <div className="max-h-56 overflow-y-auto">
            {allOptions.map((opt) => {
              const checked = selected.includes(opt)
              return (
                <Button
                  key={opt}
                  type="button"
                  variant="ghost"
                  size="sm"
                  role="option"
                  aria-selected={checked}
                  onClick={() => toggle(opt)}
                  className={`flex w-full items-center justify-start gap-2.5 px-3 py-2 text-body-sm text-left transition-colors h-auto rounded-none font-normal ${
                    checked ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-surface-alt"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors ${
                      checked ? "border-primary bg-primary text-white" : "border-border"
                    }`}
                  >
                    {checked && <Check size={10} strokeWidth={3} />}
                  </span>
                  <span className={checked ? "font-medium text-primary" : "text-text"}>
                    {opt}
                  </span>
                </Button>
              )
            })}
          </div>

          {/* Ô nhập tuỳ chỉnh khi không có trong danh sách */}
          <div className="border-t border-border p-2 bg-surface-alt/40">
            <div className="flex items-center gap-1.5">
              <Input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddCustom()
                  }
                }}
                placeholder={customPlaceholder}
                className="h-8 flex-1 text-caption"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleAddCustom}
                disabled={!customInput.trim()}
                className="h-8 gap-1 px-2.5 text-caption font-medium"
              >
                <Plus size={12} />
                <span>Thêm</span>
              </Button>
            </div>
          </div>

          {selected.length > 0 && (
            <div className="border-t border-border px-3 py-1.5 bg-surface">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { onChange(""); setOpen(false) }}
                className="w-full text-caption text-text-muted hover:text-danger h-auto p-1 font-normal hover:bg-transparent"
              >
                Xoá tất cả lựa chọn ({selected.length})
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
