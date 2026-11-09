"use client"

import { useI18n } from "@/lib/i18n"
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

export function conversationName(c: InternalChatConversation, labels: { branchRoom: string; defaultRoom: string }): string {
  return c.counterpartName || c.title || (c.conversationType === "CHAIN_BRANCH" ? labels.branchRoom : labels.defaultRoom)
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
  const { t } = useI18n()
  const labels = { branchRoom: t("chat.list.branchRoom"), defaultRoom: t("chat.list.defaultRoom") }
  const [query, setQuery] = useState("")
  const q = query.trim().toLowerCase()
  const shown = q ? conversations.filter((c) => conversationName(c, labels).toLowerCase().includes(q)) : conversations

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden="true" />
          <Input
            type="search"
            aria-label={t("chat.list.searchLabel")}
            placeholder={t("chat.list.searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            inputSize="sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {state === "loading" && conversations.length === 0 ? (
          <div className="p-2"><SkeletonBlock lines={5} label={t("chat.list.loading")} /></div>
        ) : state === "forbidden" ? (
          <EmptyState kind="forbidden" reason={t("chat.list.forbidden")} />
        ) : state === "error" && conversations.length === 0 ? (
          <EmptyState kind="error" action={{ label: t("chat.list.retry"), onClick: onRetry }} />
        ) : shown.length === 0 ? (
          q ? (
            <EmptyState kind="filtered" />
          ) : (
            <EmptyState title={t("chat.list.emptyTitle")} reason={t("chat.list.emptyReason")} />
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
                    <span className="text-meta font-semibold text-text truncate">{conversationName(conv, labels)}</span>
                    {Boolean(conv.unreadCount) && (
                      <span className="min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-fg text-caption font-semibold inline-flex items-center justify-center" aria-label={t("chat.list.unread", { count: conv.unreadCount ?? 0 })}>
                        {(conv.unreadCount ?? 0) > 99 ? "99+" : conv.unreadCount}
                      </span>
                    )}
                  </span>
                  <span className="block text-caption text-text-muted truncate mt-0.5">{conv.lastMessageSnippet || t("chat.list.noMessages")}</span>
                  {Boolean(conv.activeOrderCount) && (
                    <span className="inline-block mt-1 text-caption font-semibold px-2 py-0.5 rounded-full bg-warning-subtle text-warning-text">
                      {t("chat.list.activeOrders", { count: conv.activeOrderCount ?? 0 })}
                    </span>
                  )}
                </span>
              </Button>
            )
          })
        )}
      </div>
    </div>
  )
}
