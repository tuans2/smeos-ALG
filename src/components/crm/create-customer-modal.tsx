"use client"

import React, { useState } from "react"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { InlineError } from "@/components/ui/inline-error"
import { errorText } from "@/lib/error-text"

interface CreateCustomerModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreateCustomerModal({ isOpen, onClose, onSuccess }: CreateCustomerModalProps) {
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [address, setAddress] = useState("")
  const [notes, setNotes] = useState("")
  const [preferredFlowers, setPreferredFlowers] = useState("Hoa hồng, Baby")
  const [preferredColors, setPreferredColors] = useState("Pastel, Đỏ")
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim() || !phone.trim()) {
      setError("Vui lòng điền họ tên và số điện thoại khách hàng.")
      return
    }

    setLoading(true)
    try {
      const flowers = preferredFlowers.split(",").map((f) => f.trim()).filter(Boolean)
      const colors = preferredColors.split(",").map((c) => c.trim()).filter(Boolean)

      const res = await fetch("/api/v1/crm/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          notes: notes.trim() || undefined,
          preferredFlowers: flowers,
          preferredColors: colors,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || "Tạo khách hàng thất bại.")
      }

      onSuccess()
      onClose()
    } catch (err: unknown) {
      setError(errorText(err) || "Đã xảy ra lỗi khi tạo khách hàng.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title="Thêm Khách Hàng Mới"
      size="md"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          <Button
            type="submit"
            form="create-customer-form"
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />}
            Lưu khách hàng
          </Button>
        </>
      }
    >
      <form id="create-customer-form" onSubmit={handleSubmit} className="space-y-4 text-body-sm">
        {error && <InlineError message={error} />}

        <div>
          <label className="mb-1 block font-semibold text-text">Họ và tên khách hàng *</label>
          <Input
            type="text"
            className="w-full text-body-sm"
            placeholder="Nguyễn Văn A"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block font-semibold text-text">Số điện thoại *</label>
            <Input
              type="text"
              className="w-full text-body-sm"
              placeholder="0909xxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block font-semibold text-text">Email (tùy chọn)</label>
            <Input
              type="email"
              className="w-full text-body-sm"
              placeholder="khachhang@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block font-semibold text-text">Địa chỉ thường nhận hoa</label>
          <Input
            type="text"
            className="w-full text-body-sm"
            placeholder="Số nhà, đường, phường, quận..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block font-semibold text-text">Hoa yêu thích (phân cách bằng dấu phẩy)</label>
            <Input
              type="text"
              className="w-full text-body-sm"
              placeholder="Hồng đỏ, Baby, Tulip"
              value={preferredFlowers}
              onChange={(e) => setPreferredFlowers(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block font-semibold text-text">Gu màu ưa thích</label>
            <Input
              type="text"
              className="w-full text-body-sm"
              placeholder="Pastel, Đỏ rực rỡ, Trắng kem"
              value={preferredColors}
              onChange={(e) => setPreferredColors(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block font-semibold text-text">Ghi chú chăm sóc / Đặc điểm khách hàng</label>
          <Textarea
            rows={2}
            className="w-full text-body-sm"
            placeholder="Khách thích hoa sang trọng, hay tặng đối tác..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </form>
    </Dialog>
  )
}
