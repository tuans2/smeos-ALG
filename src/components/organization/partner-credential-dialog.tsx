"use client"

import { useState } from "react"
import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export interface PartnerCredential {
  storeName: string
  email: string
  temporaryPassword: string
}

/**
 * Mật khẩu đăng nhập ban đầu của cửa hàng đối tác — máy chủ chỉ trả về đúng một lần (audit AUD-009),
 * đóng hộp thoại là không xem lại được.
 */
export function PartnerCredentialDialog({
  credential,
  onClose,
}: {
  credential: PartnerCredential | null
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  if (!credential) return null

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(credential.temporaryPassword)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const close = () => {
    setCopied(false)
    onClose()
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close()
      }}
      title="Đã tạo tài khoản cửa hàng đối tác"
      description="Gửi thông tin này cho chủ cửa hàng. Mật khẩu chỉ hiện một lần — hãy sao chép trước khi đóng."
      size="sm"
      footer={<Button onClick={close}>Tôi đã lưu lại</Button>}
    >
      <PartnerCredentialDetails credential={credential} copied={copied} onCopy={copy} />
    </Dialog>
  )
}

/** Nội dung hộp thoại — tách riêng để kiểm thử (Dialog render qua portal). */
export function PartnerCredentialDetails({
  credential,
  copied,
  onCopy,
}: {
  credential: PartnerCredential
  copied: boolean
  onCopy: () => void
}) {
  return (
    <dl className="space-y-3 text-body-sm">
      <div>
        <dt className="text-text-muted">Cửa hàng</dt>
        <dd className="font-medium text-text">{credential.storeName}</dd>
      </div>
      <div>
        <dt className="text-text-muted">Email đăng nhập</dt>
        <dd className="font-medium text-text break-all">{credential.email}</dd>
      </div>
      <div>
        <dt className="text-text-muted">Mật khẩu ban đầu</dt>
        <dd className="mt-1 flex flex-wrap items-center gap-2">
          <code className="rounded-md bg-surface-alt px-2 py-1 font-mono text-text">{credential.temporaryPassword}</code>
          <Button variant="outline" size="sm" onClick={onCopy}>
            {copied ? "Đã sao chép" : "Sao chép"}
          </Button>
        </dd>
      </div>
    </dl>
  )
}
