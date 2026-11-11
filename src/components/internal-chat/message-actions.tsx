"use client"

import React, { useState } from "react"
import { useI18n } from "@/lib/i18n"
import type { InternalChatMessage } from "@/modules/internal-chat/domain/chat-entities"
import { CHAT_MESSAGE_MAX_LENGTH } from "@/modules/internal-chat/domain/chat-limits"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"

interface MessageActionsProps {
  message: InternalChatMessage
  /** `content` = null → thu hồi */
  onChange: (messageId: string, content: string | null) => Promise<boolean>
  children: React.ReactNode
}

/**
 * Bọc nội dung tin của chính người xem (máy chủ đánh dấu `canChange`: người gửi, trong 24 giờ, tin chữ / ảnh):
 * nút "Sửa" mở ô sửa tại chỗ (Enter lưu, Esc huỷ), nút "Thu hồi" hỏi xác nhận rồi xoá với mọi người.
 */
export function MessageActions({ message, onChange, children }: MessageActionsProps) {
  const { t } = useI18n()
  const [confirm, confirmDialog] = useConfirmDialog()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(message.content)
  const [busy, setBusy] = useState(false)

  if (!message.canChange) return <>{children}</>

  const save = async () => {
    const value = draft.trim()
    if (busy || (message.messageType === "TEXT" && !value)) return
    setBusy(true)
    if (await onChange(message.id, value)) setEditing(false)
    setBusy(false)
  }

  const unsend = async () => {
    const ok = await confirm({ title: t("chat.message.deleteTitle"), consequence: t("chat.message.confirmDelete"), confirmLabel: t("chat.message.delete"), cancelLabel: t("chat.message.cancel"), tone: "danger" })
    if (ok) await onChange(message.id, null)
  }

  return (
    <div className="space-y-1">
      {editing ? (
        <div className="max-w-lg space-y-1.5">
          <label htmlFor={`sua-${message.id}`} className="sr-only">{t("chat.message.editLabel")}</label>
          <Textarea
            id={`sua-${message.id}`}
            rows={2}
            maxLength={CHAT_MESSAGE_MAX_LENGTH}
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                void save()
              }
              if (e.key === "Escape") setEditing(false)
            }}
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={busy} onClick={() => void save()}>{t("chat.message.save")}</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>{t("chat.message.cancel")}</Button>
          </div>
        </div>
      ) : (
        children
      )}
      {!editing && (
        <div className="flex gap-1" role="group" aria-label={t("chat.message.actionsLabel")}>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-caption" onClick={() => { setDraft(message.content); setEditing(true) }}>
            {t("chat.message.edit")}
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-caption text-danger-text" onClick={() => void unsend()}>
            {t("chat.message.delete")}
          </Button>
        </div>
      )}
      {confirmDialog}
    </div>
  )
}
