"use client"

import React, { useState, useEffect, useRef } from "react"
import { MessageCircle } from "@/components/ui/icon-set/message-circle"
import { X } from "@/components/ui/icon-set/x"
import { Send } from "@/components/ui/icon-set/send"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Flower2 } from "@/components/ui/icon-set/flower2"
import { ShoppingBag } from "@/components/ui/icon-set/shopping-bag"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { Bot } from "@/components/ui/icon-set/bot"
import { ArrowRight } from "@/components/ui/icon-set/arrow-right"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { SuggestedProductCard } from "@/modules/chat-assistant/domain/chat-types"
import {
  extractOrderDraftFromChat,
  type ChatOrderDraft,
} from "@/modules/chat-assistant/domain/chat-order-extractor"
import type { PublicChatSurface } from "@/modules/chat-assistant/domain/public-chat-policy"
import { ChatOrderCheckoutModal } from "./chat-order-checkout-modal"

interface WidgetMessage {
  id: string
  senderType: "USER" | "ASSISTANT"
  content: string
  suggestedProducts?: SuggestedProductCard[]
}

interface PublicStorefrontChatWidgetProps {
  shopSlug: string
  shopName?: string | undefined
  /** Trang đang hiện khung chat — quyết định kênh tính phí và cài đặt bật/tắt. */
  surface?: PublicChatSurface | undefined
}

// Visitor ID duy nhất theo phiên trình duyệt (sessionStorage). Đọc lúc gửi tin
// thay vì giữ trong state — không cần effect đồng bộ state khi mount.
function getVisitorId(): string {
  let vid = sessionStorage.getItem("smeos_visitor_id") ?? sessionStorage.getItem("floraos_visitor_id")
  if (!vid) {
    vid = `guest_${Math.random().toString(36).substring(2, 9)}`
    sessionStorage.setItem("smeos_visitor_id", vid)
  }
  return vid
}

function newMessageId(prefix: "usr" | "bot"): string {
  return `${prefix}_${Date.now()}`
}

export function PublicStorefrontChatWidget({
  shopSlug,
  shopName = "Cửa Hàng",
  surface = "catalog",
}: PublicStorefrontChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<WidgetMessage[]>([])
  const [inputQuery, setInputQuery] = useState("")
  const [sending, setSending] = useState(false)
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false)
  const [activeDraft, setActiveDraft] = useState<ChatOrderDraft | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  function handleOpenCheckout(prefill?: Partial<ChatOrderDraft>) {
    const draft = extractOrderDraftFromChat(messages)
    setActiveDraft({
      ...draft,
      ...(prefill || {}),
    })
    setCheckoutModalOpen(true)
  }

  async function handleSendMessage(queryText?: string) {
    const text = queryText || inputQuery
    if (!text.trim() || sending) return

    setInputQuery("")
    setSending(true)

    // Tin nhắn tạm thời của khách
    const userMsg: WidgetMessage = {
      id: newMessageId("usr"),
      senderType: "USER",
      content: text,
    }
    setMessages((prev) => [...prev, userMsg])

    try {
      const res = await fetch("/api/v1/chat/public/widget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: shopSlug,
          surface,
          visitorId: getVisitorId(),
          message: text,
        }),
      })

      const data = await res.json().catch(() => ({}))
      const botMsg: WidgetMessage = {
        id: newMessageId("bot"),
        senderType: "ASSISTANT",
        content: res.ok ? data.replyText : data.error || "Trợ lý tạm thời gián đoạn, vui lòng thử lại sau",
        suggestedProducts: res.ok ? data.suggestedProducts || [] : [],
      }
      setMessages((prev) => [...prev, botMsg])
    } catch (err) {
      console.error("Lỗi gửi tin nhắn:", err)
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* NÚT BONG BÓNG TRÒN NỔI GÓC DƯỚI BÊN PHẢI */}
      {/* Trang catalog/landing có thanh nút đáy (dưới md) — đặt bong bóng phía trên để không che nút Gọi/Zalo */}
      <div className={`fixed right-5 z-50 ${surface === "catalog" || surface === "landing_page" ? "bottom-24 md:bottom-5" : "bottom-5"}`}>
        {!isOpen && (
          <Button variant="ghost"
            type="button"
            onClick={() => setIsOpen(true)}
            className="text-[length:inherit] h-auto font-[inherit] group flex items-center gap-2 rounded-full bg-gradient-to-r from-primary via-primary/95 to-primary-dark p-3.5 text-white shadow-xl hover:shadow-2xl transition-all hover:scale-105 cursor-pointer hover:bg-gradient-to-r"
            aria-label="Tư vấn đặt hoa"
          >
            <MessageCircle className="h-6 w-6 animate-pulse motion-reduce:animate-none" />
            <span className="hidden sm:inline-block pr-1 text-caption font-bold tracking-wide">
              Tư vấn đặt hoa
            </span>
          </Button>
        )}
      </div>

      {/* CỬA SỔ CHAT STOREFRONT */}
      {isOpen && (
        <div className="fixed bottom-5 right-5 z-50 flex h-[520px] w-[360px] sm:w-[390px] flex-col rounded-2xl border border-primary/20 bg-surface shadow-2xl overflow-hidden backdrop-blur-md">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-primary/5 to-primary/3 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white shadow-xs">
                <Bot className="h-4 w-4" />
              </span>
              <div>
                <div className="text-caption font-bold text-text flex items-center gap-1.5">
                  Trợ Lý {shopName}
                  <span className="inline-block h-2 w-2 rounded-full bg-success" />
                </div>
                <div className="text-caption text-text-muted">Tư vấn sản phẩm & Báo giá trực tuyến</div>
              </div>
            </div>
            <Button variant="ghost"
              type="button"
              aria-label="Đóng"
              onClick={() => setIsOpen(false)}
              className="text-[length:inherit] h-auto font-[inherit] gap-0 rounded-lg p-1.5 text-text-muted hover:bg-black/5 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Vùng tin nhắn */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-caption">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-text-muted p-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-bold text-text text-caption">Kính chào Quý Khách!</div>
                  <p className="text-caption text-text-muted mt-0.5">
                    Quý khách đang tìm hoa cho dịp gì và ngân sách khoảng bao nhiêu ạ?
                  </p>
                </div>

                <div className="space-y-1.5 w-full pt-3">
                  {[
                    "Tư vấn sản phẩm sinh nhật tầm 500k",
                    "Kệ hoa khai trương trang trọng tone đỏ",
                    "Hoa tặng mẹ ngày lễ 20/10",
                  ].map((q, idx) => (
                    <Button variant="outline"
                      type="button"
                      key={idx}
                      onClick={() => handleSendMessage(q)}
                      className="h-auto gap-0 w-full text-left rounded-xl border border-primary/20 bg-primary/5 p-2 text-caption font-medium text-text hover:bg-primary/10 flex items-center justify-between cursor-pointer"
                    >
                      <span className="truncate">{q}</span>
                      <ArrowRight className="h-3 w-3 text-primary shrink-0 ml-1" />
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => {
                const isUser = m.senderType === "USER"
                const flowers = m.suggestedProducts || []

                return (
                  <div key={m.id} className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
                    {!isUser && (
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary mt-0.5">
                        <Bot className="h-3.5 w-3.5" />
                      </span>
                    )}

                    <div className="max-w-[85%] space-y-2">
                      <div
                        className={`rounded-2xl px-3.5 py-2 text-caption leading-relaxed whitespace-pre-line ${
                          isUser
                            ? "bg-primary text-white font-medium rounded-br-none"
                            : "bg-surface border border-border text-text rounded-bl-none shadow-2xs"
                        }`}
                      >
                        {m.content}
                      </div>

                      {/* Thẻ hoa gợi ý từ Master Index */}
                      {flowers.length > 0 && (
                        <div className="space-y-2 pt-1">
                          {flowers.map((f) => (
                            <div
                              key={f.productId}
                              className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-2 shadow-2xs"
                            >
                              {f.sampleImageUrl ? (
                                <img
                                  src={f.sampleImageUrl}
                                  alt={f.productName}
                                  className="h-11 w-11 rounded-lg object-cover border border-primary/20"
                                />
                              ) : (
                                <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center text-primary/60">
                                  <Flower2 className="h-5 w-5" />
                                </div>
                              )}

                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-text text-caption truncate">
                                  {f.productName}
                                </div>
                                <div className="text-primary font-extrabold text-caption">
                                  {Number(f.priceVnd).toLocaleString("vi-VN")} đ
                                </div>
                              </div>

                              <Button variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleOpenCheckout({
                                    productName: f.productName,
                                    budgetVnd: f.priceVnd ?? null,
                                  })
                                }
                                className="h-7 px-2.5 bg-primary hover:bg-primary-dark text-white text-caption shrink-0"
                              >
                                <ShoppingBag className="mr-1 h-3 w-3" /> Đặt ngay
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Thanh chốt đơn nhanh khi đã có tin nhắn */}
          {messages.length > 0 && (
            <div className="px-3 py-1.5 bg-primary/5 border-t border-primary/10 flex items-center justify-between">
              <span className="text-caption text-text-muted">Chốt đơn từ tin nhắn?</span>
              <Button variant="ghost"
                type="button"
                onClick={() => handleOpenCheckout()}
                className="h-auto p-0 inline-flex items-center gap-1 text-caption font-bold text-primary hover:underline cursor-pointer"
              >
                <Sparkles className="h-3 w-3" /> Trích xuất đơn VietQR →
              </Button>
            </div>
          )}

          {/* Form nhập */}
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
                placeholder="Nhắn tin cho cửa hàng..."
                className="flex-1"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                disabled={sending}
              />
              <Button
                type="submit"
                size="sm"
                disabled={!inputQuery.trim() || sending}
                className="h-8 w-8 p-0 rounded-xl bg-primary hover:bg-primary-dark text-white shrink-0"
              >
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" /> : <Send className="h-3.5 w-3.5" />}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Chốt Đơn & Thanh Toán VietQR (DH-03, DH-04) */}
      {activeDraft && (
        <ChatOrderCheckoutModal
          isOpen={checkoutModalOpen}
          onClose={() => setCheckoutModalOpen(false)}
          initialDraft={activeDraft}
          onOrderCreated={(orderCode) => {
            setMessages((prev) => [
              ...prev,
              {
                id: newMessageId("bot"),
                senderType: "ASSISTANT",
                content: `Dạ em đã tạo đơn hàng #${orderCode} thành công cho mình qua thanh toán VietQR Napas 247 rồi ạ! Tiệm sẽ chuẩn bị hoa và giao đúng hẹn cho mình ạ.`,
              },
            ])
          }}
        />
      )}
    </>
  )
}
