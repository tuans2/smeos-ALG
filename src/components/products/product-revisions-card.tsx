"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

type Revision = { id: string; reason: string; createdAt: string; snapshot: { name?: string; code?: string } }

const REASON_LABEL: Record<string, string> = {
  EDIT: "Trước khi Điều hành sửa",
  CHANGE_REQUEST: "Trước khi duyệt đề xuất sửa",
  IMPORT: "Trước khi nhập Excel",
  RESTORE: "Trước khi khôi phục",
}

/**
 * Lịch sử phiên bản của mẫu — Điều hành khôi phục về một bản cũ. Bản hiện tại
 * luôn được lưu lại trước khi khôi phục, nên thao tác này cũng hoàn tác được.
 */
export function ProductRevisionsCard({ productId, onChanged }: { productId: string; onChanged: () => void }) {
  const [items, setItems] = useState<Revision[]>([])
  const [xacNhan, setXacNhan] = useState<string | null>(null)
  const [dangGui, setDangGui] = useState(false)
  const [loi, setLoi] = useState<string | null>(null)

  const tai = useCallback(async () => {
    const res = await fetch(`/api/v1/products/${productId}/revisions`)
    if (res.ok) setItems(((await res.json()) as { data: Revision[] }).data)
  }, [productId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải lịch sử khi mở trang; setState nằm trong hàm tải
    void tai()
  }, [tai])

  if (items.length === 0) return null

  const khoiPhuc = async (id: string) => {
    setDangGui(true)
    setLoi(null)
    try {
      const res = await fetch(`/api/v1/products/${productId}/revisions/${id}/restore`, { method: "POST" })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.error?.message || "Không khôi phục được, vui lòng thử lại")
      setXacNhan(null)
      await tai()
      onChanged()
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không khôi phục được, vui lòng thử lại")
    } finally {
      setDangGui(false)
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <h2 className="text-body font-bold text-text">Lịch sử phiên bản</h2>
      {loi && <p className="text-body-sm text-danger">{loi}</p>}
      <ul className="flex flex-col divide-y divide-border">
        {items.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-2 py-2 text-body-sm">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-text">{new Date(r.createdAt).toLocaleString("vi-VN")}</p>
              <p className="truncate text-caption text-text-muted">
                {REASON_LABEL[r.reason] ?? "Phiên bản đã lưu"} · {r.snapshot.name} · #{r.snapshot.code}
              </p>
            </div>
            {xacNhan === r.id ? (
              <>
                <Button size="sm" variant="outline" disabled={dangGui} onClick={() => setXacNhan(null)}>Huỷ</Button>
                <Button size="sm" className="font-bold" disabled={dangGui} onClick={() => khoiPhuc(r.id)}>
                  {dangGui && <Loader2 size={15} className="animate-spin motion-reduce:animate-none" />}
                  <span>Xác nhận khôi phục</span>
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setXacNhan(r.id)}>Khôi phục bản này</Button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
}
