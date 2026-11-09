"use client"

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
  onReload: () => void
}

/** Phòng đang mở: tin (cũ → mới), ô soạn tin (Enter gửi, Shift+Enter xuống dòng), các trạng thái tải / lỗi / mất mạng. */
export function MessageThread({ conversation, messages, state, online, sendError, onBack, onSend, onSendImages, onToggleMute, onReload }: MessageThreadProps) {
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [files, setFiles] = useState<Array<{ file: File; url: string }>>([])
  const [pickError, setPickError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Giải phóng ảnh xem trước: khi bỏ ảnh, khi gửi xong (`clearFiles`) và khi rời màn (ref giữ danh sách mới nhất)
  const filesRef = useRef(files)
  useEffect(() => {
    filesRef.current = files
  }, [files])
  useEffect(() => () => filesRef.current.forEach((f) => URL.revokeObjectURL(f.url)), [])
  const removeFile = (url: string) => {
    URL.revokeObjectURL(url)
    setFiles((prev) => prev.filter((x) => x.url !== url))
  }
  const clearFiles = () => {
    files.forEach((f) => URL.revokeObjectURL(f.url))
    setFiles([])
  }

  const pick = (list: FileList | null) => {
    if (!list) return
    setPickError(null)
    const chosen = Array.from(list)
    if (chosen.some((f) => f.size > MAX_CHAT_IMAGE_BYTES)) setPickError("Mỗi ảnh tối đa 10 MB.")
    const room = MAX_CHAT_IMAGES_PER_MESSAGE - files.length
    const ok = chosen.filter((f) => f.size <= MAX_CHAT_IMAGE_BYTES)
    if (ok.length > room) setPickError(`Mỗi tin gửi tối đa ${MAX_CHAT_IMAGES_PER_MESSAGE} ảnh.`)
    const added = ok.slice(0, Math.max(0, room)).map((file) => ({ file, url: URL.createObjectURL(file) }))
    if (added.length > 0) setFiles([...files, ...added])
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages.length])

  const submit = async () => {
    const value = text.trim()
    if ((!value && files.length === 0) || sending) return
    setSending(true)
    const sent = files.length > 0 ? await onSendImages(files.map((f) => f.file), value) : await onSend(value)
    if (sent) {
      setText("")
      clearFiles()
    }
    setSending(false)
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="p-3 border-b border-border flex items-center gap-2 bg-surface">
        <Button type="button" variant="ghost" size="sm" className="md:hidden h-9 w-9 p-0" onClick={onBack} aria-label="Quay lại danh sách">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        </Button>
        <h2 className="text-body-sm font-bold text-text truncate flex-1">{conversationName(conversation)}</h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 px-2 shrink-0 text-caption"
          aria-pressed={Boolean(conversation.isMuted)}
          onClick={onToggleMute}
          title={conversation.isMuted ? "Đang tắt thông báo tin nhắn — thẻ mời nhận đơn vẫn báo" : "Tắt thông báo tin nhắn của phòng này"}
        >
          <Bell className={`w-4 h-4 mr-1 ${conversation.isMuted ? "opacity-40" : ""}`} aria-hidden="true" />
          {conversation.isMuted ? "Đã tắt tiếng" : "Tắt tiếng"}
        </Button>
      </div>

      {!online && (
        <p role="status" className="px-4 py-2 text-caption bg-warning-subtle text-warning-text">Mất kết nối mạng — tin mới sẽ hiện khi có mạng lại.</p>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-muted/30" aria-live="polite" aria-label="Tin nhắn">
        {state === "loading" && messages.length === 0 ? (
          <SkeletonBlock lines={6} label="Đang tải tin nhắn" />
        ) : state === "forbidden" ? (
          <EmptyState kind="forbidden" reason="Bạn không còn quyền xem phòng này (liên kết với chuỗi có thể đã chấm dứt)." />
        ) : state === "error" && messages.length === 0 ? (
          <EmptyState kind="error" action={{ label: "Thử lại", onClick: onReload }} />
        ) : messages.length === 0 ? (
          <EmptyState title="Chưa có tin nhắn" reason="Gửi lời chào đầu tiên. Đơn gia công chuỗi giao cho cửa hàng cũng hiện ở đây." />
        ) : (
          messages.map((m) => <MessageItem key={m.id} message={m} onChanged={onReload} />)
        )}
        <div ref={endRef} />
      </div>

      {files.length > 0 && (
        <ul className="px-3 pt-3 bg-surface border-t border-border flex gap-2 overflow-x-auto" aria-label="Ảnh sẽ gửi">
          {files.map((f, i) => (
            <li key={f.url} className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element -- ảnh xem trước cục bộ (blob:) */}
              <img src={f.url} alt={`Ảnh chọn ${i + 1}`} className="w-16 h-16 rounded-lg object-cover border border-border" />
              <Button type="button" variant="ghost" size="sm" className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full bg-surface border border-border" aria-label={`Bỏ ảnh ${i + 1}`} onClick={() => removeFile(f.url)}>
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
          aria-label="Chọn ảnh để gửi"
          onChange={(e) => {
            pick(e.target.files)
            e.target.value = ""
          }}
        />
        <Button type="button" variant="ghost" size="sm" className="h-10 w-10 p-0 shrink-0" aria-label="Đính kèm ảnh" disabled={state === "forbidden" || files.length >= MAX_CHAT_IMAGES_PER_MESSAGE} onClick={() => fileRef.current?.click()}>
          <ImagePlus className="w-5 h-5" aria-hidden="true" />
        </Button>
        <label htmlFor="chat-composer" className="sr-only">Nội dung tin nhắn</label>
        <Textarea
          id="chat-composer"
          rows={1}
          maxLength={CHAT_MESSAGE_MAX_LENGTH}
          placeholder={files.length > 0 ? "Thêm chú thích cho ảnh (không bắt buộc)" : "Nhập tin nhắn… (Enter để gửi, Shift+Enter xuống dòng)"}
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
          Gửi
        </Button>
      </form>
      {(pickError || sendError) && <p role="alert" className="px-3 pb-2 text-caption text-danger-text bg-surface">{pickError || sendError}</p>}
    </div>
  )
}
