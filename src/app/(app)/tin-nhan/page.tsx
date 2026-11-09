"use client"

import { useI18n } from "@/lib/i18n"
import React, { useEffect, useState, useRef } from "react"
import { MessageSquare } from "@/components/ui/icon-set/message-square"
import { Send } from "@/components/ui/icon-set/send"
import { Building } from "@/components/ui/icon-set/building"
import { Store } from "@/components/ui/icon-set/store"
import { ShieldCheck } from "@/components/ui/icon-set/shield-check"
import { Search } from "@/components/ui/icon-set/search"
import { Package } from "@/components/ui/icon-set/package"
import type {
  InternalChatConversation,
  InternalChatMessage,
  ActionCardOrderPayload,
} from "@/modules/internal-chat/domain/chat-entities"
import { ActionCardOrder } from "@/components/internal-chat/action-card-order"
import { SubcontractTaskCard } from "@/components/internal-chat/subcontract-task-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"

export default function InternalChatPage() {
  const { t } = useI18n()
  const [conversations, setConversations] = useState<InternalChatConversation[]>([])
  const [activeConv, setActiveConv] = useState<InternalChatConversation | null>(null)
  const [messages, setMessages] = useState<InternalChatMessage[]>([])
  const [inputText, setInputText] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/v1/internal-chat/conversations")
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setConversations(json.data)
        if (json.data.length > 0) setActiveConv((prev) => prev ?? json.data[0])
      }
    } catch {
      // Ignored
    }
  }

  const fetchMessages = async (convId: string) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/v1/internal-chat/conversations/${convId}/messages`)
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setMessages(json.data)
      }
    } catch {
      // Ignored
    } finally {
      setLoading(false)
    }
  }

  // Nút "Nhắn tin" ở màn đối tác / kết nối mở thẳng đúng phòng: ?doi-tac= | ?chuoi= | ?chi-nhanh= (tạo lần đầu nếu chưa có)
  const openRequestedRoom = async () => {
    const q = new URLSearchParams(window.location.search)
    const target = q.get("doi-tac") ? { partnerOrgId: q.get("doi-tac") } : q.get("chuoi") ? { chainOrgId: q.get("chuoi") } : q.get("chi-nhanh") ? { branchId: q.get("chi-nhanh") } : null
    if (!target) return
    try {
      const res = await fetch("/api/v1/internal-chat/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(target) })
      const json = await res.json()
      if (json.success && json.data) setActiveConv(json.data)
    } catch {
      // Không mở được phòng: vẫn hiện danh sách
    }
  }

  useEffect(() => {
    void Promise.resolve().then(openRequestedRoom).then(() => fetchConversations())
    const timer = setInterval(fetchConversations, 15000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (activeConv) {
      void Promise.resolve().then(() => fetchMessages(activeConv.id))
      const msgTimer = setInterval(() => fetchMessages(activeConv.id), 5000)
      return () => clearInterval(msgTimer)
    }
  }, [activeConv])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeConv || !inputText.trim()) return

    const text = inputText.trim()
    setInputText("")

    try {
      const res = await fetch(`/api/v1/internal-chat/conversations/${activeConv.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, messageType: "TEXT" }),
      })
      const json = await res.json()
      if (json.success && json.data) {
        setMessages((prev) => [...prev, json.data])
      }
    } catch {
      // Ignored
    }
  }

  const filteredConversations = conversations.filter((c) =>
    (c.title || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-bg p-4 gap-4">
      {/* Cột trái: Danh sách hội thoại */}
      <Card className="w-80 md:w-96 flex flex-col overflow-hidden p-0" variant="default">
        {/* Header danh sách */}
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <PageHeader
              title={<><MessageSquare className="w-5 h-5 text-primary" /> Tin nhắn nội bộ</>}
            />
            <span className="text-caption font-medium text-primary bg-primary-subtle px-2.5 py-0.5 rounded-full border border-primary/20">
              Đa ngành SaaS
            </span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <Input
              type="text"
              placeholder="Tìm kiếm trao đổi, đối tác..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              inputSize="sm"
            />
          </div>
        </div>

        {/* Danh sách các kênh chat */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-16 text-meta text-text-muted">
              Chưa có cuộc trò chuyện nào
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = activeConv?.id === conv.id
              return (
                <Button variant="ghost" type="button"
                  key={conv.id}
                  onClick={() => setActiveConv(conv)}
                  className={`text-[length:inherit] h-auto justify-start font-[inherit] gap-0 w-full text-left p-3 rounded-xl cursor-pointer transition-all flex items-start gap-3 border focus-visible:outline-2 focus-visible:outline-primary ${
                    isSelected
                      ? "bg-primary-subtle border-primary/30 shadow-xs"
                      : "bg-surface border-transparent hover:bg-surface-muted hover:border-border"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      conv.conversationType === "PLATFORM_TENANT"
                        ? "bg-surface-muted text-text"
                        : conv.conversationType === "ORDER_THREAD"
                        ? "bg-warning-subtle text-warning-text"
                        : "bg-primary-subtle text-primary"
                    }`}
                  >
                    {conv.conversationType === "PLATFORM_TENANT" ? (
                      <Building className="w-5 h-5" />
                    ) : conv.conversationType === "ORDER_THREAD" ? (
                      <Package className="w-5 h-5" />
                    ) : (
                      <Store className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-meta font-semibold text-text truncate">
                        {conv.counterpartName || conv.title ||
                          (conv.conversationType === "PLATFORM_TENANT"
                            ? "Hỗ trợ SaaS Platform"
                            : "Trao đổi đối tác")}
                      </h3>
                      {Boolean(conv.unreadCount) && (
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0"></span>
                      )}
                    </div>
                    <span className="block text-caption text-text-muted truncate mt-0.5">
                      {conv.lastMessageSnippet || "Chưa có tin nhắn"}
                    </span>
                  </div>
                </Button>
              )
            })
          )}
        </div>
      </Card>

      {/* Cột phải: Khung chat chi tiết */}
      <Card className="flex-1 flex flex-col overflow-hidden p-0" variant="default">
        {activeConv ? (
          <>
            {/* Header khung chat */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-surface shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-subtle text-primary flex items-center justify-center font-bold text-body-sm">
                  {activeConv.title ? activeConv.title.charAt(0).toUpperCase() : "C"}
                </div>
                <div>
                  <h2 className="text-body-sm font-bold text-text leading-tight">
                    {activeConv.title || "Cuộc trò chuyện"}
                  </h2>
                  <span className="text-caption text-text-muted flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-success" /> Kênh nội bộ bảo mật
                  </span>
                </div>
              </div>
            </div>

            {/* Vùng tin nhắn */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-muted/30">
              {loading && messages.length === 0 ? (
                <div className="text-center py-12 text-meta text-text-muted">Đang tải tin nhắn...</div>
              ) : (
                messages.map((msg) => {
                  const isCard = msg.messageType === "ACTION_CARD_ORDER"
                  const isNotice = msg.messageType === "SYSTEM_NOTICE"

                  if (isNotice) {
                    return (
                      <div key={msg.id} className="text-center my-2">
                        <span className="inline-block bg-surface-elevated text-text-muted text-caption px-3 py-1 rounded-2xl font-medium border border-border whitespace-pre-line text-left max-w-lg">
                          {msg.content}
                        </span>
                      </div>
                    )
                  }

                  return (
                    <div key={msg.id} className="space-y-1.5">
                      <div className="text-caption text-text-muted px-1 font-medium">
                        {msg.senderRole === "system" ? "Điều phối tự động" : msg.senderName || "Thành viên"} ·{" "}
                        <span className="text-caption">
                          {new Date(msg.createdAt).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      {msg.messageType === "ACTION_CARD_SUBCONTRACT" ? (
                        <SubcontractTaskCard message={msg} />
                      ) : isCard ? (
                        <ActionCardOrder
                          messageId={msg.id}
                          payload={msg.actionPayload as ActionCardOrderPayload}
                          isSender={false}
                          onActionComplete={() => fetchMessages(activeConv.id)}
                        />
                      ) : (
                        <div className="p-3 bg-surface border border-border rounded-2xl shadow-xs text-meta text-text max-w-lg leading-relaxed">
                          {msg.content}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Ô nhập tin nhắn */}
            <form onSubmit={handleSendMessage} className="p-3 bg-surface border-t border-border flex gap-2">
              <Input
                type="text"
                placeholder="Nhập tin nhắn trao đổi nghiệp vụ..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1"
                inputSize="default"
              />
              <Button
                type="submit"
                disabled={!inputText.trim()}
                size="default"
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                Gửi
              </Button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-text-muted">
            <MessageSquare className="w-12 h-12 stroke-[1.5] text-text-muted/40 mb-3" />
            <h3 className="text-body-sm font-semibold text-text">Chọn một cuộc trò chuyện để bắt đầu</h3>
            <p className="text-meta text-text-muted max-w-xs mt-1">
              Trao đổi trực tiếp với Quản trị nền tảng SaaS hoặc Đối tác gia công thuộc chuỗi.
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}
