"use client"

import React, { useState } from "react"
import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Store } from "@/components/ui/icon-set/store"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"

interface AddBranchModalProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly onSuccess: () => void
}

export function AddBranchModal({ isOpen, onClose, onSuccess }: AddBranchModalProps) {
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [address, setAddress] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !code.trim()) {
      setError("Vui lòng nhập đầy đủ tên và mã cửa hàng.")
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/v1/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          address: address.trim() || null,
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error?.message || "Không thể tạo chi nhánh mới.")
      }

      setName("")
      setCode("")
      setAddress("")
      onSuccess()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra.")
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
      title="Thêm Cửa Hàng / Chi Nhánh Trực Thuộc Mới"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-caption text-text-muted">
          Chi nhánh trực thuộc cùng chủ sở hữu/pháp nhân. Toàn bộ dữ liệu sản phẩm, đơn hàng, tồn kho sẽ tự động thu thập theo Chain Collection Profile.
        </p>

        {error && (
          <div className="p-3 rounded-xl border border-danger/30 bg-danger/10 text-danger text-caption font-semibold flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-caption font-bold text-text">Tên cửa hàng / Chi nhánh *</label>
          <Input
            type="text"
            required
            placeholder="Ví dụ: Chi nhánh Cầu Giấy, Chi nhánh Q1…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-body-sm h-10 px-3 rounded-xl border border-border bg-surface focus:outline-primary"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-caption font-bold text-text">Mã chi nhánh *</label>
          <Input
            type="text"
            required
            placeholder="Ví dụ: CG-01, SG-02…"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="w-full text-body-sm font-mono h-10 px-3 rounded-xl border border-border bg-surface focus:outline-primary"
          />
          <p className="text-caption text-text-muted">Mã duy nhất dùng để phân biệt các đơn hàng và hàng tồn kho.</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-caption font-bold text-text">Địa chỉ cửa hàng</label>
          <Input
            type="text"
            placeholder="Ví dụ: Số 88 Đường Cầu Giấy, Hà Nội"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full text-body-sm h-10 px-3 rounded-xl border border-border bg-surface focus:outline-primary"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          <Button type="submit" size="sm" disabled={loading} className="font-bold bg-primary text-white">
            {loading ? "Đang tạo…" : "Đăng Ký Chi Nhánh"}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
