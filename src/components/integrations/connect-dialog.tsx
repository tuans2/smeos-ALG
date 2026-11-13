"use client"

import { useState } from "react"
import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { InlineError } from "@/components/ui/inline-error"
import type { CatalogItem } from "@/modules/integration-hub/use-cases/get-integration-hub"
import { integrationApi } from "./integration-api"
import { SECRET_LABEL } from "./integration-labels"

interface ConnectDialogProps {
  item: CatalogItem | null
  onClose: () => void
  onConnected: () => void
  askConfirm: (options: { title: string; consequence: string; confirmLabel: string }) => Promise<boolean>
}

/**
 * Kết nối bằng khoá: (1) giải thích quyền sẽ cấp → (2) nhập khoá → (3) xác nhận → máy chủ kiểm khoá rồi lưu.
 * Khoá chỉ đi một chiều lên máy chủ; giao diện không bao giờ hiện lại khoá đầy đủ.
 */
export function ConnectDialog({ item, onClose, onConnected, askConfirm }: ConnectDialogProps) {
  const [secret, setSecret] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const secretLabel = item ? (SECRET_LABEL[item.auth] ?? "Khoá kết nối") : ""

  function close() {
    setSecret("")
    setError(null)
    onClose()
  }

  async function submit() {
    if (!item || !secret.trim()) return
    const ok = await askConfirm({
      title: `Kết nối ${item.label}?`,
      consequence: `${item.label} sẽ được gửi dữ liệu và nhận lệnh thay mặt cửa hàng của bạn. Bạn có thể ngắt kết nối bất cứ lúc nào.`,
      confirmLabel: "Kết nối",
    })
    if (!ok) return
    setBusy(true)
    setError(null)
    try {
      await integrationApi.connect(item.key, secret.trim())
      setSecret("")
      onConnected()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không kết nối được")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={item !== null}
      onOpenChange={(open) => !open && close()}
      title={item ? `Kết nối ${item.label}` : ""}
      description={item?.description}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={close}>
            Huỷ
          </Button>
          <Button size="sm" onClick={submit} disabled={busy || !secret.trim()}>
            {busy ? "Đang kiểm tra khoá…" : "Kết nối"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <ol className="list-decimal space-y-1 pl-5 text-body-sm text-text">
          <li>Mở trang quản trị của {item?.label} và tạo {secretLabel.toLowerCase()} mới.</li>
          <li>Dán {secretLabel.toLowerCase()} vào ô bên dưới.</li>
          <li>Bấm Kết nối — hệ thống kiểm tra khoá trước khi lưu.</li>
        </ol>
        <label className="block space-y-1 text-body-sm font-semibold text-text">
          <span>{secretLabel}</span>
          <Input
            type="password"
            autoComplete="off"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            aria-label={secretLabel}
          />
        </label>
        <p className="text-body-sm text-text-muted">Khoá được mã hoá khi lưu. Sau khi lưu chỉ hiện 4 ký tự cuối.</p>
        {error && <InlineError message={error} />}
      </div>
    </Dialog>
  )
}
