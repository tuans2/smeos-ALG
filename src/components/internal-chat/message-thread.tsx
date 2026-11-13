"use client"

import { useI18n } from "@/lib/i18n"
import React, { useEffect, useRef, useState } from "react"
import type { InternalChatConversation, InternalChatMessage } from "@/modules/internal-chat/domain/chat-entities"
import { CHAT_MESSAGE_MAX_LENGTH } from "@/modules/internal-chat/domain/chat-limits"
import { MAX_CHAT_IMAGE_BYTES, MAX_CHAT_IMAGES_PER_MESSAGE } from "@/modules/internal-chat/domain/chat-image"
import { ImagePlus } from "@/components/ui/icon-set/image-plus"
import { X } from "@/components/ui/icon-set/x"
import { Bell } from "@/components/ui/icon-set/bell"
import { ArrowLeft } from "@/components/ui/icon-set/arrow-left"
import { Send } from "@/components/ui/icon-set/send"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { EmptyState } from "@/components/ui/empty-state"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { conversationName } from "./conversation-list"
import { MessageItem } from "./message-item"
import { LocalImagePreview } from "@/components/upload/local-image-preview"
import type { LoadState } from "./use-internal-chat"

interface MessageThreadProps {
  conversation: InternalChatConversation
  messages: InternalChatMessage[]
  state: LoadState
  online: boolean
  sendError: string | null
  onBack: () => void
  onSend: (text: string) => Promise<boolean>
  onSendImages: (files: File[], caption: string) => Promise<boolean>
  onToggleMute: () => void
  onChangeMessage: (messageId: string, content: string | null) => Promise<boolean>
  onReload: () => void
}

/** Phòng đang mở: tin (cũ → mới), ô soạn tin (Enter gửi, Shift+Enter xuống dòng), các trạng thái tải / lỗi / mất mạng. */
export function MessageThread({ conversation, messages, state, online, sendError, onBack, onSend, onSendImages, onToggleMute, onChangeMessage, onReload }: MessageThreadProps) {
  const { t } = useI18n()
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [files, setFiles] = useState<Array<{ file: File; id: string }>>([])
  const [pickError, setPickError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Mã tạm cho từng ảnh đã chọn (khoá danh sách, bỏ ảnh); ảnh xem trước vẽ lên canvas, không cần thu hồi URL
  const nextId = useRef(0)
  const removeFile = (id: string) => setFiles((prev) => prev.filter((x) => x.id !== id))

  const pick = (list: FileList | null) => {
    if (!list) return
    setPickError(null)
    const chosen = Array.from(list)
    if (chosen.some((f) => f.size > MAX_CHAT_IMAGE_BYTES)) setPickError(t("chat.thread.imageTooLarge"))
    const room = MAX_CHAT_IMAGES_PER_MESSAGE - files.length
    const ok = chosen.filter((f) => f.size <= MAX_CHAT_IMAGE_BYTES)
    if (ok.length > room) setPickError(t("chat.thread.tooManyImages", { max: MAX_CHAT_IMAGES_PER_MESSAGE }))
    const added = ok.slice(0, Math.max(0, room)).map((file) => ({ file, id: `pick-${nextId.current++}` }))
    if (added.length > 0) setFiles([...files, ...added])
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages.length])

  const submit = async () => {
    const raw = text
    const value = raw.trim()
    const batch = files
    if ((!value && batch.length === 0) || sending) return
    setSending(true)
    const sent = batch.length > 0 ? await onSendImages(batch.map((f) => f.file), value) : await onSend(value)
    if (sent) {
      // Chỉ xoá đúng phần vừa gửi — người dùng có thể đã gõ tiếp / chọn thêm ảnh trong lúc chờ
      setText((current) => (current === raw ? "" : current))
      const sentIds = new Set(batch.map((f) => f.id))
      setFiles((prev) => prev.filter((f) => !sentIds.has(f.id)))
    }
    setSending(false)
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="p-3 border-b border-border flex items-center gap-2 bg-surface">
        <Button type="button" variant="ghost" size="sm" className="md:hidden h-9 w-9 p-0" onClick={onBack} aria-label={t("chat.thread.back")}>
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        </Button>
        <h2 className="text-body-sm font-bold text-text truncate flex-1">{conversationName(conversation, { branchRoom: t("chat.list.branchRoom"), defaultRoom: t("chat.list.defaultRoom") })}</h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 px-2 shrink-0 text-caption"
          aria-pressed={Boolean(conversation.isMuted)}
          onClick={onToggleMute}
          title={conversation.isMuted ? t("chat.thread.mutedHint") : t("chat.thread.muteHint")}
        >
          <Bell className={`w-4 h-4 mr-1 ${conversation.isMuted ? "opacity-40" : ""}`} aria-hidden="true" />
          {conversation.isMuted ? t("chat.thread.muted") : t("chat.thread.mute")}
        </Button>
      </div>

      {!online && (
        <p role="status" className="px-4 py-2 text-caption bg-warning-bg text-warning-text">{t("chat.thread.offline")}</p>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-alt/30" aria-live="polite" aria-label={t("chat.thread.messagesLabel")}>
        {state === "loading" && messages.length === 0 ? (
          <SkeletonBlock lines={6} label={t("chat.thread.loading")} />
        ) : state === "forbidden" ? (
          <EmptyState kind="forbidden" reason={t("chat.thread.forbidden")} />
        ) : state === "error" && messages.length === 0 ? (
          <EmptyState kind="error" action={{ label: t("chat.list.retry"), onClick: onReload }} />
        ) : messages.length === 0 ? (
          <EmptyState title={t("chat.thread.emptyTitle")} reason={t("chat.thread.emptyReason")} />
        ) : (
          messages.map((m) => <MessageItem key={m.id} message={m} onChanged={onReload} onChangeMessage={onChangeMessage} />)
        )}
        <div ref={endRef} />
      </div>

      {files.length > 0 && (
        <ul className="px-3 pt-3 bg-surface border-t border-border flex gap-2 overflow-x-auto" aria-label={t("chat.thread.pickedImages")}>
          {files.map((f, i) => (
            <li key={f.id} className="relative shrink-0">
              <LocalImagePreview file={f.file} label={t("chat.thread.pickedImage", { index: i + 1 })} className="w-16 h-16 rounded-lg border border-border" />
              <Button type="button" variant="ghost" size="sm" className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full bg-surface border border-border" aria-label={t("chat.thread.removeImage", { index: i + 1 })} onClick={() => removeFile(f.id)}>
                <X className="w-3 h-3" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form
        className="p-3 bg-surface border-t border-border flex gap-2 items-end"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label={t("chat.thread.chooseImages")}
          onChange={(e) => {
            pick(e.target.files)
            e.target.value = ""
          }}
        />
        <Button type="button" variant="ghost" size="sm" className="h-10 w-10 p-0 shrink-0" aria-label={t("chat.thread.attach")} disabled={state === "forbidden" || files.length >= MAX_CHAT_IMAGES_PER_MESSAGE} onClick={() => fileRef.current?.click()}>
          <ImagePlus className="w-5 h-5" aria-hidden="true" />
        </Button>
        <label htmlFor="chat-composer" className="sr-only">{t("chat.thread.composerLabel")}</label>
        <Textarea
          id="chat-composer"
          rows={1}
          maxLength={CHAT_MESSAGE_MAX_LENGTH}
          placeholder={files.length > 0 ? t("chat.thread.captionPlaceholder") : t("chat.thread.placeholder")}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              void submit()
            }
          }}
          className="flex-1 resize-none min-h-0 max-h-32"
        />
        <Button type="submit" disabled={(!text.trim() && files.length === 0) || sending || state === "forbidden"} size="default" className="shrink-0">
          <Send className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
          {t("chat.thread.send")}
        </Button>
      </form>
      {(pickError || sendError) && <p role="alert" className="px-3 pb-2 text-caption text-danger-text bg-surface">{pickError || sendError}</p>}
    </div>
  )
}
