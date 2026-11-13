"use client"

import React, { useState, useEffect } from "react"
import { Bot } from "@/components/ui/icon-set/bot"
import { BookOpen } from "@/components/ui/icon-set/book-open"
import { ExternalLink } from "@/components/ui/icon-set/external-link"
import { Flower2 } from "@/components/ui/icon-set/flower2"
import { ShoppingBag } from "@/components/ui/icon-set/shopping-bag"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { Button } from "@/components/ui/button"
import type { ChatMessageMetadata } from "@/modules/chat-assistant/domain/chat-types"

interface CopilotMessageItemProps {
  message: {
    id: string
    senderType: string
    content: string
    metadata?: ChatMessageMetadata | undefined
  }
  creatingOrderFor: string | null
  onQuickCreateOrder: (productId: string) => void
  onNavigate: (route: string) => void
  isLatestAssistant?: boolean | undefined
  onTypingProgress?: (() => void) | undefined
}

export function CopilotMessageItem({
  message,
  creatingOrderFor,
  onQuickCreateOrder,
  onNavigate,
  isLatestAssistant = false,
  onTypingProgress,
}: CopilotMessageItemProps) {
  const isUser = message.senderType === "USER"
  const isSystem = message.senderType === "SYSTEM"
  const meta: ChatMessageMetadata = message.metadata || {}
  const suggestedFlowers = meta.suggestedFlowers || []
  const targetRoute = meta.targetRoute
  const actionLabel = meta.actionLabel

  // Hiệu ứng gõ chữ (Typewriter Effect) cho câu trả lời mới nhất của AI
  const shouldType = !isUser && !isSystem && isLatestAssistant
  const [displayedText, setDisplayedText] = useState(shouldType ? "" : message.content)
  const [isTyping, setIsTyping] = useState(shouldType)

  useEffect(() => {
    if (!shouldType) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- khởi động lại hiệu ứng gõ chữ khi tin nhắn đổi, chủ đích
      setDisplayedText(message.content)
      setIsTyping(false)
      return
    }

    let currentIndex = 0
    setIsTyping(true)
    setDisplayedText("")

    const totalChars = message.content.length
    // Tự động điều chỉnh tốc độ: câu dài gõ theo cụm 3-4 ký tự để hoàn tất trong 1.5 - 2.5s
    const step = totalChars > 400 ? 4 : totalChars > 200 ? 3 : totalChars > 100 ? 2 : 1
    const intervalTime = 14

    const timer = setInterval(() => {
      currentIndex += step
      if (currentIndex >= totalChars) {
        setDisplayedText(message.content)
        setIsTyping(false)
        clearInterval(timer)
        onTypingProgress?.()
      } else {
        setDisplayedText(message.content.slice(0, currentIndex))
        if (currentIndex % 35 < step) {
          onTypingProgress?.()
        }
      }
    }, intervalTime)

    return () => clearInterval(timer)
  }, [message.content, shouldType])

  if (isSystem) {
    return (
      <div className="rounded-lg bg-surface border border-border p-2.5 text-center text-caption text-text-muted italic">
        {message.content}
      </div>
    )
  }

  return (
    <div className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary mt-0.5">
          <Bot className="h-3.5 w-3.5" />
        </span>
      )}

      <div className="max-w-[85%] space-y-2">
        <div
          className={`rounded-2xl px-3.5 py-2 text-caption leading-relaxed whitespace-pre-line transition-all ${
            isUser
              ? "bg-primary text-white font-medium rounded-br-none"
              : "bg-surface border border-border text-text rounded-bl-none shadow-2xs select-text"
          }`}
        >
          {displayedText}
          {isTyping && (
            <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-primary rounded-xs animate-pulse motion-reduce:animate-none align-middle" />
          )}
        </div>

        {/* NÚT DEEP LINK CHUYỂN TRANG NHANH KHI HỎI VẬN HÀNH SAAS (Hiện mượt sau khi gõ xong) */}
        {!isTyping && targetRoute && actionLabel && (
          <div className="pt-1 animate-in fade-in duration-300">
            <Button
              size="sm"
              onClick={() => onNavigate(targetRoute)}
              className="w-full bg-primary hover:bg-primary-dark text-white text-caption font-semibold flex items-center justify-center gap-1.5 shadow-xs"
            >
              <BookOpen className="h-3.5 w-3.5" />
              {actionLabel}
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </div>
        )}

        {/* THẺ MẪU HOA GỢI Ý TỪ MASTER INDEX (Hiện mượt sau khi gõ xong) */}
        {!isTyping && suggestedFlowers.length > 0 && (
          <div className="space-y-2 pt-1 animate-in fade-in duration-300">
            {suggestedFlowers.map((f) => (
              <div
                key={f.productId}
                className="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-2 shadow-2xs"
              >
                {f.sampleImageUrl ? (
                  <img
                    src={f.sampleImageUrl}
                    alt={f.productName}
                    className="h-12 w-12 rounded-lg object-cover border border-primary/20"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary/60">
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

                <Button
                  size="sm"
                  disabled={creatingOrderFor === f.productId}
                  onClick={() => onQuickCreateOrder(f.productId)}
                  className="h-7 px-2.5 bg-primary hover:bg-primary-dark text-white text-caption shrink-0"
                >
                  {creatingOrderFor === f.productId ? (
                    <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" />
                  ) : (
                    <>
                      <ShoppingBag className="mr-1 h-3 w-3" /> Chốt đơn
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
