"use client"

import React, { useState } from "react"
import { DollarSign } from "@/components/ui/icon-set/dollar-sign"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { Plus } from "@/components/ui/icon-set/plus"
import { RotateCcw } from "@/components/ui/icon-set/rotate-ccw"
import { Save } from "@/components/ui/icon-set/save"
import { Trash2 } from "@/components/ui/icon-set/trash2"
import { Wand2 } from "@/components/ui/icon-set/wand2"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Disclosure } from "@/components/ui/disclosure"
import { apiSend, useApi } from "@/components/greeting-card/greeting-api"
import {
  DEFAULT_PRICE_BUDGETS,
  MAX_PRICE_BUDGETS,
  PRICE_BUDGETS_SETTINGS_KEY,
  defaultBudgetLabel,
  generatePriceBudgets,
  priceBudgetErrors,
  readPriceBudgets,
  serializePriceBudgets,
  type PriceBudget,
} from "@/lib/price-budgets"

const FIELD = "h-8 rounded-lg border border-border bg-surface px-2 text-body-sm"
const toNum = (v: string): number | null => {
  const digits = v.replace(/\D/g, "")
  return digits ? Number(digits) : null
}
const fmt = (n: number | null) => (n === null ? "" : n.toLocaleString("vi-VN"))

/**
 * Khoảng giá lọc nhanh sản phẩm / mẫu (Điều hành tự đặt). Dùng ở "Lọc nhanh sản phẩm",
 * "Tạo bộ sưu tập nhanh" và "Tư vấn theo ngân sách". Khoảng tính từ giá "Từ"
 * đến dưới giá "Đến"; để trống "Đến" = không giới hạn.
 */
export function PriceBudgetsSection() {
  const org = useApi<{ settings?: Record<string, unknown> | null }>("/api/v1/organizations/current")
  const [draft, setDraft] = useState<PriceBudget[] | null>(null)
  const [gen, setGen] = useState({ from: "400000", to: "1500000", step: "200000" })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const budgets = draft ?? (org.data ? readPriceBudgets(org.data.settings) : null)
  const errors = budgets ? priceBudgetErrors(budgets) : []

  const edit = (next: PriceBudget[]) => {
    setDraft(next)
    setMessage(null)
  }
  const setRow = (i: number, patch: Partial<PriceBudget>) =>
    budgets && edit(budgets.map((b, j) => (j === i ? { ...b, ...patch } : b)))
  const addRow = () => {
    if (!budgets) return
    const last = budgets[budgets.length - 1]
    const min = last ? (last.max ?? last.min + 200_000) : 0
    edit([...budgets, { id: `new${budgets.length}`, label: "", min, max: null }])
  }
  const generate = () => {
    const out = generatePriceBudgets(toNum(gen.from) ?? 0, toNum(gen.to) ?? 0, toNum(gen.step) ?? 0)
    if (out.length > 0) edit(out)
    else setMessage({ ok: false, text: "Giá đến phải lớn hơn giá từ và bước nhảy lớn hơn 0." })
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!budgets || errors.length > 0) return
    setSaving(true)
    try {
      await apiSend(
        "/api/v1/organizations/current",
        "PATCH",
        { settings: { [PRICE_BUDGETS_SETTINGS_KEY]: serializePriceBudgets(budgets) } },
        "Không lưu được khoảng giá",
      )
      await org.mutate()
      setDraft(null)
      setMessage({ ok: true, text: "Đã lưu khoảng giá." })
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Không lưu được khoảng giá" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="bg-surface rounded-2xl border border-border p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <DollarSign size={18} className="text-primary" aria-hidden="true" />
        <h3 className="text-title-sm font-extrabold text-text">Khoảng giá lọc nhanh sản phẩm</h3>
      </div>
      <p className="text-body-sm text-text-muted">
        Các nút khoảng giá khi tìm sản phẩm, tạo bộ sưu tập nhanh và tư vấn theo ngân sách. Mỗi khoảng tính từ giá “Từ” đến
        dưới giá “Đến”; để trống “Đến” nghĩa là không giới hạn.
      </p>
      {!budgets ? (
        <div className="h-20 rounded-lg bg-surface-alt animate-pulse motion-reduce:animate-none" aria-busy="true" />
      ) : (
        <div className="flex flex-col gap-3 text-body-sm">
          {budgets.map((b, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2">
              <label className="flex items-center gap-1">Từ
                <Input inputMode="numeric" aria-label={`Giá từ, khoảng ${i + 1}`} value={fmt(b.min)} onChange={(e) => setRow(i, { min: toNum(e.target.value) ?? 0 })} className="h-8 rounded-lg border border-border bg-surface px-2 text-body-sm w-28" />đ
              </label>
              <label className="flex items-center gap-1">đến dưới
                <Input inputMode="numeric" aria-label={`Giá đến, khoảng ${i + 1}`} value={fmt(b.max)} placeholder="Không giới hạn" onChange={(e) => setRow(i, { max: toNum(e.target.value) })} className="h-8 rounded-lg border border-border bg-surface px-2 text-body-sm w-32" />đ
              </label>
              <label className="flex items-center gap-1 flex-1 min-w-40">Tên nút
                <Input aria-label={`Tên nút, khoảng ${i + 1}`} value={b.label} placeholder={defaultBudgetLabel(b.min, b.max)} onChange={(e) => setRow(i, { label: e.target.value })} className="h-8 rounded-lg border border-border bg-surface px-2 text-body-sm flex-1" />
              </label>
              <Button type="button" size="sm" variant="ghost" aria-label={`Xoá khoảng ${i + 1}`} onClick={() => edit(budgets.filter((_, j) => j !== i))}>
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" className="gap-1" disabled={budgets.length >= MAX_PRICE_BUDGETS} onClick={addRow}>
              <Plus size={14} /> Thêm khoảng
            </Button>
            <Button type="button" size="sm" variant="ghost" className="gap-1" onClick={() => edit([...DEFAULT_PRICE_BUDGETS])}>
              <RotateCcw size={14} /> Dùng bộ mặc định
            </Button>
          </div>
          <Disclosure label="Tạo nhanh các khoảng đều nhau" className="p-3 text-caption">
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1">Từ <Input inputMode="numeric" value={fmt(toNum(gen.from))} onChange={(e) => setGen({ ...gen, from: e.target.value })} className="h-8 rounded-lg border border-border bg-surface px-2 text-body-sm w-28" />đ</label>
              <label className="flex items-center gap-1">đến <Input inputMode="numeric" value={fmt(toNum(gen.to))} onChange={(e) => setGen({ ...gen, to: e.target.value })} className="h-8 rounded-lg border border-border bg-surface px-2 text-body-sm w-28" />đ</label>
              <label className="flex items-center gap-1">mỗi khoảng <Input inputMode="numeric" value={fmt(toNum(gen.step))} onChange={(e) => setGen({ ...gen, step: e.target.value })} className="h-8 rounded-lg border border-border bg-surface px-2 text-body-sm w-28" />đ</label>
              <Button type="button" size="sm" variant="outline" className="gap-1" onClick={generate}>
                <Wand2 size={14} /> Tạo
              </Button>
            </div>
          </Disclosure>
        </div>
      )}
      {errors.length > 0 && (
        <ul role="alert" className="text-caption text-danger list-disc pl-5">
          {errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}
      <div className="flex items-center justify-between gap-3">
        <p role="status" className={`text-caption font-medium ${message ? (message.ok ? "text-success" : "text-danger") : "text-text-muted"}`}>
          {message?.text ?? `Tối đa ${MAX_PRICE_BUDGETS} khoảng, không được chồng lên nhau.`}
        </p>
        <Button type="submit" size="sm" disabled={saving || !draft || errors.length > 0} className="gap-1.5 shrink-0">
          {saving ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" /> : <Save size={14} />}
          <span>Lưu khoảng giá</span>
        </Button>
      </div>
    </form>
  )
}
