"use client"

import React, { useCallback, useEffect, useState } from "react"
import { Eye, EyeOff, Pencil, Star, Trash2 } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { EmptyState } from "@/components/ui/empty-state"
import { InlineError } from "@/components/ui/inline-error"
import type { ShopReview } from "@/modules/shop-reviews/domain/review-rules"
import { ShopReviewForm, type ReviewDraft } from "./shop-review-form"

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json?.error?.message || json?.message || "Không lưu được, vui lòng thử lại.")
  return json.data as T
}

const toBody = (d: ReviewDraft) => JSON.stringify({ author_name: d.authorName, occasion: d.occasion || null, rating: d.rating, comment: d.comment })

/**
 * Đánh giá khách thật do chủ tiệm nhập — hiện ở mục "Khách hàng nói gì" trên trang khách
 * Landing/Catalog. Chỉ đánh giá đang bật mới hiện; không có đánh giá nào thì mục đó tự ẩn.
 */
export function ShopReviewsManager() {
  const [reviews, setReviews] = useState<ShopReview[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<ShopReview | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await call<ShopReview[]>("/api/v1/shop-reviews")
      setError(null)
      setReviews(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được đánh giá.")
    }
  }, [])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- tải danh sách khi mount; setState nằm sau await trong hàm tải
  useEffect(() => { void load() }, [load])

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
      await load()
      setEditingId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được, vui lòng thử lại.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-body-sm text-text-muted">
        Chép lại nhận xét thật khách đã gửi tiệm. Chỉ đánh giá đang hiển thị mới lên trang khách; không có đánh giá thì mục này tự ẩn.
      </p>
      {error && <InlineError message={error} onRetry={() => void load()} />}

      <div className="rounded-2xl border border-border bg-surface p-4">
        <h4 className="mb-3 text-body font-semibold text-text">Thêm đánh giá</h4>
        <ShopReviewForm key={reviews?.length ?? 0} submitLabel="Thêm đánh giá" busy={busy && !editingId}
          onSubmit={(d) => run(() => call("/api/v1/shop-reviews", { method: "POST", body: toBody(d) }))} />
      </div>

      {reviews && reviews.length === 0 && (
        <EmptyState title="Chưa có đánh giá nào" reason="Trang khách sẽ không hiện mục đánh giá cho tới khi bạn thêm." />
      )}

      <ul className="space-y-3">
        {reviews?.map((r) => (
          <li key={r.id} className="rounded-2xl border border-border bg-surface p-4">
            {editingId === r.id ? (
              <ShopReviewForm
                initial={{ authorName: r.authorName, occasion: r.occasion ?? "", rating: r.rating, comment: r.comment }}
                submitLabel="Lưu thay đổi" busy={busy} onCancel={() => setEditingId(null)}
                onSubmit={(d) => run(() => call(`/api/v1/shop-reviews/${r.id}`, { method: "PATCH", body: toBody(d) }))}
              />
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 text-body-sm font-semibold text-text">
                    <span>{r.authorName}</span>
                    {r.occasion && <span className="font-normal text-text-muted">· {r.occasion}</span>}
                    <span className="flex items-center gap-0.5 text-warning-text" aria-label={`${r.rating} sao`}>
                      {r.rating}<Star size={13} fill="currentColor" aria-hidden="true" />
                    </span>
                  </div>
                  <p className="text-body-sm text-text">{r.comment}</p>
                  {!r.isVisible && <p className="text-caption text-text-muted">Đang ẩn khỏi trang khách</p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="xs" variant="ghost" disabled={busy}
                    onClick={() => run(() => call(`/api/v1/shop-reviews/${r.id}`, { method: "PATCH", body: JSON.stringify({ is_visible: !r.isVisible }) }))}>
                    {r.isVisible ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
                    <span className="ml-1">{r.isVisible ? "Ẩn" : "Hiện"}</span>
                  </Button>
                  <Button size="xs" variant="ghost" disabled={busy} onClick={() => setEditingId(r.id)}>
                    <Pencil size={14} aria-hidden="true" /><span className="ml-1">Sửa</span>
                  </Button>
                  <Button size="xs" variant="ghost" disabled={busy} onClick={() => setDeleting(r)}>
                    <Trash2 size={14} aria-hidden="true" /><span className="ml-1">Xoá</span>
                  </Button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => { if (!o) setDeleting(null) }}
        title={`Xoá đánh giá của ${deleting?.authorName ?? ""}?`}
        consequence="Đánh giá biến mất khỏi mọi trang khách đang chia sẻ và không khôi phục được. Muốn tạm ẩn thì dùng nút Ẩn."
        confirmLabel="Xoá đánh giá"
        tone="danger"
        onConfirm={async () => {
          const target = deleting
          setDeleting(null)
          if (target) await run(() => call(`/api/v1/shop-reviews/${target.id}`, { method: "DELETE" }))
        }}
      />
    </div>
  )
}
