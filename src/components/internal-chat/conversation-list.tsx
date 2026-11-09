"use client"

import React, { useState } from "react"
import type { InternalChatConversation } from "@/modules/internal-chat/domain/chat-entities"
import { Building } from "@/components/ui/icon-set/building"
import { Store } from "@/components/ui/icon-set/store"
import { Search } from "@/components/ui/icon-set/search"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/ui/empty-state"
import { SkeletonBlock } from "@/components/ui/skeleton"
import type { LoadState } from "./use-internal-chat"

export function conversationName(c: InternalChatConversation): string {
  return c.counterpartName || c.title || (c.conversationType === "CHAIN_BRANCH" ? "Phòng chi nhánh" : "Trao đổi nội bộ")
}

interface ConversationListProps {
  conversations: InternalChatConversation[]
  state: LoadState
  activeId: string | null
  onSelect: (c: InternalChatConversation) => void
  onRetry: () => void
}

/** Danh sách phòng trao đổi: tìm theo tên bên kia, số chưa đọc, xem trước tin cuối. */
export function ConversationList({ conversations, state, activeId, onSelect, onRetry }: ConversationListProps) {
  const [query, setQuery] = useState("")
  const q = query.trim().toLowerCase()
  const shown = q ? conversations.filter((c) => conversationName(c).toLowerCase().includes(q)) : conversations

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden="true" />
          <Input
            type="search"
            aria-label="Tìm phòng trao đổi"
            placeholder="Tìm cửa hàng, chuỗi, chi nhánh..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            inputSize="sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {state === "loading" && conversations.length === 0 ? (
          <div className="p-2"><SkeletonBlock lines={5} label="Đang tải danh sách trao đổi" /></div>
        ) : state === "forbidden" ? (
          <EmptyState kind="forbidden" reason="Tài khoản của bạn chưa được dùng Trao đổi nội bộ. Nhờ Điều hành cấp quyền." />
        ) : state === "error" && conversations.length === 0 ? (
          <EmptyState kind="error" action={{ label: "Thử lại", onClick: onRetry }} />
        ) : shown.length === 0 ? (
          q ? (
            <EmptyState kind="filtered" />
          ) : (
            <EmptyState title="Chưa có phòng trao đổi" reason="Phòng tự có khi chuỗi và cửa hàng đối tác liên kết. Bấm “Nhắn tin” ở danh sách đối tác để mở." />
          )
        ) : (
          shown.map((conv) => {
            const isActive = conv.id === activeId
            const Icon = conv.conversationType === "CHAIN_BRANCH" ? Building : Store
            return (
              <Button
                key={conv.id}
                variant="ghost"
                type="button"
                onClick={() => onSelect(conv)}
                aria-current={isActive ? "true" : undefined}
                className={`h-auto w-full justify-start text-left p-3 rounded-xl flex items-center gap-3 border ${
                  isActive ? "bg-primary-subtle border-primary/30" : "border-transparent hover:bg-surface-muted"
                }`}
              >
                <span className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-primary-subtle text-primary">
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-meta font-semibold text-text truncate">{conversationName(conv)}</span>
                    {Boolean(conv.unreadCount) && (
                      <span className="min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-fg text-caption font-semibold inline-flex items-center justify-center" aria-label={`${conv.unreadCount} tin chưa đọc`}>
                        {(conv.unreadCount ?? 0) > 99 ? "99+" : conv.unreadCount}
                      </span>
                    )}
                  </span>
                  <span className="block text-caption text-text-muted truncate mt-0.5">{conv.lastMessageSnippet || "Chưa có tin nhắn"}</span>
                </span>
              </Button>
            )
          })
        )}
      </div>
    </div>
  )
}
