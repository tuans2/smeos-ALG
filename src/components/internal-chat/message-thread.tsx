"use client"

import React, { useEffect, useRef, useState } from "react"
import type { InternalChatConversation, InternalChatMessage } from "@/modules/internal-chat/domain/chat-entities"
import { CHAT_MESSAGE_MAX_LENGTH } from "@/modules/internal-chat/domain/chat-limits"
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
  onReload: () => void
}

/** Phòng đang mở: tin (cũ → mới), ô soạn tin (Enter gửi, Shift+Enter xuống dòng), các trạng thái tải / lỗi / mất mạng. */
export function MessageThread({ conversation, messages, state, online, sendError, onBack, onSend, onReload }: MessageThreadProps) {
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages.length])

  const submit = async () => {
    const value = text.trim()
    if (!value || sending) return
    setSending(true)
    if (await onSend(value)) setText("")
    setSending(false)
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="p-3 border-b border-border flex items-center gap-2 bg-surface">
        <Button type="button" variant="ghost" size="sm" className="md:hidden h-9 w-9 p-0" onClick={onBack} aria-label="Quay lại danh sách">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        </Button>
        <h2 className="text-body-sm font-bold text-text truncate">{conversationName(conversation)}</h2>
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

      <form
        className="p-3 bg-surface border-t border-border flex gap-2 items-end"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <label htmlFor="chat-composer" className="sr-only">Nội dung tin nhắn</label>
        <Textarea
          id="chat-composer"
          rows={1}
          maxLength={CHAT_MESSAGE_MAX_LENGTH}
          placeholder="Nhập tin nhắn… (Enter để gửi, Shift+Enter xuống dòng)"
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
        <Button type="submit" disabled={!text.trim() || sending || state === "forbidden"} size="default" className="shrink-0">
          <Send className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
          Gửi
        </Button>
      </form>
      {sendError && <p role="alert" className="px-3 pb-2 text-caption text-danger-text bg-surface">{sendError}</p>}
    </div>
  )
}
