"use client"

import React, { useState } from "react"
import { useI18n } from "@/lib/i18n"
import { formatCurrency } from "@/lib/i18n/formatters"
import type { ActionCardOrderPayload } from "@/modules/internal-chat/domain/chat-entities"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { XCircle } from "@/components/ui/icon-set/x-circle"
import { Clock } from "@/components/ui/icon-set/clock"
import { MapPin } from "@/components/ui/icon-set/map-pin"
import { DollarSign } from "@/components/ui/icon-set/dollar-sign"
import { Package } from "@/components/ui/icon-set/package"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ActionCardOrderProps {
  messageId: string
  payload: ActionCardOrderPayload
  isSender: boolean
  onActionComplete?: () => void
}

export function ActionCardOrder({
  messageId,
  payload,
  isSender,
  onActionComplete,
}: ActionCardOrderProps) {
  const { t } = useI18n()
  const [loading, setLoading] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [rejectReason, setRejectReason] = useState("")

  const handleAction = async (action: "ACCEPT_ORDER" | "REJECT_ORDER") => {
    try {
      setLoading(true)
      const res = await fetch(`/api/v1/internal-chat/messages/${messageId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          rejected_reason: action === "REJECT_ORDER" ? rejectReason : undefined,
        }),
      })
      if (res.ok) {
        onActionComplete?.()
      }
    } catch {
      // Ignored
    } finally {
      setLoading(false)
      setRejecting(false)
    }
  }

  const isPending = payload.status === "PENDING_ACCEPT"
  const isAccepted = payload.status === "ACCEPTED" || payload.status === "IN_PROGRESS" || payload.status === "COMPLETED"
  const isRejected = payload.status === "REJECTED"

  return (
    <Card className="p-4 max-w-sm text-text" variant="default">
      <div className="flex items-center justify-between border-b border-border pb-2 mb-3">
        <span className="text-caption font-semibold text-primary bg-primary-muted px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-primary/20">
          <Package className="w-3.5 h-3.5" /> {t("chat.card.legacyTitle", { code: payload.orderCode })}
        </span>
        <span
          className={`text-caption font-medium px-2 py-0.5 rounded-full ${
            isPending
              ? "bg-warning-bg text-warning-text border border-warning/20"
              : isAccepted
              ? "bg-success-bg text-success border border-success/20"
              : "bg-surface-alt text-text-muted"
          }`}
        >
          {t(isPending ? "chat.card.legacyPending" : isAccepted ? "chat.card.legacyAccepted" : "chat.card.legacyRejected")}
        </span>
      </div>

      <div className="flex gap-3 mb-3">
        {payload.thumbnailUrl ? (
          <img
            src={payload.thumbnailUrl}
            alt={payload.orderCode}
            className="w-16 h-16 object-cover rounded-lg border border-border shrink-0"
          />
        ) : (
          <div className="w-16 h-16 bg-surface-alt rounded-lg flex items-center justify-center text-text-muted text-caption shrink-0">
            {t("chat.card.legacyNoImage")}
          </div>
        )}
        <div className="text-caption space-y-1 overflow-hidden">
          {payload.deliveryTime && (
            <div className="flex items-center gap-1.5 text-text-muted truncate">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>Giao: {new Date(payload.deliveryTime).toLocaleString("vi-VN")}</span>
            </div>
          )}
          {payload.deliveryAddress && (
            <div className="flex items-center gap-1.5 text-text-muted truncate">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{payload.deliveryAddress}</span>
            </div>
          )}
          {payload.priceVnd !== undefined && (
            <div className="flex items-center gap-1.5 font-semibold text-primary">
              <DollarSign className="w-3.5 h-3.5 shrink-0" />
              <span>{formatCurrency(payload.priceVnd)}</span>
            </div>
          )}
        </div>
      </div>

      {isPending && !isSender && (
        <div className="pt-2 border-t border-border">
          {!rejecting ? (
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => handleAction("ACCEPT_ORDER")}
                disabled={loading}
                size="sm"
                className="flex-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> {t("chat.card.legacyAccept")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRejecting(true)}
                disabled={loading}
              >
                {t("chat.card.legacyReject")}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Input
                type="text"
                placeholder={t("chat.card.legacyReasonPlaceholder")}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                inputSize="sm"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => handleAction("REJECT_ORDER")}
                  disabled={loading}
                  className="flex-1"
                >
                  {t("chat.card.legacyConfirmReject")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setRejecting(false)}
                >
                  {t("chat.card.legacyCancel")}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {isAccepted && (
        <div className="pt-2 border-t border-border text-caption text-success flex items-center gap-1 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" /> {t("chat.card.legacyAcceptedNote")}
        </div>
      )}

      {isRejected && (
        <div className="pt-2 border-t border-border text-caption text-text-muted flex items-center gap-1">
          <XCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{t("chat.card.legacyRejectedNote", { reason: payload.rejectedReason || t("chat.card.legacyDefaultReason") })}</span>
        </div>
      )}
    </Card>
  )
}
