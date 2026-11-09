"use client"

import React from "react"
import type { ActionCardOrderPayload, InternalChatMessage } from "@/modules/internal-chat/domain/chat-entities"
import { formatTime } from "@/lib/i18n/formatters"
import { safeImageSrc } from "@/lib/safe-image-src"
import { ActionCardOrder } from "./action-card-order"
import { SubcontractTaskCard } from "./subcontract-task-card"

/** Một tin trong phòng: tin hệ thống (giữa), thẻ đơn gia công, thẻ đơn kiểu cũ, hoặc tin chữ. */
export function MessageItem({ message, onChanged }: { message: InternalChatMessage; onChanged: () => void }) {
  if (message.messageType === "SYSTEM_NOTICE") {
    return (
      <div className="flex justify-center my-2">
        <span className="inline-block bg-surface-elevated text-text-muted text-caption px-3 py-1.5 rounded-2xl font-medium border border-border whitespace-pre-line max-w-lg">
          {message.content}
        </span>
      </div>
    )
  }
  const sender = message.senderRole === "system" ? "Điều phối tự động" : message.senderName || "Thành viên"
  return (
    <div className="space-y-1.5">
      <div className="text-caption text-text-muted px-1 font-medium">
        {sender} · <time dateTime={new Date(message.createdAt).toISOString()}>{formatTime(message.createdAt)}</time>
      </div>
      {message.messageType === "ACTION_CARD_SUBCONTRACT" ? (
        <SubcontractTaskCard message={message} />
      ) : message.messageType === "IMAGE" ? (
        <div className="space-y-1.5 max-w-lg">
          <div className="grid grid-cols-2 gap-1.5">
            {message.attachments.map((url, i) => (
              <a key={url} href={safeImageSrc(url)} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden border border-border bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element -- URL ký có hạn của kho, không qua bộ tối ưu ảnh */}
                <img src={safeImageSrc(url)} alt={`Ảnh ${i + 1}${message.content ? `: ${message.content}` : ""}`} loading="lazy" className="w-full h-32 object-cover" />
              </a>
            ))}
          </div>
          {message.content && <div className="p-3 bg-surface border border-border rounded-2xl text-meta text-text whitespace-pre-line break-words">{message.content}</div>}
        </div>
      ) : message.messageType === "ACTION_CARD_ORDER" ? (
        // Thẻ đơn kiểu cũ (gửi tay qua dispatch-to-chat) — máy chủ chỉ cho tổ chức được giao bấm
        <ActionCardOrder messageId={message.id} payload={message.actionPayload as ActionCardOrderPayload} isSender={false} onActionComplete={onChanged} />
      ) : (
        <div className="p-3 bg-surface border border-border rounded-2xl shadow-xs text-meta text-text max-w-lg leading-relaxed whitespace-pre-line break-words">
          {message.content}
        </div>
      )}
    </div>
  )
}
