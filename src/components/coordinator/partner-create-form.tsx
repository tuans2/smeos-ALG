"use client"

import React, { useState } from "react"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/select"
import { CustomFieldsSection } from "./custom-fields-section"

export interface PartnerCreateFormProps {
  onSuccess: () => void
  onCancel: () => void
  onError: (msg: string) => void
}

export function PartnerCreateForm({ onSuccess, onCancel, onError }: PartnerCreateFormProps) {
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [province, setProvince] = useState("TP. Hồ Chí Minh")
  const [district, setDistrict] = useState("")
  const [address, setAddress] = useState("")
  const [tier, setTier] = useState<"STANDARD" | "PREFERRED" | "VIP">("STANDARD")
  const [capacity, setCapacity] = useState(15)
  const [customFields, setCustomFields] = useState<Record<string, unknown>>({})
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim() || !name.trim() || !phone.trim()) {
      onError("Vui lòng điền đầy đủ mã đối tác, tên xưởng và số điện thoại")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/v1/coordinator/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          name: name.trim(),
          phone: phone.trim(),
          province: province.trim() || undefined,
          district: district.trim() || undefined,
          address: address.trim() || undefined,
          tier,
          capacityDaily: Number(capacity) || 10,
          ...(Object.keys(customFields).length > 0 ? { customFields } : {}),
        }),
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error?.message || "Tạo đối tác thất bại")
      }
      onSuccess()
    } catch (err) {
      onError(err instanceof Error ? err.message : "Lỗi thêm đối tác")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3"
    >
      <div className="text-caption font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
        <Sparkles size={13} />
        Đăng ký xưởng đối tác mạng lưới mới
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-caption text-text-muted font-semibold block mb-1">Mã xưởng *</label>
          <Input
            placeholder="VD: XUONG-Q1-01"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="h-8 text-caption font-mono uppercase"
            required
          />
        </div>
        <div>
          <label className="text-caption text-text-muted font-semibold block mb-1">Tên tiệm / Xưởng *</label>
          <Input
            placeholder="Cửa Hàng Nắng Ban Mai"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 text-caption"
            required
          />
        </div>
        <div>
          <label className="text-caption text-text-muted font-semibold block mb-1">Số điện thoại *</label>
          <Input
            placeholder="0901234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-8 text-caption"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div>
          <label className="text-caption text-text-muted font-semibold block mb-1">Tỉnh / Thành phố</label>
          <Input
            placeholder="TP. Hồ Chí Minh"
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            className="h-8 text-caption"
          />
        </div>
        <div>
          <label className="text-caption text-text-muted font-semibold block mb-1">Quận / Huyện</label>
          <Input
            placeholder="Quận 1, Bình Thạnh..."
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="h-8 text-caption"
          />
        </div>
        <div>
          <label className="text-caption text-text-muted font-semibold block mb-1">Cấp bậc</label>
          <NativeSelect
            value={tier}
            onChange={(e) => setTier(e.target.value as "STANDARD" | "PREFERRED" | "VIP")}
            className="h-8 text-caption"
          >
            <option value="STANDARD">Tiêu chuẩn</option>
            <option value="PREFERRED">Ưu tiên</option>
            <option value="VIP">VIP</option>
          </NativeSelect>
        </div>
        <div>
          <label className="text-caption text-text-muted font-semibold block mb-1">Định mức đơn/ngày</label>
          <Input
            type="number"
            min={1}
            max={500}
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            className="h-8 text-caption"
          />
        </div>
      </div>

      <div>
        <label className="text-caption text-text-muted font-semibold block mb-1">Địa chỉ cụ thể</label>
        <Input
          placeholder="123 Nguyễn Huệ, Phường Bến Nghé"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="h-8 text-caption"
        />
      </div>

      {/* Trường tự tạo cho đối tác (Console → Trường dữ liệu) — chỉ hiện khi tổ chức đã tạo (audit L-09) */}
      <CustomFieldsSection entity="PARTNER" values={customFields} onChange={setCustomFields} />

      <div className="flex justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="text-caption"
        >
          Hủy
        </Button>
        <Button
          type="submit"
          variant="outline"
          size="sm"
          disabled={submitting}
          className="text-caption font-bold text-primary border-primary/40 hover:bg-primary/5"
        >
          {submitting ? "Đang lưu..." : "Lưu đối tác mới"}
        </Button>
      </div>
    </form>
  )
}
