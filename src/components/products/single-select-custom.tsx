"use client"

import React, { useState, useRef, useEffect } from "react"
import { ChevronDown } from "@/components/ui/icon-set/chevron-down"
import { Check } from "@/components/ui/icon-set/check"
import { Plus } from "@/components/ui/icon-set/plus"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface SingleSelectCustomProps {
  options: string[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  customPlaceholder?: string
  className?: string
  id?: string
  /** Tên đọc cho trình đọc màn hình (nhãn hiển thị của trường) */
  ariaLabel?: string
}

export function SingleSelectCustom({
  options,
  value,
  onChange,
  placeholder = "-- Chọn --",
  customPlaceholder = "Nhập lựa chọn khác...",
  className,
  id,
  ariaLabel,
}: SingleSelectCustomProps) {
  const [open, setOpen] = useState(false)
  const [customInput, setCustomInput] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  // Danh sách options bao gồm cả giá trị tự nhập nếu không có trong preset
  const allOptions = Array.from(new Set([...options, ...(value && !options.includes(value) ? [value] : [])]))

  const handleSelect = (opt: string) => {
    onChange(opt)
    setOpen(false)
  }

  const handleAddCustom = () => {
    const trimmed = customInput.trim()
    if (!trimmed) return
    onChange(trimmed)
    setCustomInput("")
    setOpen(false)
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
        className="flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 text-body-sm cursor-pointer outline-none hover:border-primary/60 focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
      >
        <span className={`truncate ${value ? "text-text font-medium" : "text-text-muted"}`}>
          {value || placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`flex-shrink-0 text-text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[220px] rounded-xl border border-border bg-surface shadow-lg overflow-hidden">
          <div className="max-h-56 overflow-y-auto">
            {allOptions.map((opt) => {
              const selected = value === opt
              return (
                <Button
                  key={opt}
                  type="button"
                  variant="ghost"
                  size="sm"
                  role="option"
                  aria-selected={selected}
                  onClick={() => handleSelect(opt)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-body-sm text-left transition-colors h-auto rounded-none ${
                    selected ? "bg-primary/10 font-medium text-primary hover:bg-primary/15" : "hover:bg-surface-alt text-text"
                  }`}
                >
                  <span className="truncate">{opt}</span>
                  {selected && <Check size={14} className="text-primary flex-shrink-0" />}
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
        </div>
      )}
    </div>
  )
}
