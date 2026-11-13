"use client"

import { useState } from "react"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useI18n } from "@/lib/i18n"

interface OrderCancelDialogProps {
  open: boolean
  onClose: () => void
  orderCode: string | undefined
  onConfirm: (reason: string) => void
  loading: boolean
}

export function OrderCancelDialog({
  open,
  onClose,
  orderCode,
  onConfirm,
  loading,
}: OrderCancelDialogProps) {
  const { dict, t } = useI18n()
  const [reason, setReason] = useState("")

  function handleClose() {
    setReason("")
    onClose()
  }

  function handleConfirm() {
    if (!reason.trim() || loading) return
    onConfirm(reason)
  }

  const dialogTitle = (
    <span className="flex items-center gap-2 text-danger">
      <AlertCircle className="h-4 w-4" />
      {t("orders.actions.cancelTitle", { code: orderCode ?? "" })}
    </span>
  )

  const dialogFooter = (
    <div className="flex justify-end gap-2">
      <Button variant="outline" size="sm" onClick={handleClose} disabled={loading}>
        {dict.common.actions.cancel}
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="border-danger/30 text-danger hover:bg-danger-bg"
        disabled={!reason.trim() || loading}
        onClick={handleConfirm}
      >
        {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />}
        {dict.orders.actions.confirmCancel}
      </Button>
    </div>
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => { if (!isOpen) handleClose() }}
      title={dialogTitle}
      size="sm"
      footer={dialogFooter}
    >
      <div className="space-y-3">
        <p className="text-caption text-text-muted">
          {dict.orders.actions.cancelWarning}
        </p>
        <Textarea
          rows={3}
          className="w-full rounded-md border border-border bg-surface p-2.5 text-caption focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder={dict.orders.actions.cancelReasonPlaceholder}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
    </Dialog>
  )
}

