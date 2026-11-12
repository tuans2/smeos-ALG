"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Trash2 } from "@/components/ui/icon-set/trash2"
import { TRASH_TYPE_LABEL } from "@/modules/storage/domain/trash-types"
import { RotateCcw } from "@/components/ui/icon-set/rotate-ccw"
import { Clock } from "@/components/ui/icon-set/clock"
import { AlertTriangle } from "@/components/ui/icon-set/alert-triangle"
import { RefreshCw } from "@/components/ui/icon-set/refresh-cw"
import { Search } from "@/components/ui/icon-set/search"
import { Folder } from "@/components/ui/icon-set/folder"
import { Layers } from "@/components/ui/icon-set/layers"
import { ShoppingBag } from "@/components/ui/icon-set/shopping-bag"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { ShieldCheck } from "@/components/ui/icon-set/shield-check"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import type { TrashItem } from "@/modules/storage/domain/trash-types"
import { readApiError } from "@/components/greeting-card/api-error"
import { formatDate } from "@/lib/i18n/formatters"

interface StorageTrashTabProps {
  onItemRestored?: () => void
}

export function StorageTrashTab({ onItemRestored }: StorageTrashTabProps) {
  const [confirm, confirmDialog] = useConfirmDialog()
  const [items, setItems] = useState<TrashItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [purgingId, setPurgingId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  const loadTrash = useCallback(async () => {
    setLoading(true)
    setErrorMsg("")
    try {
      const res = await fetch("/api/v1/storage/trash")
      if (res.status === 403) {
        setErrorMsg("Chỉ tài khoản Điều hành mới có quyền truy cập Thùng rác.")
        setItems([])
        return
      }
      if (!res.ok) throw new Error("Không thể tải danh sách thùng rác")
      const json = await res.json()
      setItems(Array.isArray(json.data) ? json.data : [])
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Đã có lỗi xảy ra")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTrash()
  }, [loadTrash])

  async function handleRestore(item: TrashItem) {
    setRestoringId(item.id)
    setErrorMsg("")
    setSuccessMsg("")
    try {
      const res = await fetch(`/api/v1/storage/trash/${item.id}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: item.type }),
      })
      if (!res.ok) {
        throw new Error(await readApiError(res, "Không thể khôi phục mục này"))
      }
      setSuccessMsg(`Đã khôi phục thành công: ${item.name}`)
      await loadTrash()
      onItemRestored?.()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Lỗi khi khôi phục")
    } finally {
      setRestoringId(null)
    }
  }

  async function handlePermanentDelete(item: TrashItem) {
    const confirmed = await confirm({
      title: `Xoá vĩnh viễn "${item.name}"?`,
      consequence: "Tệp bị xoá hẳn khỏi kho và không khôi phục được.",
      confirmLabel: "Xoá vĩnh viễn",
      tone: "danger",
    })
    if (!confirmed) return

    setPurgingId(item.id)
    setErrorMsg("")
    setSuccessMsg("")
    try {
      const res = await fetch(`/api/v1/storage/trash/${item.id}?type=${item.type}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        throw new Error(await readApiError(res, "Không thể xóa vĩnh viễn mục này"))
      }
      setSuccessMsg(`Đã xóa vĩnh viễn: ${item.name}`)
      await loadTrash()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Lỗi khi xóa vĩnh viễn")
    } finally {
      setPurgingId(null)
    }
  }

  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    return (
      item.name.toLowerCase().includes(q) ||
      (item.code && item.code.toLowerCase().includes(q))
    )
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Header notice */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-warning-bg border border-warning/30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-warning text-text flex items-center justify-center shrink-0">
            <Clock size={18} />
          </div>
          <div>
            <h4 className="text-body-sm font-extrabold text-text">
              Thùng Rác Lưu Trữ Tạm 30 Ngày (Quyền Điều Hành)
            </h4>
            <p className="text-caption text-text-muted mt-0.5">
              Các mục trong này sẽ tự động xóa vĩnh viễn sau 30 ngày. Điều hành có thể khôi phục lại bất kỳ lúc nào.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadTrash}
            disabled={loading}
            className="h-8 gap-1.5 text-caption font-bold"
          >
            <RefreshCw size={13} className={loading ? "animate-spin motion-reduce:animate-none" : ""} />
            <span>Làm mới</span>
          </Button>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-danger-bg text-danger text-body-sm font-bold flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-success-bg text-success text-body-sm font-bold flex items-center gap-2">
          <ShieldCheck size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted z-10 pointer-events-none" />
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm trong thùng rác theo tên hoặc mã..."
          className="pl-9"
        />
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="py-12 flex items-center justify-center gap-2 text-text-muted">
          <Loader2 size={20} className="animate-spin motion-reduce:animate-none" />
          <span className="text-body-sm">Đang kiểm tra thùng rác...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-surface border border-dashed border-border text-text-muted flex flex-col items-center">
          <Trash2 size={36} className="text-text-muted/40 mb-2" />
          <p className="text-body-sm font-bold text-text">Thùng rác hiện đang trống</p>
          <p className="text-caption text-text-muted mt-1">
            Không có ảnh hoặc sản phẩm nào bị xóa trong vòng 30 ngày qua.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredItems.map((item) => {
            const isDangerCountdown = item.daysRemaining <= 3
            return (
              <div
                key={item.id}
                className="p-4 rounded-2xl border border-border bg-surface flex flex-col justify-between gap-3 shadow-xs hover:border-border/80 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 rounded-xl bg-surface-alt border border-border overflow-hidden shrink-0 flex items-center justify-center">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Trash2 size={22} className="text-text-muted/40" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-surface-alt text-caption text-text-muted font-bold">
                        {TRASH_TYPE_LABEL[item.type]}
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded-md text-caption font-extrabold ${
                          isDangerCountdown
                            ? "bg-danger-bg text-danger-text border border-danger/30"
                            : "bg-warning-bg text-warning-text border border-warning/30"
                        }`}
                      >
                        {item.daysRemaining > 0
                          ? `Còn ${item.daysRemaining} ngày`
                          : "Sắp xóa tự động"}
                      </span>
                    </div>

                    <p className="text-body-sm font-bold text-text truncate mt-1.5" title={item.name}>
                      {item.name}
                    </p>

                    <p className="text-caption text-text-muted mt-0.5">
                      Xóa: {formatDate(item.trashedAt)}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={restoringId === item.id || purgingId === item.id}
                    onClick={() => handleRestore(item)}
                    className="h-8 px-3 text-caption font-bold gap-1 text-primary hover:bg-selected"
                  >
                    {restoringId === item.id ? (
                      <Loader2 size={13} className="animate-spin motion-reduce:animate-none" />
                    ) : (
                      <RotateCcw size={13} />
                    )}
                    <span>Khôi phục</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={restoringId === item.id || purgingId === item.id}
                    onClick={() => handlePermanentDelete(item)}
                    className="h-8 px-2.5 text-caption font-bold gap-1 text-danger hover:bg-danger-bg hover:border-danger/30"
                    title="Xóa vĩnh viễn ngay lập tức"
                  >
                    {purgingId === item.id ? (
                      <Loader2 size={13} className="animate-spin motion-reduce:animate-none" />
                    ) : (
                      <Trash2 size={13} />
                    )}
                    <span>Xóa hẳn</span>
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {confirmDialog}
    </div>
  )
}
