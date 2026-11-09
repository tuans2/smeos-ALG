"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Bot } from "@/components/ui/icon-set/bot"
import { X } from "@/components/ui/icon-set/x"
import { Send } from "@/components/ui/icon-set/send"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { ArrowRight } from "@/components/ui/icon-set/arrow-right"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CopilotMessageItem } from "@/components/chat/copilot-message-item"
import { errorText } from "@/lib/error-text"
import { cn } from "@/lib/utils"
import type { Route } from "next"
import type { ChatMessageMetadata } from "@/modules/chat-assistant/domain/chat-types"

interface CopilotMessage {
  id: string
  senderType: string
  content: string
  createdAt?: string
  metadata?: ChatMessageMetadata | undefined
}

const QUICK_PROMPTS = [
  "Làm sao in phiếu chế tác giấu giá cho thợ xưởng?",
  "Cách tạo link bộ sưu tập riêng gửi Zalo và cọc VietQR?",
  "Tải file Excel mẫu để nhập sản phẩm hàng loạt?",
  "Cách cấp tài khoản nhân viên mới trong 10 giây?",
]

export function FloraOSGlobalCopilot() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<CopilotMessage[]>([])
  const [inputQuery, setInputQuery] = useState("")
  const [sending, setSending] = useState(false)
  const [creatingOrderFor, setCreatingOrderFor] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen || conversationId) return

    fetch("/api/v1/chat/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "smeOS In-App Copilot",
        channel: "INTERNAL_DASHBOARD",
      }),
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.conversation) {
          setConversationId(res.conversation.id)
        }
      })
      .catch(() => {})
  }, [isOpen, conversationId])

  const handleSendMessage = useCallback(async (queryToSend?: string) => {
    const text = (queryToSend || inputQuery).trim()
    if (!text || sending) return

    setInputQuery("")
    setSending(true)

    const tempUserMsg: CopilotMessage = {
      id: `temp-user-${Date.now()}`,
      senderType: "USER",
      content: text,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMsg])

    try {
      let currentConvId = conversationId
      if (!currentConvId) {
        const initRes = await fetch("/api/v1/chat/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "smeOS In-App Copilot",
            channel: "INTERNAL_DASHBOARD",
          }),
        })
        const initData = await initRes.json()
        if (initData.conversation?.id) {
          currentConvId = initData.conversation.id
          setConversationId(currentConvId)
        } else {
          throw new Error(initData.error?.message || "Không thể khởi tạo hội thoại")
        }
      }

      const res = await fetch(`/api/v1/chat/conversations/${currentConvId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text, assistantType: "OPS_COPILOT" }),
      })

      const data = await res.json()
      if (res.ok && data.assistantMessage) {
        setMessages((prev) => [...prev, data.assistantMessage])
      } else {
        throw new Error(data.error?.message || "Lỗi nhận phản hồi AI")
      }
    } catch (err: unknown) {
      const errorAssistantMsg: CopilotMessage = {
        id: `err-${Date.now()}`,
        senderType: "ASSISTANT",
        content: `Dạ, hệ thống đang cập nhật kết nối: ${errorText(err) || "Vui lòng thử lại trong giây lát"}. Anh/chị thử bấm lại nhé ạ!`,
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorAssistantMsg])
    } finally {
      setSending(false)
    }
  }, [conversationId, inputQuery, sending])

  // Lắng nghe phím tắt Cmd+K và Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      } else if (e.key === "Escape" && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen])

  // Lắng nghe sự kiện mở Copilot từ các module
  useEffect(() => {
    function handleCustomOpen(e: Event) {
      const customEvent = e as CustomEvent<{ prompt?: string }>
      setIsOpen(true)
      if (customEvent.detail?.prompt) {
        setTimeout(() => {
          handleSendMessage(customEvent.detail?.prompt)
        }, 150)
      }
    }
    window.addEventListener("smeos:open-copilot", handleCustomOpen)
    window.addEventListener("floraos:open-copilot", handleCustomOpen)
    return () => {
      window.removeEventListener("smeos:open-copilot", handleCustomOpen)
      window.removeEventListener("floraos:open-copilot", handleCustomOpen)
    }
  }, [handleSendMessage])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, sending])

  async function handleQuickCreateOrder(productId: string) {
    if (!conversationId) return
    setCreatingOrderFor(productId)
    try {
      const res = await fetch(`/api/v1/chat/conversations/${conversationId}/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      })

      if (res.ok) {
        const resMsgs = await fetch(`/api/v1/chat/conversations/${conversationId}/messages`).then((r) => r.json())
        setMessages(resMsgs.messages || [])
      }
    } finally {
      setCreatingOrderFor(null)
    }
  }

  return (
    <>
      {/* Nút bong bóng nổi — định vị tránh đụng BottomNav trên mobile */}
      <div className="fixed top-1/2 right-3 -translate-y-1/2 z-40 flex items-center gap-2">
        {!isOpen && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsOpen(true)}
            aria-label="Mở smeOS Copilot"
            className="group relative flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary to-primary-dark text-white shadow-lg hover:shadow-xl transition-all hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping motion-reduce:animate-none rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-white bg-success" />
            </span>
            <Bot className="h-5 w-5 transition-transform group-hover:rotate-6" />
            <div className="pointer-events-none absolute right-full mr-2.5 hidden sm:flex items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-button)] bg-text/90 px-2.5 py-1 text-caption font-bold text-white shadow-md backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity">
              <span>smeOS Copilot</span>
              <kbd className="rounded bg-white/20 px-1 py-0.2 text-caption font-mono">⌘K</kbd>
            </div>
          </Button>
        )}
      </div>

      {/* Cửa sổ Chat Copilot: BottomSheet trên mobile (< sm), Floating Dialog trên desktop (>= sm) */}
      {isOpen && (
        <>
          <div
            className="fixed top-0 bottom-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xs sm:hidden"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="smeOS Ops Copilot"
            className={cn(
              "fixed z-50 flex flex-col bg-surface border border-border shadow-2xl overflow-hidden",
              "inset-x-0 bottom-0 rounded-t-2xl max-h-[85dvh] h-[540px] pb-[env(safe-area-inset-bottom)]",
              "sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[400px] sm:max-w-[calc(100vw-3rem)] sm:h-[580px] sm:max-h-[calc(100vh-5rem)] sm:rounded-2xl sm:pb-0"
            )}
          >
            <div className="flex sm:hidden justify-center pt-2 pb-1 bg-surface">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            {/* Header Copilot */}
            <div className="flex items-center justify-between border-b border-border bg-surface-alt px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white shadow-xs">
                  <Bot className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-caption font-extrabold text-text flex items-center gap-1.5">
                    smeOS Ops Copilot
                    <span className="inline-block h-2 w-2 rounded-full bg-success animate-pulse motion-reduce:animate-none" />
                  </div>
                  <div className="text-caption font-medium text-text-muted">Trợ lý Vận hành & Hướng dẫn</div>
                </div>
              </div>
              <Button variant="ghost"
                type="button"
                aria-label="Đóng trợ lý"
                onClick={() => setIsOpen(false)}
                className="text-[length:inherit] h-auto font-[inherit] gap-0 rounded-lg p-1.5 text-text-muted hover:bg-surface hover:text-text transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Vùng nội dung tin nhắn */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-caption">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-text-muted p-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-bold text-text text-body-sm">Xin chào! Em có thể hỗ trợ gì?</div>
                    <p className="text-caption text-text-muted mt-1 max-w-[280px] mx-auto">
                      Anh/chị có thể hỏi về cách thao tác: xuất đơn hàng, cấu hình giá, in phiếu xưởng, CRM khách hàng...
                    </p>
                  </div>

                  <div className="space-y-1.5 w-full pt-2">
                    <div className="text-caption font-bold text-text-muted text-left px-1">💡 Hướng dẫn thao tác nhanh:</div>
                    {QUICK_PROMPTS.map((q, idx) => (
                      <Button variant="outline"
                        type="button"
                        key={idx}
                        onClick={() => handleSendMessage(q)}
                        className="h-auto gap-0 w-full text-left rounded-xl border border-border bg-surface-alt p-2 text-caption font-medium text-text hover:bg-border/30 transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <span className="truncate">{q}</span>
                        <ArrowRight className="h-3 w-3 text-primary shrink-0 ml-1" />
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((m, idx) => (
                    <CopilotMessageItem
                      key={m.id}
                      message={m}
                      isLatestAssistant={idx === messages.length - 1 && m.senderType === "ASSISTANT"}
                      onTypingProgress={() => {
                        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
                      }}
                      creatingOrderFor={creatingOrderFor}
                      onQuickCreateOrder={handleQuickCreateOrder}
                      onNavigate={(route) => {
                        router.push(route as Route)
                        setIsOpen(false)
                      }}
                    />
                  ))}
                  {sending && (
                    <div className="flex items-center gap-2 text-caption text-text-muted p-2 rounded-xl bg-surface-alt animate-pulse motion-reduce:animate-none">
                      <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none text-primary" />
                      <span>smeOS Copilot đang tra cứu và soạn câu trả lời...</span>
                    </div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Khung nhập tin nhắn */}
            <div className="border-t border-border p-2.5 bg-surface">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSendMessage()
                }}
                className="flex items-center gap-1.5"
              >
                <Input
                  type="text"
                  placeholder="Hỏi về cách dùng hệ thống hoặc tìm sản phẩm..."
                  className="flex-1"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  disabled={sending}
                  aria-label="Câu hỏi cho Copilot"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!inputQuery.trim() || sending}
                  className="h-8 w-8 p-0 rounded-xl shrink-0"
                  aria-label="Gửi câu hỏi"
                >
                  {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" /> : <Send className="h-3.5 w-3.5" />}
                </Button>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  )
}
