"use client"

import React from "react"
import { Settings } from "@/components/ui/icon-set/settings"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { ChannelStatusItem } from "@/modules/chat-assistant/use-cases/list-chat-channels"
import type { ChannelConfig } from "@/modules/chat-assistant/domain/channel-integration-types"

interface ChannelConfigModalProps {
  channelItem: ChannelStatusItem | null
  configForm: ChannelConfig
  onChangeForm: (newForm: ChannelConfig) => void
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  saveError: string | null
  isBusy: boolean
}

export function ChannelConfigModal({
  channelItem,
  configForm,
  onChangeForm,
  onClose,
  onSubmit,
  saveError,
  isBusy,
}: ChannelConfigModalProps) {
  if (!channelItem) return null

  return (
    <Dialog
      open={Boolean(channelItem)}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      size="md"
      title={
        <div className="flex items-center gap-2 text-body font-bold text-text">
          <Settings className="h-4 w-4 text-primary" aria-hidden="true" />
          Cài Đặt {channelItem.pricing.name}
        </div>
      }
    >
      <div className="space-y-4">
        {saveError && (
          <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger-bg p-2.5 text-caption font-medium text-danger">
            <AlertCircle className="h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
            {saveError}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-3.5 text-caption">
          {channelItem.channel === "FACEBOOK_MESSENGER" && (
            <>
              <div>
                <label className="mb-1 block font-bold text-text-muted">Facebook Page ID</label>
                <Input
                  type="text"
                  required
                  placeholder="VD: 1048291048102"
                  className="w-full"
                  value={configForm.fbPageId || ""}
                  onChange={(e) =>
                    onChangeForm({ ...configForm, fbPageId: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block font-bold text-text-muted">Page Access Token</label>
                <Input
                  type="password"
                  required
                  placeholder="EAAG..."
                  className="w-full font-mono"
                  value={configForm.fbPageAccessToken || ""}
                  onChange={(e) =>
                    onChangeForm({ ...configForm, fbPageAccessToken: e.target.value })
                  }
                />
              </div>
              <div className="rounded-lg bg-surface-alt p-2 text-caption text-text-muted">
                Webhook Callback URL: <code className="text-primary font-mono">{typeof window !== "undefined" ? window.location.origin : "https://app.avilotusgroup.com"}/api/v1/chat/webhooks/facebook</code>
              </div>
            </>
          )}

          {channelItem.channel === "ZALO_OA" && (
            <>
              <div>
                <label className="mb-1 block font-bold text-text-muted">Zalo OA ID</label>
                <Input
                  type="text"
                  required
                  placeholder="VD: 394810294810"
                  className="w-full"
                  value={configForm.zaloOaId || ""}
                  onChange={(e) =>
                    onChangeForm({ ...configForm, zaloOaId: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block font-bold text-text-muted">Zalo OA Access Token</label>
                <Input
                  type="password"
                  placeholder="OA Access Token..."
                  className="w-full font-mono"
                  value={configForm.zaloAccessToken || ""}
                  onChange={(e) =>
                    onChangeForm({ ...configForm, zaloAccessToken: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block font-bold text-text-muted">Zalo App ID</label>
                <Input
                  type="text"
                  required
                  placeholder="App ID trong Zalo for Developers"
                  className="w-full"
                  value={configForm.zaloAppId || ""}
                  onChange={(e) => onChangeForm({ ...configForm, zaloAppId: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block font-bold text-text-muted">Zalo Secret Key (OA)</label>
                <Input
                  type="password"
                  required
                  placeholder="Dùng để xác thực tin nhắn Zalo gửi về"
                  className="w-full font-mono"
                  value={configForm.zaloSecretKey || ""}
                  onChange={(e) => onChangeForm({ ...configForm, zaloSecretKey: e.target.value })}
                />
              </div>
              <div className="rounded-lg bg-surface-alt p-2 text-caption text-text-muted">
                Webhook Callback URL: <code className="text-primary font-mono">{typeof window !== "undefined" ? window.location.origin : "https://app.avilotusgroup.com"}/api/v1/chat/webhooks/zalo</code>
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isBusy}
            >
              {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" /> : "Lưu & Bật Kênh"}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  )
}
