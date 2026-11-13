"use client"

import { NativeSelect } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import React, { useState } from "react"
import { Check, Loader2 } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { apiSend } from "@/components/greeting-card/greeting-api"
import { useI18n } from "@/lib/i18n"

type CreateForm = { code: string; name: string; type: "STANDARD" | "CLIENT"; description: string }

/** Hộp thoại tạo bộ sưu tập mới (mã trùng → báo lỗi 409 từ server). */
export function CatalogCreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { ti } = useI18n()
  const rawCatalogTitle = ti("catalogTitle") || "Bộ sưu tập"
  const isHomestay = rawCatalogTitle.toLowerCase().includes("phòng")
  const isFnb = rawCatalogTitle.toLowerCase().includes("thực đơn")
  const catalogHeading = isHomestay ? "Danh Sách Phòng" : isFnb ? "Thực Đơn Món" : "Bộ Sưu Tập"
  const placeholderName = isHomestay
    ? "VD: Danh Sách Phòng Cuối Tuần View Thung Lũng"
    : isFnb
    ? "VD: Thực Đơn Tiệc Mùa Thu"
    : "VD: Bộ Hoa 20/10 Phổ Thông"

  const [createForm, setCreateForm] = useState<CreateForm>({ code: "", name: "", type: "STANDARD", description: "" })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!createForm.code.trim() || !createForm.name.trim()) return
    setCreating(true)
    setError(null)
    try {
      await apiSend(
        "/api/v1/greeting-card/catalogs",
        "POST",
        {
          code: createForm.code.trim(),
          name: createForm.name.trim(),
          type: createForm.type,
          description: createForm.description.trim() || null,
        },
        "Không tạo được bộ sưu tập"
      )
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tạo được bộ sưu tập")
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !creating) onClose() }} size="sm"
      title={`Tạo ${catalogHeading} Mới`}>
      <div className="flex flex-col gap-4">
        <form onSubmit={handleCreate} className="flex flex-col gap-3.5">
          {error && <p role="alert" className="p-3 rounded-xl bg-danger-bg text-danger text-body-sm">{error}</p>}
          <div>
            <label className="block text-caption font-bold text-text mb-1">Mã nhận dạng *</label>
            <Input
              type="text"
              placeholder="VD: 20-10-basic, valentine-2027"
              value={createForm.code}
              onChange={(e) => setCreateForm((f) => ({ ...f, code: e.target.value }))}
              className="w-full h-10 px-3 rounded-lg border border-border bg-bg text-body text-text"
              required
            />
          </div>
          <div>
            <label className="block text-caption font-bold text-text mb-1">Tên {catalogHeading.toLowerCase()} *</label>
            <Input
              type="text"
              placeholder={placeholderName}
              value={createForm.name}
              onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full h-10 px-3 rounded-lg border border-border bg-bg text-body text-text"
              required
            />
          </div>
          <div>
            <label className="block text-caption font-bold text-text mb-1">Loại</label>
            <NativeSelect
              value={createForm.type}
              onChange={(e) => setCreateForm((f) => ({ ...f, type: e.target.value as "STANDARD" | "CLIENT" }))}
              className="w-full h-10 px-3 rounded-lg border border-border bg-bg text-body text-text"
            >
              <option value="STANDARD">Tiêu chuẩn (dùng chung)</option>
              <option value="CLIENT">Riêng theo khách</option>
            </NativeSelect>
          </div>
          <div>
            <label className="block text-caption font-bold text-text mb-1">Mô tả (không bắt buộc)</label>
            <Textarea
              placeholder="Ghi chú nội bộ về bộ sưu tập này..."
              value={createForm.description}
              onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-body text-text resize-none"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="h-10">
              Hủy
            </Button>
            <Button variant="primary"
              type="submit"
              disabled={creating}
              className="py-0 inline-flex items-center justify-center rounded-xl bg-primary hover:bg-primary-dark text-white font-bold h-10 px-5 gap-1.5 text-body-sm shadow-sm transition-colors disabled:opacity-50"
            >
              {creating ? <Loader2 size={15} className="animate-spin motion-reduce:animate-none" /> : <Check size={15} />}
              {creating ? "Đang tạo..." : "Tạo ngay"}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  )
}
