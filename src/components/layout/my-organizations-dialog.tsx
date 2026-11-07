"use client"

import { useCallback, useEffect, useState } from "react"
import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

interface OrganizationItem {
  id: string
  name: string
}

interface InvitationItem {
  membership_id: string
  organization_name: string
  role_name: string
}

async function readData<T>(url: string): Promise<T | null> {
  const res = await fetch(url, { cache: "no-store" }).catch(() => null)
  if (!res?.ok) return null
  return (await res.json().catch(() => null)) as T | null
}

async function post(url: string, body?: unknown): Promise<string | null> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }).catch(() => null)
  if (!res) return "Không kết nối được máy chủ — vui lòng thử lại."
  if (res.ok) return null
  const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
  return res.status === 404 ? "Lời mời không còn — tải lại để xem danh sách mới." : json?.error?.message || "Chưa thực hiện được, vui lòng thử lại."
}

/**
 * "Tổ chức của tôi" (audit hành trình M1, gói UJ-14): người làm ở nhiều cửa hàng chuyển qua lại, và nhận /
 * từ chối lời mời vào cửa hàng khác. Trước đây không có màn nào gọi đổi tổ chức, và lời mời không có chỗ nhận.
 */
export function MyOrganizationsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [orgs, setOrgs] = useState<OrganizationItem[]>([])
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [invitations, setInvitations] = useState<InvitationItem[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [orgRes, me, inv] = await Promise.all([
      readData<{ data: OrganizationItem[] }>("/api/v1/organizations"),
      readData<{ organization: { id: string } | null }>("/api/v1/auth/me"),
      readData<{ data: InvitationItem[] }>("/api/v1/session/invitations"),
    ])
    setOrgs(orgRes?.data ?? [])
    setCurrentId(me?.organization?.id ?? null)
    setInvitations(inv?.data ?? [])
  }, [])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  const run = async (key: string, action: () => Promise<string | null>, after: () => void | Promise<void>) => {
    setBusy(key)
    setError(null)
    const failure = await action()
    setBusy(null)
    if (failure) setError(failure)
    else await after()
  }

  const switchTo = (id: string) =>
    run(`switch:${id}`, () => post("/api/v1/session/organization", { organization_id: id }), () => {
      window.location.assign("/")
    })

  const respond = (id: string, kind: "accept" | "decline") =>
    run(`${kind}:${id}`, () => post(`/api/v1/session/invitations/${id}/${kind}`), load)

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Tổ chức của tôi" description="Chuyển cửa hàng đang làm việc và nhận lời mời vào cửa hàng khác." size="md">
      <div className="flex flex-col gap-5">
        {error && <div className="rounded-xl border border-warning/30 bg-warning-bg p-3 text-caption text-warning-text">{error}</div>}

        {invitations.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-body-sm font-bold text-text">Lời mời đang chờ</h3>
            {invitations.map((inv) => (
              <div key={inv.membership_id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3">
                <div className="min-w-0">
                  <div className="truncate text-body-sm font-semibold text-text">{inv.organization_name}</div>
                  <div className="text-caption text-text-muted">Vai trò: {inv.role_name}</div>
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="ghost" disabled={busy !== null} onClick={() => void respond(inv.membership_id, "decline")}>
                    Từ chối
                  </Button>
                  <Button type="button" size="sm" variant="primary" disabled={busy !== null} onClick={() => void respond(inv.membership_id, "accept")}>
                    {busy === `accept:${inv.membership_id}` ? "Đang nhận…" : "Nhận lời mời"}
                  </Button>
                </div>
              </div>
            ))}
          </section>
        )}

        <section className="flex flex-col gap-2">
          <h3 className="text-body-sm font-bold text-text">Cửa hàng bạn đang tham gia</h3>
          {orgs.length === 0 && <Skeleton className="h-12 w-full rounded-xl" />}
          {orgs.map((org) => (
            <div key={org.id} className="flex items-center justify-between gap-2 rounded-xl border border-border p-3">
              <span className="truncate text-body-sm font-semibold text-text">{org.name}</span>
              {org.id === currentId ? (
                <Badge tone="success">Đang dùng</Badge>
              ) : (
                <Button type="button" size="sm" variant="secondary" disabled={busy !== null} onClick={() => void switchTo(org.id)}>
                  {busy === `switch:${org.id}` ? "Đang chuyển…" : "Chuyển sang"}
                </Button>
              )}
            </div>
          ))}
        </section>
      </div>
    </Dialog>
  )
}
