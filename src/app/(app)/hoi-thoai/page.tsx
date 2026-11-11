"use client"

import { useI18n } from "@/lib/i18n"
import React, { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Send } from "@/components/ui/icon-set/send"
import { Plus } from "@/components/ui/icon-set/plus"
import { Bot } from "@/components/ui/icon-set/bot"
import { User } from "@/components/ui/icon-set/user"
import { ShoppingBag } from "@/components/ui/icon-set/shopping-bag"
import { Clock } from "@/components/ui/icon-set/clock"
import { ArrowLeft } from "@/components/ui/icon-set/arrow-left"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Flower2 } from "@/components/ui/icon-set/flower2"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { ExternalLink } from "@/components/ui/icon-set/external-link"
import { Share2 } from "@/components/ui/icon-set/share2"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { FeatureGuidanceCard } from "@/components/ui/feature-guidance-card"
import { useSession } from "@/lib/session"
import { getIndustryTerminology } from "@/modules/organization/domain/industry-profile"
import type { Route } from "next"
import type { ChatConversation, ChatMessage } from "@/modules/chat-assistant/domain/chat-types"
import { MobileMenuButton } from "@/components/layout/mobile-nav-context"
import { PageHeader } from "@/components/ui/page-header"

export default function ChatAssistantPage() {
  const { t } = useI18n()
  const router = useRouter()
  const { organization } = useSession()
  const ti = getIndustryTerminology(organization?.industry)
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputQuery, setInputQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [creatingOrderFor, setCreatingOrderFor] = useState<string | null>(null)
  const [createdOrderNotice, setCreatedOrderNotice] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 1. Tải danh sách hội thoại
  const loadConversations = useCallback(() => {
    fetch("/api/v1/chat/conversations")
      .then((r) => r.json())
      .then((res) => {
        const items = res.items || []
        setConversations(items)
        if (items.length > 0 && !selectedConvId) {
          setSelectedConvId(items[0].id)
        }
      })
      .catch((err) => console.error(err))
  }, [selectedConvId])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // 2. Tải tin nhắn của hội thoại đã chọn
  useEffect(() => {
    if (!selectedConvId) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu từ API khi mount/đổi tham số; setState nằm trong hàm tải (nợ #149)
    setLoading(true)
    fetch(`/api/v1/chat/conversations/${selectedConvId}/messages`)
      .then((r) => r.json())
      .then((res) => {
        setMessages(res.messages || [])
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [selectedConvId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // 3. Tạo hội thoại mới
  async function handleCreateNewConv() {
    const res = await fetch("/api/v1/chat/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `Tư vấn khách hàng #${conversations.length + 1}`,
        channel: "INTERNAL_DASHBOARD",
      }),
    })
    if (res.ok) {
      const { conversation } = await res.json()
      setConversations((prev) => [conversation, ...prev])
      setSelectedConvId(conversation.id)
    }
  }

  // 4. Gửi tin nhắn
  async function handleSendMessage(queryToSend?: string) {
    const text = queryToSend || inputQuery
    if (!text.trim() || !selectedConvId || sending) return

    setInputQuery("")
    setSending(true)
    setCreatedOrderNotice(null)

    try {
      const res = await fetch(`/api/v1/chat/conversations/${selectedConvId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text }),
      })

      if (res.ok) {
        const { userMessage, assistantMessage } = await res.json()
        setMessages((prev) => [...prev, userMessage, assistantMessage])
        loadConversations()
      }
    } catch (err) {
      console.error("Lỗi gửi tin:", err)
    } finally {
      setSending(false)
    }
  }

  // 5. 1-chạm chốt đơn sang M10
  async function handleQuickCreateOrder(productId: string) {
    if (!selectedConvId) return
    setCreatingOrderFor(productId)
    try {
      const res = await fetch(`/api/v1/chat/conversations/${selectedConvId}/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      })

      if (res.ok) {
        const data = await res.json()
        setCreatedOrderNotice(`Đã tạo thành công Đơn hàng nháp #${data.order.code}!`)
        // Tải lại tin nhắn để thấy tin nhắn SYSTEM xác nhận đơn
        const resMsgs = await fetch(`/api/v1/chat/conversations/${selectedConvId}/messages`).then((r) => r.json())
        setMessages(resMsgs.messages || [])
      }
    } finally {
      setCreatingOrderFor(null)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-bg">
      {/* 1. Header chuẩn Top-Right Action Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-bg/95 px-4 sm:px-6 py-4 backdrop-blur-sm">
        <div className="flex items-start"><MobileMenuButton /><div>
          {/* Tiêu đề tiếng Việt, ngắn; giải thích trong "?" (OPERATING_PRINCIPLES §6.1) */}
          <PageHeader
            title="Tư vấn bán hàng"
            tip="Trợ lý AI tra cứu sản phẩm và lịch sử khách, trả lời khách và chốt đơn nháp chỉ với một chạm."
          />
        </div></div>

        {/* Top-Right Action Header */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={handleCreateNewConv}
            className="font-semibold flex items-center gap-1.5"
          >
            <Plus size={16} /> Cuộc trò chuyện mới
          </Button>
          <Link href={"/hoi-thoai/kenh-tich-hop" as Route}>
            <Button
              variant="outline"
              size="sm"
              className="font-semibold text-caption gap-1.5"
            >
              <Share2 size={14} />
              Tích Hợp Đa Kênh
            </Button>
          </Link>
        </div>
      </header>

      {/* 2. Main content */}
      <div className="flex-1 p-4 sm:p-6 space-y-5 max-w-7xl mx-auto w-full flex flex-col">
        {/* Khối hướng dẫn SSOT FeatureGuidanceCard */}
        <FeatureGuidanceCard
          badgeLabel="HƯỚNG DẪN TƯ VẤN"
          badgeIcon={Bot}
          title={`Trợ Lý Tư Vấn ${ti.sampleProduct} & Tự Động Hóa Chốt Đơn`}
          description={`Hệ thống tích hợp AI đàm thoại chuyên sâu, tự động liên kết dữ liệu ${ti.sampleProduct}, công thức định lượng ${ti.rawMaterialItem} và lịch sử khách hàng để gợi ý chuẩn xác và đẩy đơn nháp 1-chạm sang xưởng.`}
          tips={[
            { icon: "⚡", text: "1-chạm chốt đơn: Bấm 'Chốt đơn mẫu này' để tạo ngay đơn nháp sang xưởng" },
            { icon: "🎯", text: "Nhận diện ngân sách & dịp: AI tự bóc tách số tiền và ngày lễ (sinh nhật, khai trương)" },
            { icon: "💎", text: `Danh mục sản phẩm: ${ti.sampleProduct} gợi ý luôn có ảnh thật, công thức định lượng ${ti.rawMaterialItem} và giá chuẩn` },
          ]}
        />

        {/* Thông báo tạo đơn thành công */}
        {createdOrderNotice && (
          <div className="flex items-center justify-between rounded-xl bg-success-bg border border-success/30 p-4 text-body-sm font-bold text-success">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              {createdOrderNotice}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push("/don-hang" as Route)}
              className="text-caption"
            >
              Mở bảng Đơn hàng <ExternalLink className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Khung Chat 2 Cột */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[550px] rounded-2xl border border-border bg-surface overflow-hidden shadow-sm p-1">
          {/* CỘT TRÁI: DANH SÁCH HỘI THOẠI */}
          <div className={`border-r border-border flex flex-col bg-surface-alt/40 ${selectedConvId ? "hidden md:flex" : "flex"}`}>
            <div className="p-3.5 border-b border-border font-bold text-caption text-text-muted flex items-center justify-between">
              <span>Danh sách hội thoại ({conversations.length})</span>
              <Button size="sm" variant="ghost" onClick={handleCreateNewConv} className="h-7 px-2 text-caption">
                <Plus size={14} /> Mới
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-border">
              {conversations.length === 0 ? (
                <div className="p-6 text-center text-caption text-text-muted">
                  Chưa có hội thoại nào. Bấm &quot;+ Mới&quot; để bắt đầu!
                </div>
              ) : (
                conversations.map((c) => (
                  <Button
                    key={c.id}
                    variant="ghost"
                    onClick={() => setSelectedConvId(c.id)}
                    className={`h-auto w-full justify-start text-left p-3.5 rounded-none transition-colors flex flex-col items-stretch gap-1 min-h-11 font-normal ${
                      selectedConvId === c.id
                        ? "bg-primary/10 border-l-4 border-primary hover:bg-primary/10"
                        : "hover:bg-surface-alt/60"
                    }`}
                  >
                    <div className="flex items-center justify-between text-body-sm w-full">
                      <span className="font-bold text-text truncate">{c.title}</span>
                      <Badge tone={c.channel === "ZALO" ? "accent" : "neutral"} className="text-caption">
                        {c.channel === "ZALO" ? "Zalo" : "Web"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-caption text-text-muted">
                      <Clock size={12} />
                      {new Date(c.updatedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </Button>
                ))
              )}
            </div>
          </div>

          {/* CỘT PHẢI: CỬA SỔ CHAT & GỢI Ý MẪU HOA */}
          <div className={`col-span-2 flex flex-col bg-bg ${selectedConvId ? "flex" : "hidden md:flex"}`}>
            {/* Thanh điều hướng quay lại danh sách trên Mobile */}
            {selectedConvId && (
              <div className="flex md:hidden items-center justify-between border-b border-border bg-surface px-4 py-2.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedConvId(null)}
                  className="flex items-center gap-1.5 text-caption font-semibold text-primary h-auto p-0 hover:bg-transparent"
                >
                  <ArrowLeft size={16} /> Danh sách hội thoại
                </Button>
                <span className="text-caption font-bold truncate max-w-[180px]">
                  {conversations.find((c) => c.id === selectedConvId)?.title ?? "Hội thoại"}
                </span>
              </div>
            )}

            {/* Vùng tin nhắn */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-body-sm">
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin motion-reduce:animate-none text-primary" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-text-muted">
                  <Bot className="h-10 w-10 text-primary/60" />
                  <p className="max-w-md">
                    Xin chào! Tôi là trợ lý AI chuyên tư vấn {ti.sampleProduct}. Hãy thử hỏi về ngân sách, dịp tặng hoặc phong cách thiết kế bạn muốn!
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    {[
                      `${ti.sampleProduct} tặng người thân tầm 500k`,
                      `Sản phẩm khai trương 1 triệu tone đỏ`,
                      `Tư vấn ${ti.sampleProduct} sinh nhật sang trọng`,
                    ].map((sample, idx) => (
                      <Button
                        key={idx}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendMessage(sample)}
                        className="rounded-full border border-dashed border-primary/30 bg-primary/5 px-3 py-1.5 text-caption text-primary hover:bg-primary/10 transition-colors h-auto font-normal"
                      >
                        ⚡ {sample}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m) => {
                  const isUser = m.senderType === "USER"
                  const isSystem = m.senderType === "SYSTEM"
                  const suggestedFlowers = m.metadata?.suggestedFlowers || []

                  if (isSystem) {
                    return (
                      <div key={m.id} className="rounded-lg bg-surface-raised border border-border p-3 text-center text-text-muted italic">
                        {m.content}
                      </div>
                    )
                  }

                  return (
                    <div key={m.id} className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
                      {!isUser && (
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary">
                          <Bot className="h-4 w-4" />
                        </span>
                      )}

                      <div className={`max-w-[80%] space-y-3`}>
                        <div
                          className={`rounded-2xl px-4 py-2.5 text-caption leading-relaxed ${
                            isUser
                              ? "bg-primary text-white font-medium rounded-br-none"
                              : "bg-surface-raised border border-border text-text rounded-bl-none"
                          }`}
                        >
                          {m.content}
                        </div>

                        {/* Danh sách Card sản phẩm gợi ý từ Master Index */}
                        {suggestedFlowers.length > 0 && (
                          <div className="space-y-2 pt-1">
                            <div className="text-caption font-bold text-text flex items-center gap-1.5">
                              <Flower2 className="h-3.5 w-3.5 text-primary" />
                              Sản phẩm đề xuất từ Master Catalog ({suggestedFlowers.length} mẫu):
                            </div>
                            <div className="grid grid-cols-1 gap-2.5">
                              {suggestedFlowers.map((f) => (
                                <div
                                  key={f.productId}
                                  className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3 shadow-sm"
                                >
                                  {f.sampleImageUrl ? (
                                    <img
                                      src={f.sampleImageUrl}
                                      alt={f.productName}
                                      className="h-16 w-16 rounded-lg object-cover border border-border"
                                    />
                                  ) : (
                                    <div className="h-16 w-16 rounded-lg bg-primary-subtle flex items-center justify-center text-primary">
                                      <Flower2 className="h-6 w-6" />
                                    </div>
                                  )}

                                  <div className="flex-1 min-w-0">
                                    <div className="font-bold text-text text-caption truncate">
                                      {f.productName}
                                    </div>
                                    <div className="text-primary font-extrabold text-caption mt-0.5">
                                      {Number(f.priceVnd).toLocaleString("vi-VN")} đ
                                    </div>
                                    <div className="text-caption text-text-muted line-clamp-1 mt-0.5">
                                      {f.reason}
                                    </div>
                                  </div>

                                  <Button
                                    size="sm"
                                    disabled={creatingOrderFor === f.productId}
                                    onClick={() => handleQuickCreateOrder(f.productId)}
                                    className="text-caption shrink-0"
                                  >
                                    {creatingOrderFor === f.productId ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
                                    ) : (
                                      <>
                                        <ShoppingBag className="mr-1 h-3.5 w-3.5" /> Chốt đơn
                                      </>
                                    )}
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {isUser && (
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-raised border border-border text-text">
                          <User className="h-4 w-4" />
                        </span>
                      )}
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Khung soạn tin nhắn */}
            <div className="border-t border-border p-3 bg-surface">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSendMessage()
                }}
                className="flex items-center gap-2"
              >
                <Input
                  type="text"
                  placeholder={`Hỏi về ngân sách, dịp tặng, màu sắc hoặc ${ti.sampleProduct}...`}
                  className="flex-1 text-caption"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  disabled={sending}
                />
                <Button
                  type="submit"
                  size="sm" aria-label="Gửi câu hỏi"
                  disabled={!inputQuery.trim() || sending}
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
