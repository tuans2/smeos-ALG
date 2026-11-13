"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type Account = { bankBin: string; bankName: string; accountNumber: string; accountHolder: string }
const EMPTY: Account = { bankBin: "", bankName: "", accountNumber: "", accountHolder: "" }
const FIELDS: Array<{ key: keyof Account; label: string }> = [
  { key: "bankName", label: "Ngân hàng" }, { key: "bankBin", label: "Mã BIN ngân hàng (6 số)" },
  { key: "accountNumber", label: "Số tài khoản" }, { key: "accountHolder", label: "Tên chủ tài khoản" },
]

/** Console → Mức dùng → Tài khoản nhận tiền thuê bao (checklist ALG 10.7). Chưa khai thì hoá đơn không có mã VietQR. */
export function BillingAccountCard() {
  const [acc, setAcc] = useState<Account>(EMPTY)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/v1/platform/billing-account")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { data: Account | null } | null) => { if (j?.data) setAcc(j.data) })
      .catch(() => undefined)
  }, [])

  const save = async () => {
    const res = await fetch("/api/v1/platform/billing-account", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(acc) }).catch(() => null)
    const j = (await res?.json().catch(() => null)) as { error?: { details?: { account?: string } } } | null
    setMessage(res?.ok ? "Đã lưu tài khoản nhận tiền" : j?.error?.details?.account ?? "Không lưu được")
  }

  return (
    <Card className="space-y-3 p-4">
      <div>
        <p className="text-body-sm font-bold text-text">Tài khoản nhận tiền thuê bao</p>
        <p className="text-caption text-text-muted">Hoá đơn gói dịch vụ hiện mã VietQR chuyển vào tài khoản này, nội dung là mã hoá đơn để SePay tự đối soát.</p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <Input key={f.key} value={acc[f.key]} onChange={(e) => setAcc({ ...acc, [f.key]: e.target.value })} placeholder={f.label} className="h-9" aria-label={f.label} />
        ))}
      </div>
      <div className="flex items-center justify-end gap-2">
        {message && <span role="status" className="text-caption text-text-muted">{message}</span>}
        <Button type="button" size="sm" variant="secondary" onClick={() => void save()}>Lưu</Button>
      </div>
    </Card>
  )
}
