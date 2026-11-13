"use client"

import React, { useState } from "react"
import { Coins } from "@/components/ui/icon-set/coins"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/select"
import type { CraftComplexity, IndustryCraftFeeSpec } from "@/modules/organization/domain/industry-plugin-contract"

interface ProductCraftFeeCardProps {
  productId: string
  attributes: Record<string, unknown>
  spec: IndustryCraftFeeSpec
  onUpdated?: (() => void) | undefined
}

const LEVELS: CraftComplexity[] = ["EASY", "MEDIUM", "HARD"]

/**
 * Phí làm thay riêng của mẫu (cách tính "Phí cố định theo từng mẫu") và độ khó (cách tính
 * "Nguyên liệu + công theo độ khó"). Lưu ở `products.attributes.craft_fee_vnd` / `craft_complexity`.
 */
export function ProductCraftFeeCard({ productId, attributes, spec, onUpdated }: ProductCraftFeeCardProps) {
  const [fee, setFee] = useState<number>(typeof attributes.craft_fee_vnd === "number" ? attributes.craft_fee_vnd : 0)
  const [level, setLevel] = useState<CraftComplexity | "">(
    attributes.craft_complexity === "EASY" || attributes.craft_complexity === "MEDIUM" || attributes.craft_complexity === "HARD" ? attributes.craft_complexity : ""
  )
  // Kiểu dáng tính phí chế tác ngày lễ (PO Q8, checklist ALG 3.6)
  const [craftStyle, setCraftStyle] = useState<string>(typeof attributes.craftStyle === "string" ? attributes.craftStyle : "")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const next: Record<string, unknown> = { ...attributes, craft_fee_vnd: fee > 0 ? fee : null, craft_complexity: level || null, craftStyle: craftStyle || null }
      const res = await fetch(`/api/v1/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attributes: next }),
      })
      if (!res.ok) throw new Error(`Lưu thất bại (${res.status})`)
      setMessage({ ok: true, text: "Đã lưu." })
      onUpdated?.()
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Không lưu được" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div>
        <h3 className="text-body font-extrabold text-text flex items-center gap-2">
          <Coins size={18} className="text-primary" /> {spec.feeLabel} của mẫu này
        </h3>
        <p className="text-caption text-text-muted">Dùng khi cửa hàng chọn cách tính theo từng mẫu hoặc theo độ khó. Để trống thì tính theo % giá hàng.</p>
      </div>
      <label className="flex items-center justify-between gap-3 text-body-sm text-text">
        Phí cố định cho một sản phẩm
        <Input
          type="number"
          min={0}
          step={10_000}
          value={fee || ""}
          onChange={(e) => setFee(Math.max(0, Number(e.target.value) || 0))}
          placeholder="Chưa đặt"
          className="w-36 text-right font-bold"
        />
      </label>
      {spec.styles && spec.styles.length > 0 && (
        <label className="flex items-center justify-between gap-3 text-body-sm text-text">
          Kiểu dáng (giá ngày lễ)
          <NativeSelect value={craftStyle} onChange={(e) => setCraftStyle(e.target.value)} className="w-44">
            <option value="">Chưa gắn</option>
            {spec.styles.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </NativeSelect>
        </label>
      )}
      <label className="flex items-center justify-between gap-3 text-body-sm text-text">
        Độ khó khi làm
        <NativeSelect value={level} onChange={(e) => setLevel(e.target.value as CraftComplexity | "")} className="w-36">
          <option value="">Chưa đặt</option>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {spec.complexityLabels[l]}
            </option>
          ))}
        </NativeSelect>
      </label>
      <div className="flex items-center justify-end gap-3">
        {message && <span className={`text-caption ${message.ok ? "text-success" : "text-danger"}`}>{message.text}</span>}
        <Button type="button" variant="primary" size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" /> : "Lưu"}
        </Button>
      </div>
    </Card>
  )
}
