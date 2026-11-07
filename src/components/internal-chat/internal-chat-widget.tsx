"use client"

import React, { useEffect, useState, useRef } from "react"
import { MessageSquare } from "@/components/ui/icon-set/message-square"
import { X } from "@/components/ui/icon-set/x"
import { Send } from "@/components/ui/icon-set/send"
import { ChevronLeft } from "@/components/ui/icon-set/chevron-left"
import { Building } from "@/components/ui/icon-set/building"
import { Store } from "@/components/ui/icon-set/store"
import { ShieldCheck } from "@/components/ui/icon-set/shield-check"
import type { InternalChatConversation, InternalChatMessage, ActionCardOrderPayload } from "@/modules/internal-chat/domain/chat-entities"
import { ActionCardOrder } from "./action-card-order"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function InternalChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [conversations, setConversations] = useState<InternalChatConversation[]>([])
  const [activeConv, setActiveConv] = useState<InternalChatConversation | null>(null)
  const [messages, setMessages] = useState<InternalChatMessage[]>([])
  const [inputText, setInputText] = useState("")
  const [loading, setLoading] = useState(false)
  const [unreadTotal, setUnreadTotal] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/v1/internal-chat/conversations")
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setConversations(json.data)
        const unread = json.data.reduce((acc: number, cur: InternalChatConversation) => acc + (cur.unreadCount || 0), 0)
        setUnreadTotal(unread)
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

  useEffect(() => {
    void Promise.resolve().then(() => fetchConversations())
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

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen && (
        <Button
          type="button"
          variant="secondary"
          onClick={() => setIsOpen(true)}
          className="relative flex items-center justify-center w-14 h-14 rounded-full bg-primary hover:bg-primary-hover text-primary-fg shadow-xl transition-all duration-200 hover:scale-105 p-0 border-0"
          title="Mở Chat nội bộ"
        >
          <MessageSquare className="w-6 h-6" />
          {unreadTotal > 0 && (
            <span className="absolute -top-1 -right-1 bg-danger text-danger-fg text-caption font-bold px-2 py-0.5 rounded-full border-2 border-surface animate-pulse motion-reduce:animate-none">
              {unreadTotal}
            </span>
          )}
        </Button>
      )}

      {isOpen && (
        <div className="w-[380px] h-[550px] bg-surface rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-primary text-primary-fg p-3.5 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              {activeConv && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Quay lại danh sách hội thoại"
                  onClick={() => {
                    setActiveConv(null)
                    fetchConversations()
                  }}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors cursor-pointer text-primary-fg h-8 w-8"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              )}
              <div>
                <h3 className="font-semibold text-body-sm leading-tight">
                  {activeConv ? activeConv.title || "Cuộc trò chuyện" : "Chat nội bộ smeOS"}
                </h3>
                <span className="text-caption text-primary-fg/80 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-success" /> Bảo mật, dữ liệu riêng từng doanh nghiệp
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Đóng cửa sổ trò chuyện"
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/20 rounded-full transition-colors cursor-pointer text-primary-fg h-8 w-8"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto bg-surface-muted/40 p-3">
            {!activeConv ? (
              /* Conversation list */
              <div className="space-y-2">
                <div className="text-caption font-medium text-text-muted px-1 uppercase tracking-wider">
                  Kênh trao đổi
                </div>
                {conversations.length === 0 ? (
                  <div className="text-center py-12 text-text-muted text-meta">
                    Chưa có cuộc trò chuyện nào
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <Button
                      type="button"
                      variant="ghost"
                      key={conv.id}
                      onClick={() => setActiveConv(conv)}
                      className="w-full text-left p-3 h-auto bg-surface rounded-xl border border-border hover:border-primary/40 hover:shadow-xs cursor-pointer transition-all flex items-start gap-3 whitespace-normal block"
                    >
                      <div className="flex items-start gap-3 w-full">
                        <div className="w-9 h-9 rounded-full bg-primary-subtle text-primary flex items-center justify-center shrink-0">
                          {conv.conversationType === "PLATFORM_TENANT" ? (
                            <Building className="w-4 h-4" />
                          ) : (
                            <Store className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-meta font-semibold text-text truncate">
                              {conv.title || (conv.conversationType === "PLATFORM_TENANT" ? "Hỗ trợ SaaS" : "Trao đổi đối tác")}
                            </h4>
                            {Boolean(conv.unreadCount) && (
                              <span className="w-2 h-2 rounded-full bg-primary shrink-0"></span>
                            )}
                          </div>
                          <p className="text-caption text-text-muted truncate mt-0.5 font-normal">
                            {conv.lastMessageSnippet || "Chưa có tin nhắn mới"}
                          </p>
                        </div>
                      </div>
                    </Button>
                  ))
                )}
              </div>
            ) : (
              /* Chat message thread */
              <div className="space-y-3">
                {loading && messages.length === 0 ? (
                  <div className="text-center py-8 text-meta text-text-muted">Đang tải tin nhắn...</div>
                ) : (
                  messages.map((msg) => {
                    const isCard = msg.messageType === "ACTION_CARD_ORDER"
                    const isNotice = msg.messageType === "SYSTEM_NOTICE"

                    if (isNotice) {
                      return (
                        <div key={msg.id} className="text-center my-2">
                          <span className="inline-block bg-surface-elevated text-text-muted text-caption px-2.5 py-0.5 rounded-full border border-border">
                            {msg.content}
                          </span>
                        </div>
                      )
                    }

                    return (
                      <div key={msg.id} className="space-y-1">
                        <div className="text-caption text-text-muted px-1">
                          {msg.senderName || msg.senderRole}
                        </div>
                        {isCard ? (
                          <ActionCardOrder
                            messageId={msg.id}
                            payload={msg.actionPayload as ActionCardOrderPayload}
                            isSender={false}
                            onActionComplete={() => fetchMessages(activeConv.id)}
                          />
                        ) : (
                          <div className="p-2.5 bg-surface border border-border rounded-xl shadow-xs text-meta text-text max-w-[85%] leading-relaxed">
                            {msg.content}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Footer input if activeConv */}
          {activeConv && (
            <form onSubmit={handleSendMessage} className="p-2.5 bg-surface border-t border-border flex gap-2">
              <Input
                type="text"
                placeholder="Nhập tin nhắn..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1"
                inputSize="sm"
              />
              <Button
                type="submit"
                aria-label="Gửi tin nhắn"
                disabled={!inputText.trim()}
                size="sm"
                className="w-9 h-9 p-0 flex items-center justify-center shrink-0 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
