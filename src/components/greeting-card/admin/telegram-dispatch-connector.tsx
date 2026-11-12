"use client"

import { Input } from "@/components/ui/input"
import React, { useState } from "react"
import {
  Bot,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  Users,
  ShieldCheck,
} from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { apiSend, useApi } from "@/components/greeting-card/greeting-api"
import { TelegramDirectChatGuide } from "./telegram-direct-chat-guide"
import { TelegramLinkedChatCard } from "./telegram-linked-chat-card"

interface TelegramBotInfo {
  id: number
  is_bot: boolean
  first_name: string
  username: string
  can_join_groups?: boolean
}

interface RecentChat {
  id: string
  title: string
  type: string
}

interface TelegramDispatchResponse {
  data: {
    configured: boolean
    bot: TelegramBotInfo | null
    linkCode: string | null
    recentChats: RecentChat[]
    error?: string
  }
}

interface SendTestResponse {
  data: {
    success: boolean
    messageId?: number
    error?: string
  }
}

export function TelegramDispatchConnector() {
  const { data, error, isLoading, isValidating, mutate } = useApi<TelegramDispatchResponse>(
    "/api/v1/greeting-card/integrations/telegram-dispatch",
    // Mỗi lần quét gọi Telegram — không tự quét lại khi chuyển tab (qua Telegram rồi quay lại)
    { revalidateOnFocus: false, keepPreviousData: true }
  )

  const [testChatId, setTestChatId] = useState("")
  const [testMessage, setTestMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const respData = data?.data
  const isConfigured = respData?.configured ?? false
  const bot = respData?.bot
  const recentChats = respData?.recentChats ?? []
  const linkCode = respData?.linkCode ?? null

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id)
    setCopiedId(id)
    setTestChatId(id)
    setTimeout(() => setCopiedId(null), 2500)
  }

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!testChatId.trim()) return

    setSending(true)
    setResult(null)
    try {
      const res = await apiSend<SendTestResponse>(
        "/api/v1/greeting-card/integrations/telegram-dispatch",
        "POST",
        {
          chatId: testChatId.trim(),
          message: testMessage.trim() || undefined,
        },
        "Gửi tin nhắn Telegram không thành công"
      )

      if (res.data?.success) {
        setResult({
          ok: true,
          text: `Đã gửi tin nhắn thử nghiệm thành công tới Chat ID: ${testChatId.trim()}`,
        })
      } else {
        setResult({
          ok: false,
          text: res.data?.error || "Lỗi không xác định từ Telegram API",
        })
      }
    } catch (err) {
      setResult({
        ok: false,
        text: err instanceof Error ? err.message : "Không thể kết nối đến máy chủ",
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-surface rounded-2xl border border-border p-5 sm:p-6 shadow-sm flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Bot size={22} />
          </div>
          <div>
            <h3 className="text-body font-extrabold text-text flex items-center gap-2">
              Kết Nối Telegram Bot Chi Nhánh
              {isConfigured && bot && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-caption-sm font-bold bg-success-bg text-success border border-success-border">
                  <ShieldCheck size={12} /> Đã kích hoạt
                </span>
              )}
            </h3>
            <p className="text-caption text-text-muted mt-0.5">
              Hạ tầng tự động thông báo đơn gia công và nhắc việc 4 mốc qua Telegram
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => mutate()}
          disabled={isLoading || isValidating}
          className="self-start sm:self-auto flex items-center gap-1.5"
        >
          <RefreshCw size={14} className={isValidating ? "animate-spin motion-reduce:animate-none" : ""} />
          <span>Quét Chat ID mới</span>
        </Button>
      </div>

      {/* Trạng thái Bot */}
      {isConfigured && bot ? (
        <div className="p-4 rounded-xl border border-success-border bg-success-bg/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={20} className="text-success shrink-0" />
            <div>
              <div className="text-body-sm font-bold text-text">
                Bot: {bot.first_name}{" "}
                <a
                  href={`https://t.me/${bot.username}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1 ml-1 font-mono"
                >
                  @{bot.username} <ExternalLink size={12} />
                </a>
              </div>
              <p className="text-caption text-text-muted">
                Bot ID: <code className="font-mono text-text font-semibold">{bot.id}</code> — Sẵn sàng nhận việc và thông báo cho chi nhánh
              </p>
            </div>
          </div>
          <a
            href={`https://t.me/${bot.username}?startgroup=true`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white text-caption font-bold shadow-sm hover:opacity-90 shrink-0 transition-opacity"
          >
            <Users size={14} /> Thêm Bot vào nhóm Chi nhánh
          </a>
        </div>
      ) : isConfigured || isLoading ? null : (
        <div className="p-4 rounded-xl border border-warning-border bg-warning-bg/40 flex items-start gap-3">
          <AlertCircle size={20} className="text-warning-text shrink-0 mt-0.5" />
          <div className="text-caption text-text leading-relaxed">
            <strong className="block text-body-sm font-bold mb-1">Chưa cấu hình Telegram Bot Token</strong>
            Vui lòng khai báo <code className="font-mono font-bold text-text">TELEGRAM_DISPATCH_BOT_TOKEN</code> trong file biến môi trường <code className="font-mono font-bold text-text">.env</code> để kích hoạt tính năng điều phối tự động.
          </div>
        </div>
      )}

      {respData?.error && (
        <div className="p-3 rounded-xl border border-warning-border bg-warning-bg/40 flex items-start gap-2 text-caption text-text">
          <AlertCircle size={16} className="text-warning-text shrink-0 mt-0.5" />
          <span>
            <strong>Không quét được nhóm mới:</strong> {respData.error}. Vui lòng liên hệ bộ phận hỗ trợ.
          </span>
        </div>
      )}

      <TelegramDirectChatGuide botUsername={bot?.username || "smeos_dieuphoi_bot"} linkCode={linkCode} />

      {/* Hướng dẫn 3 bước kết nối */}
      <div className="p-4 rounded-xl bg-surface-alt border border-border flex flex-col gap-2.5">
        <h4 className="text-body-sm font-bold text-text flex items-center gap-1.5">
          <MessageSquare size={16} className="text-primary" /> Hoặc dùng nhóm Telegram cho Chi nhánh trong 3 bước:
        </h4>
        <ol className="text-caption text-text/90 space-y-1.5 list-decimal pl-4 leading-relaxed">
          <li>
            Tạo nhóm Telegram cho Chi nhánh/Xưởng gia công, sau đó thêm bot{" "}
            <strong className="text-primary font-mono">@{bot?.username || "smeos_dieuphoi_bot"}</strong> vào nhóm.
          </li>
          <li>
            Gửi mã liên kết của cửa hàng vào nhóm:{" "}
            <code className="font-mono bg-surface px-1 py-0.5 rounded border border-border">{linkCode ?? "…"}</code>{" "}
            dưới dạng lệnh{" "}
            <code className="font-mono bg-surface px-1 py-0.5 rounded border border-border">/lienket@{bot?.username || "bot"} {linkCode ?? "…"}</code>{" "}
            hoặc trả lời (Reply) một tin của bot bằng mã này. Trong nhóm, bot chỉ đọc lệnh gửi cho nó và tin trả lời nó;
            nhắn tin riêng với bot thì chỉ cần gửi mã. Chỉ nhóm đã gửi đúng mã mới nhận được tin của cửa hàng bạn.
          </li>
          <li>
            Bấm nút <strong>&quot;Quét Chat ID mới&quot;</strong> ở góc trên. ID của nhóm sẽ xuất hiện ngay bên dưới để bạn chọn và kiểm tra.
          </li>
        </ol>
      </div>

      {/* Danh sách Chat ID đã quét được */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-body-sm font-bold text-text flex items-center gap-1.5">
            <Users size={16} className="text-primary" /> Nhóm chat đã liên kết với cửa hàng ({recentChats.length})
          </h4>
          <span className="text-caption text-text-muted">Nhấp vào ID để chọn thử nghiệm</span>
        </div>

        {recentChats.length === 0 ? (
          <div className="p-4 text-center text-caption text-text-muted bg-surface-alt/50 rounded-xl border border-border border-dashed">
            Chưa có nhóm nào gửi mã liên kết. Hãy thêm bot vào nhóm, gửi mã liên kết ở bước 2 rồi bấm quét lại.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {recentChats.map((chat) => (
              <TelegramLinkedChatCard
                key={chat.id}
                chat={chat}
                selected={testChatId === chat.id}
                copied={copiedId === chat.id}
                onSelect={handleCopy}
                onRemoved={() => {
                  if (testChatId === chat.id) setTestChatId("")
                  void mutate()
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Form Gửi Tin Thử Nghiệm */}
      <form onSubmit={handleSendTest} className="pt-3 border-t border-border flex flex-col gap-3">
        <h4 className="text-body-sm font-bold text-text flex items-center gap-1.5">
          <Send size={16} className="text-primary" /> Kiểm tra gửi thông báo thử nghiệm
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1">
            <label className="block text-caption font-semibold text-text mb-1">
              Chat ID nhận tin: <span className="text-danger">*</span>
            </label>
            <Input
              type="text"
              placeholder="-100... hoặc user ID"
              value={testChatId}
              onChange={(e) => setTestChatId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-border bg-surface text-body-sm font-mono focus:border-primary focus:outline-none"
              required
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-caption font-semibold text-text mb-1">
              Nội dung tùy chỉnh (Tùy chọn):
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Để trống để dùng tin nhắn mẫu Điều Phối..."
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                className="flex-1 h-10 px-3 rounded-xl border border-border bg-surface text-body-sm focus:border-primary focus:outline-none"
              />
              <Button
                type="submit"
                disabled={sending || !testChatId.trim() || !isConfigured}
                className="h-10 px-4 shrink-0 flex items-center gap-1.5"
              >
                <Send size={15} />
                <span>{sending ? "Đang gửi..." : "Gửi thử"}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Kết quả gửi */}
        {result && (
          <div
            className={`p-3 rounded-xl border text-caption flex items-start gap-2 ${
              result.ok
                ? "border-success-border bg-success-bg/60 text-success"
                : "border-danger-border bg-danger-bg/60 text-danger"
            }`}
          >
            {result.ok ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <AlertCircle size={16} className="shrink-0 mt-0.5" />}
            <span className="font-medium">{result.text}</span>
          </div>
        )}
      </form>
    </div>
  )
}
