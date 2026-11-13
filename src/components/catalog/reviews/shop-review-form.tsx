"use client"

import { Textarea } from "@/components/ui/textarea"
import React, { useState } from "react"
import { Star } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface ReviewDraft {
  authorName: string
  occasion: string
  rating: number
  comment: string
}

export const EMPTY_REVIEW: ReviewDraft = { authorName: "", occasion: "", rating: 5, comment: "" }

interface ShopReviewFormProps {
  initial?: ReviewDraft | undefined
  submitLabel: string
  busy: boolean
  onSubmit: (draft: ReviewDraft) => void
  onCancel?: (() => void) | undefined
}

/** Form nhập một đánh giá thật của khách: tên, dịp, số sao, lời nhận xét. */
export function ShopReviewForm({ initial = EMPTY_REVIEW, submitLabel, busy, onSubmit, onCancel }: ShopReviewFormProps) {
  const [draft, setDraft] = useState<ReviewDraft>(initial)
  const set = <K extends keyof ReviewDraft>(k: K, v: ReviewDraft[K]) => setDraft((d) => ({ ...d, [k]: v }))
  const canSubmit = draft.authorName.trim().length > 0 && draft.comment.trim().length >= 5 && !busy

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (canSubmit) onSubmit(draft)
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-body-sm font-medium text-text">
          <span>Tên khách</span>
          <Input inputSize="sm" maxLength={60} value={draft.authorName} onChange={(e) => set("authorName", e.target.value)} placeholder="Ví dụ: Chị Lan" required />
        </label>
        <label className="space-y-1 text-body-sm font-medium text-text">
          <span>Dịp (không bắt buộc)</span>
          <Input inputSize="sm" maxLength={60} value={draft.occasion} onChange={(e) => set("occasion", e.target.value)} placeholder="Ví dụ: Sinh nhật mẹ" />
        </label>
      </div>
      <fieldset className="space-y-1">
        <legend className="text-body-sm font-medium text-text">Số sao</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <Button variant="ghost"
              key={n}
              type="button"
              aria-label={`${n} sao`}
              aria-pressed={draft.rating === n}
              onClick={() => set("rating", n)}
              className="px-0 py-0 text-[length:inherit] font-[inherit] gap-0 flex h-9 w-9 items-center justify-center rounded-lg hover:bg-surface-alt"
            >
              <Star size={18} className={n <= draft.rating ? "text-warning-text" : "text-text-muted"} fill={n <= draft.rating ? "currentColor" : "none"} />
            </Button>
          ))}
        </div>
      </fieldset>
      <label className="block space-y-1 text-body-sm font-medium text-text">
        <span>Lời nhận xét của khách</span>
        <Textarea
          value={draft.comment}
          maxLength={500}
          rows={3}
          onChange={(e) => set("comment", e.target.value)}
          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-body-sm text-text placeholder:text-text-muted focus-visible:outline-2 focus-visible:outline-primary"
          placeholder="Chép đúng lời khách gửi (tin nhắn, bình luận)…"
          required
        />
      </label>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={!canSubmit}>{busy ? "Đang lưu…" : submitLabel}</Button>
        {onCancel && <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Huỷ</Button>}
      </div>
    </form>
  )
}
