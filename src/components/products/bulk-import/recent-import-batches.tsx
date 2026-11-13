"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { Button } from "@/components/ui/button"

type Batch = { id: string; createdAt: string; createdCount: number; updatedCount: number; undoneAt: string | null; canUndo: boolean }

/**
 * Lô nhập gần đây — Điều hành hoàn tác một lô trong 24 giờ: mẫu lô tạo ra vào
 * thùng rác (khôi phục được), mẫu bị cập nhật trả về nội dung trước lô.
 */
export function RecentImportBatches() {
  const [items, setItems] = useState<Batch[]>([])
  const [xacNhan, setXacNhan] = useState<string | null>(null)
  const [dangGui, setDangGui] = useState(false)
  const [thongBao, setThongBao] = useState<string | null>(null)

  const tai = useCallback(async () => {
    const res = await fetch("/api/v1/products/import-batches")
    if (res.ok) setItems(((await res.json()) as { data: Batch[] }).data.filter((b) => b.createdCount + b.updatedCount > 0))
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải danh sách lô khi mở màn kết quả; setState nằm trong hàm tải
    void tai()
  }, [tai])

  if (items.length === 0) return null

  const hoanTac = async (id: string) => {
    setDangGui(true)
    setThongBao(null)
    try {
      const res = await fetch(`/api/v1/products/import-batches/${id}/undo`, { method: "POST" })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.error?.message || "Không hoàn tác được, vui lòng thử lại")
      setThongBao(`Đã hoàn tác: ${body.trashed} mẫu vào thùng rác, ${body.restored} mẫu trả về bản trước.`)
      setXacNhan(null)
      await tai()
    } catch (e) {
      setThongBao(e instanceof Error ? e.message : "Không hoàn tác được, vui lòng thử lại")
    } finally {
      setDangGui(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border p-3 text-left">
      <h3 className="text-body-sm font-bold text-text">Lô nhập gần đây</h3>
      {thongBao && <p role="status" className="text-body-sm text-text-muted">{thongBao}</p>}
      <ul className="flex flex-col divide-y divide-border">
        {items.map((b) => (
          <li key={b.id} className="flex flex-wrap items-center gap-2 py-2 text-body-sm">
            <span className="min-w-0 flex-1 text-text">
              {new Date(b.createdAt).toLocaleString("vi-VN")} · thêm {b.createdCount}, cập nhật {b.updatedCount}
              {b.undoneAt ? " · đã hoàn tác" : ""}
            </span>
            {b.canUndo &&
              (xacNhan === b.id ? (
                <>
                  <Button size="sm" variant="outline" disabled={dangGui} onClick={() => setXacNhan(null)}>Huỷ</Button>
                  <Button size="sm" className="font-bold" disabled={dangGui} onClick={() => hoanTac(b.id)}>
                    {dangGui && <Loader2 size={15} className="animate-spin motion-reduce:animate-none" />}
                    <span>Xác nhận hoàn tác</span>
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setXacNhan(b.id)}>Hoàn tác lô này</Button>
              ))}
          </li>
        ))}
      </ul>
    </div>
  )
}
