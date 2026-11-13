"use client"

import { useState } from "react"
import { Copy } from "@/components/ui/icon-set/copy"
import { Check } from "@/components/ui/icon-set/check"
import { KeyRound } from "@/components/ui/icon-set/key-round"
import { Button } from "@/components/ui/button"

/**
 * Mật khẩu tạm chỉ hiện MỘT lần (máy chủ không lưu bản rõ): Điều hành chép gửi nhân viên kèm email
 * đăng nhập, nhắc nhân viên tự đổi mật khẩu ở menu tài khoản sau lần vào đầu tiên.
 */
export function TemporaryPasswordNotice({ email, password }: { email: string; password: string }) {
  const [copied, setCopied] = useState(false)
  const text = `Đăng nhập ALG\nEmail: ${email}\nMật khẩu tạm: ${password}\nVào xong hãy đổi mật khẩu ở menu tài khoản.`
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-success-border bg-success-bg p-4">
      <div className="flex items-center gap-2 text-body-sm font-bold text-success">
        <KeyRound size={16} />
        <span>Tài khoản dùng được ngay</span>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-body-sm">
        <dt className="text-text-muted">Email đăng nhập</dt>
        <dd className="font-semibold text-text break-all">{email}</dd>
        <dt className="text-text-muted">Mật khẩu tạm</dt>
        <dd className="font-mono text-title-sm font-bold tracking-wider text-text select-all">{password}</dd>
      </dl>
      <p className="text-caption text-text-muted">Mật khẩu chỉ hiện lần này. Chép gửi nhân viên qua Zalo, nhắc họ đổi mật khẩu sau khi vào.</p>
      <Button type="button" variant="outline" size="sm" onClick={() => void copy()} className="self-start">
        {copied ? <Check size={15} /> : <Copy size={15} />}
        <span>{copied ? "Đã chép" : "Chép thông tin đăng nhập"}</span>
      </Button>
    </div>
  )
}
