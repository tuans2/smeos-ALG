"use client"

import React from "react"
import { MessageSquare } from "@/components/ui/icon-set/message-square"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { ConversationList } from "@/components/internal-chat/conversation-list"
import { MessageThread } from "@/components/internal-chat/message-thread"
import { useInternalChat } from "@/components/internal-chat/use-internal-chat"

/**
 * Trao đổi nội bộ (kế hoạch `docs/plan/hoan-thien-chat-noi-bo.md`): chuỗi ↔ cửa hàng đối tác / chi nhánh nhắn tin và
 * nhận / thực hiện đơn gia công ngay trong phòng. Máy tính: hai cột; điện thoại: một cột (danh sách ↔ phòng).
 */
export default function InternalChatPage() {
  const chat = useInternalChat()
  const active = chat.activeConv

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-bg p-3 md:p-4 gap-3">
      <PageHeader
        title={<><MessageSquare className="w-5 h-5 text-primary" aria-hidden="true" /> Trao đổi nội bộ</>}
        description="Nhắn tin với chuỗi, chi nhánh và cửa hàng đối tác; nhận và cập nhật đơn gia công ngay trong phòng."
      />
      <div className="flex flex-1 min-h-0 gap-4">
        <Card className={`${active ? "hidden md:flex" : "flex"} w-full md:w-80 lg:w-96 flex-col overflow-hidden p-0`} variant="default">
          <ConversationList
            conversations={chat.conversations}
            state={chat.listState}
            activeId={active?.id ?? null}
            onSelect={chat.setActiveConv}
            onRetry={chat.reload}
          />
        </Card>
        <Card className={`${active ? "flex" : "hidden md:flex"} flex-1 flex-col overflow-hidden p-0`} variant="default">
          {active ? (
            <MessageThread
              conversation={active}
              messages={chat.messages}
              state={chat.threadState}
              online={chat.online}
              sendError={chat.sendError}
              onBack={() => chat.setActiveConv(null)}
              onSend={chat.sendMessage}
              onSendImages={chat.sendImages}
              onToggleMute={chat.toggleMute}
              onReload={chat.reload}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <EmptyState icon={MessageSquare} title="Chọn một phòng để bắt đầu" reason="Mỗi cửa hàng đối tác và chi nhánh có một phòng trao đổi với chuỗi." />
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
