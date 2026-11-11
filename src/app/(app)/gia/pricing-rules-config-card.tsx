"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"

export interface PricingRulesConfigCardProps {
  initialTierRows: { name: string; percent: number }[]
  initialOptimalPercent: number
  initialFloorRatio: number
  initialCeilingRatio: number
  branchId: string | null
  canEdit: boolean
  onSaved: (data: {
    partnerTierBonus: Record<string, number>
    optimalPriceRatio: number
    floorRatio: number
    ceilingRatio: number
  }) => void
}

export function PricingRulesConfigCard({
  initialTierRows,
  initialOptimalPercent,
  initialFloorRatio,
  initialCeilingRatio,
  branchId,
  canEdit,
  onSaved,
}: PricingRulesConfigCardProps) {
  const [tierRows, setTierRows] = useState<{ name: string; percent: number }[]>(initialTierRows)
  const [optimalPercent, setOptimalPercent] = useState(initialOptimalPercent)
  const [floorRatio, setFloorRatio] = useState(initialFloorRatio)
  const [ceilingRatio, setCeilingRatio] = useState(initialCeilingRatio)
  const [dangLuu, setDangLuu] = useState(false)
  const [loiLuu, setLoiLuu] = useState<string | null>(null)
  const [luuThanhCong, setLuuThanhCong] = useState(false)

  async function luuCauHinh() {
    setDangLuu(true)
    setLoiLuu(null)
    setLuuThanhCong(false)
    try {
      const partnerTierBonus = Object.fromEntries(
        tierRows.filter((r) => r.name.trim() !== "").map((r) => [r.name.trim(), r.percent / 100])
      )
      const puts = [
        { key: "partner_tier_bonus", value: partnerTierBonus },
        { key: "optimal_price_ratio", value: optimalPercent / 100 },
        { key: "floor_ceiling_ratio", value: { floorRatio, ceilingRatio } },
      ]
      for (const body of puts) {
        const res = await fetch("/api/v1/pricing-rules", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
          throw new Error(data?.error?.message ?? `Không lưu được "${body.key}" (${res.status})`)
        }
      }
      onSaved({
        partnerTierBonus,
        optimalPriceRatio: optimalPercent / 100,
        floorRatio,
        ceilingRatio,
      })
      setLuuThanhCong(true)
    } catch (e) {
      setLoiLuu(e instanceof Error ? e.message : "Không lưu được cấu hình")
    } finally {
      setDangLuu(false)
    }
  }

  return (
    <Card className="flex flex-col gap-3.5 p-4">
      <div>
        <div className="text-body-sm font-bold text-text">Cấu hình quy tắc giá của tổ chức</div>
        <div className="mt-0.5 text-caption text-text-muted">
          Áp dụng cho mọi lượt tính giá.{" "}
          {branchId ? "Đang xem theo chi nhánh của bạn." : "Áp dụng cho toàn tổ chức."}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-caption font-semibold text-text-muted">Thưởng theo hạng đối tác xưởng</div>
        {tierRows.map((row, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <Input
              value={row.name}
              disabled={!canEdit}
              onChange={(e) =>
                setTierRows((cur) => cur.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r)))
              }
              placeholder="Tên hạng đối tác"
              className="flex-1"
            />
            <Input
              type="number"
              aria-label={`Phần trăm của hạng ${row.name || idx + 1}`}
              disabled={!canEdit}
              value={row.percent}
              onChange={(e) =>
                setTierRows((cur) =>
                  cur.map((r, i) => (i === idx ? { ...r, percent: Number(e.target.value) } : r))
                )
              }
              className="w-20 text-right"
            />
            <span className="text-caption text-text-muted">%</span>
            {canEdit && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setTierRows((cur) => cur.filter((_, i) => i !== idx))}
                className="px-1 text-caption font-bold text-danger hover:underline h-auto"
              >
                Xoá
              </Button>
            )}
          </div>
        ))}
        {canEdit && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setTierRows((cur) => [...cur, { name: "", percent: 0 }])}
            className="w-fit text-caption font-bold text-primary hover:underline h-auto px-0"
          >
            + Thêm hạng đối tác
          </Button>
        )}
      </div>

      <label className="flex flex-col gap-1 text-caption font-medium text-text">
        <span>Tỷ lệ giá tối ưu / giá bán (%)</span>
        <Input
          type="number"
          min={0}
          max={100}
          disabled={!canEdit}
          value={optimalPercent}
          onChange={(e) => setOptimalPercent(Number(e.target.value))}
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-caption font-medium text-text">
          <span>Hệ số Sàn (× giá vốn)</span>
          <Input
            type="number"
            min={0}
            step={0.1}
            disabled={!canEdit}
            value={floorRatio}
            onChange={(e) => setFloorRatio(Number(e.target.value))}
          />
        </label>
        <label className="flex flex-col gap-1 text-caption font-medium text-text">
          <span>Hệ số Trần (× giá vốn)</span>
          <Input
            type="number"
            min={0}
            step={0.1}
            disabled={!canEdit}
            value={ceilingRatio}
            onChange={(e) => setCeilingRatio(Number(e.target.value))}
          />
        </label>
      </div>

      <div className="rounded-xl bg-surface-alt p-3 text-caption text-text-muted leading-relaxed">
        Danh mục phụ phí (Hỗ trợ ship/giao nhận, Phụ phí xử lý gấp…) được thiết lập tập trung từ hệ thống — máy tính giá luôn sử dụng danh sách nhóm đã cấu hình sẵn.
      </div>

      {canEdit ? (
        <div className="flex flex-col gap-2">
          {loiLuu && (
            <div className="rounded-xl border border-danger/30 bg-danger-bg p-2.5 text-caption font-medium text-danger">
              {loiLuu}
            </div>
          )}
          {luuThanhCong && (
            <div className="rounded-xl border border-secondary/30 bg-secondary-bg p-2.5 text-caption font-medium text-secondary">
              Đã lưu quy tắc giá thành công.
            </div>
          )}
          <Button
            type="button"
            onClick={luuCauHinh}
            disabled={dangLuu}
            className="min-h-11 w-full"
          >
            {dangLuu ? "Đang lưu cấu hình…" : "Lưu quy tắc giá"}
          </Button>
        </div>
      ) : (
        <div className="rounded-xl bg-surface-alt p-2.5 text-center text-caption text-text-muted">
          Chỉ vai Điều hành (năng lực L6) mới có quyền chỉnh sửa quy tắc giá của tổ chức.
        </div>
      )}
    </Card>
  )
}
