"use client"

import { useI18n } from "@/lib/i18n"
import React, { useState, useEffect, useCallback } from "react"
import { Globe } from "@/components/ui/icon-set/globe"
import { Copy } from "@/components/ui/icon-set/copy"
import { Check } from "@/components/ui/icon-set/check"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { ChannelIntegrationCard } from "@/components/chat/channel-integration-card"
import { PublicChatSurfaceSettings } from "@/components/chat/public-chat-surface-settings"
import { ChannelConfigModal } from "@/components/chat/channel-config-modal"
import type { ChannelStatusItem } from "@/modules/chat-assistant/use-cases/list-chat-channels"
import type { ChannelConfig } from "@/modules/chat-assistant/domain/channel-integration-types"

/**
 * Kênh tiếp xúc khách của trợ lý chat (E-Catalog, Landing, Facebook Messenger, Zalo OA, website ngoài).
 * Tách từ trang `/hoi-thoai/kenh-tich-hop` (31/10/2026) để nhúng vào Trung tâm Tích hợp.
 */
export function ChatChannelsPanel() {
  const { t } = useI18n()
  const toast = useToast()
  const [channels, setChannels] = useState<ChannelStatusItem[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingChannel, setUpdatingChannel] = useState<string | null>(null)
  const [copiedScript, setCopiedScript] = useState(false)
  const [embedSnippet, setEmbedSnippet] = useState<string | null>(null)
  const [configModalChannel, setConfigModalChannel] = useState<ChannelStatusItem | null>(null)
  const [modalConfigForm, setModalConfigForm] = useState<ChannelConfig>({})
  const [saveError, setSaveError] = useState<string | null>(null)

  const loadChannels = useCallback(() => {
    setLoading(true)
    fetch("/api/v1/chat/channels")
      .then((r) => r.json())
      .then((res) => {
        setChannels(res.channels || [])
        setEmbedSnippet(typeof res.embedSnippet === "string" ? res.embedSnippet : null)
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu từ API khi mount/đổi tham số; setState nằm trong hàm tải (nợ #149)
    loadChannels()
  }, [loadChannels])

  async function handleToggleChannel(channelItem: ChannelStatusItem) {
    const nextState = !channelItem.isEnabled
    setUpdatingChannel(channelItem.channel)
    setSaveError(null)

    try {
      const res = await fetch("/api/v1/chat/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: channelItem.channel,
          isEnabled: nextState,
          config: channelItem.config,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Không thể thay đổi trạng thái kênh")
      } else {
        loadChannels()
      }
    } catch {
      toast.error("Không kết nối được máy chủ. Hãy thử lại.")
    } finally {
      setUpdatingChannel(null)
    }
  }

  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault()
    if (!configModalChannel) return
    setUpdatingChannel(configModalChannel.channel)
    setSaveError(null)

    try {
      const res = await fetch("/api/v1/chat/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: configModalChannel.channel,
          isEnabled: true,
          config: modalConfigForm,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setSaveError(data.error || "Lỗi lưu cấu hình kênh")
      } else {
        setConfigModalChannel(null)
        loadChannels()
      }
    } catch {
      setSaveError("Lỗi kết nối máy chủ")
    } finally {
      setUpdatingChannel(null)
    }
  }

  function copyEmbedScript() {
    if (!embedSnippet) return
    navigator.clipboard.writeText(embedSnippet)
    setCopiedScript(true)
    setTimeout(() => setCopiedScript(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-body-sm font-extrabold text-text flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            Danh Sách Kênh Tiếp Xúc Khách Hàng
          </h2>
          <span className="text-caption text-text-muted">
            Tự động đồng bộ với sản phẩm và luồng chốt đơn
          </span>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin motion-reduce:animate-none text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {channels.map((item) => (
              <ChannelIntegrationCard
                key={item.channel}
                item={item}
                isBusy={updatingChannel === item.channel}
                onToggle={() => handleToggleChannel(item)}
                onOpenConfig={() => {
                  setConfigModalChannel(item)
                  setModalConfigForm(item.config || {})
                  setSaveError(null)
                }}
              />
            ))}
          </div>
        )}
      </div>

      {!loading && <PublicChatSurfaceSettings channels={channels} onChanged={loadChannels} />}

      {/* Khối lấy mã nhúng cho website riêng */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white">
              <Globe className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-caption font-bold text-text">
                Mã Nhúng Trợ Lý Ảo Lên Website Ngoài (WordPress, Haravan, Shopify)
              </h3>
              <p className="text-caption text-text-muted">
                Chèn thẻ script này vào trước thẻ &lt;/body&gt; trên website của tiệm để mở khung chat 24/7.
              </p>
            </div>
          </div>
          {embedSnippet && (
          <Button
            size="sm"
            onClick={copyEmbedScript}
            className="text-caption h-8 gap-1.5 shadow-xs"
          >
            {copiedScript ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copiedScript ? "Đã chép mã" : "Sao chép mã nhúng"}
          </Button>
          )}
        </div>

        {embedSnippet ? (
          <div className="rounded-xl bg-text p-3 font-mono text-caption text-success overflow-x-auto select-all">
            {embedSnippet}
          </div>
        ) : (
          !loading && (
            <p className="text-caption text-text-muted">
              Mã nhúng tạm thời chưa sẵn sàng. Vui lòng liên hệ bộ phận hỗ trợ để được kích hoạt.
            </p>
          )
        )}
      </div>

      <ChannelConfigModal
        channelItem={configModalChannel}
        configForm={modalConfigForm}
        onChangeForm={setModalConfigForm}
        onClose={() => setConfigModalChannel(null)}
        onSubmit={handleSaveConfig}
        saveError={saveError}
        isBusy={updatingChannel !== null}
      />
    </div>
  )
}
