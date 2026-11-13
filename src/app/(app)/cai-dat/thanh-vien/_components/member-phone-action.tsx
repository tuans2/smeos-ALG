"use client"

import { useState } from "react"

import { Phone } from "@/components/ui/icon-set/phone"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useSession } from "@/lib/session"

/** Điều hành (`A3`) sửa số điện thoại nhân viên — Shipper nhận đơn giao theo số này (checklist ALG 4.5). */
export function MemberPhoneAction({
  member,
  onChanged,
}: {
  member: { id: string; name: string | null; email: string; phone?: string | null | undefined }
  onChanged: () => void
}) {
  const { can } = useSession()
  const [open, setOpen] = useState(false)
  const [phone, setPhone] = useState(member.phone ?? "")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!can("A3")) return null
  const who = member.name || member.email

  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/members/${member.id}/phone`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() || null }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error?.details?.phone || json?.error?.message || "Không lưu được số điện thoại")
      setOpen(false)
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được số điện thoại")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} aria-label={`${member.phone || "Thêm số"} — số điện thoại của ${who}`}>
        <Phone size={15} />
        <span>{member.phone || "Thêm số"}</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen} title={`Số điện thoại của ${who}`} description="Shipper nhận đơn giao theo số này — Điều phối ghi đúng số khi điều xe." size="sm">
        <div className="flex flex-col gap-3">
          {error && <p role="alert" className="text-caption text-danger">{error}</p>}
          <Input type="tel" value={phone} placeholder="VD: 0912345678" onChange={(e) => setPhone(e.target.value)} disabled={busy} aria-label="Số điện thoại" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)} disabled={busy}>Hủy</Button>
            <Button type="button" size="sm" onClick={() => void save()} disabled={busy}>Lưu</Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}
