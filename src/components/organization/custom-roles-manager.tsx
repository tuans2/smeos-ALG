"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { InlineError } from "@/components/ui/inline-error"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { capabilityChanges, editableCapabilityGroups, roleNameProblem } from "@/modules/organization/domain/custom-role-editor"

interface RoleRow { id: string; key: string; name: string; is_system: boolean; capabilities: string[] }

async function send<T>(url: string, method: "POST" | "PATCH", body: unknown): Promise<T> {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  const json = (await res.json().catch(() => null)) as (T & { error?: { message?: string } }) | null
  if (!res.ok) throw new Error(json?.error?.message ?? "Chưa lưu được, vui lòng thử lại")
  return json as T
}

/**
 * Vai trò tuỳ chỉnh (checklist ALG 1.13, quyền `F5` — chỉ Điều hành): tạo vai riêng của cửa hàng và chọn quyền theo nhóm.
 * Vai mới khởi đầu không có quyền. Quyền chỉ dành cho Điều hành không hiện ở đây — máy chủ cũng từ chối nếu bị gửi lên.
 */
export function CustomRolesManager() {
  const groups = useMemo(() => editableCapabilityGroups(), [])
  const [roles, setRoles] = useState<RoleRow[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Set<string>>(new Set())
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const [newName, setNewName] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(() =>
    fetch("/api/v1/roles")
      .then((r) => (r.ok ? (r.json() as Promise<{ data: RoleRow[] }>) : Promise.reject(new Error(String(r.status)))))
      .then((j) => setRoles(j.data))
      .catch(() => setError("Chưa tải được danh sách vai trò. Hãy thử lại.")), [])
  useEffect(() => { void load() }, [load])

  const custom = roles?.filter((r) => !r.is_system) ?? []
  const selected = custom.find((r) => r.id === selectedId) ?? null
  const changes = selected ? capabilityChanges(new Set(selected.capabilities), draft) : []

  function select(role: RoleRow) {
    setSelectedId(role.id)
    setDraft(new Set(role.capabilities))
    setOpenGroup(null)
    setMessage(null)
    setError(null)
  }

  function toggle(code: string, on: boolean) {
    const next = new Set(draft)
    if (on) next.add(code)
    else next.delete(code)
    setDraft(next)
  }

  async function run(action: () => Promise<string>) {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      setMessage(await action())
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chưa lưu được, vui lòng thử lại")
    } finally {
      setBusy(false)
    }
  }

  const create = () => run(async () => {
    const problem = roleNameProblem(newName)
    if (problem) throw new Error(problem)
    const { role } = await send<{ role: { id: string; name: string } }>("/api/v1/roles", "POST", { name: newName.trim() })
    setNewName("")
    setSelectedId(role.id)
    setDraft(new Set())
    return `Đã tạo vai "${role.name}". Chọn quyền cho vai rồi bấm Lưu quyền.`
  })

  const save = () => run(async () => {
    if (!selected) return ""
    await send(`/api/v1/roles/${selected.id}/capabilities`, "PATCH", { changes })
    return `Đã lưu quyền cho vai "${selected.name}". Nhân viên mang vai này nhận quyền mới ở thao tác kế tiếp.`
  })

  if (roles === null && !error) return <SkeletonBlock lines={4} label="Đang tải vai trò" />

  return (
    <div className="flex flex-col gap-4">
      <form className="flex flex-wrap gap-2 rounded-2xl border border-border bg-surface p-4" onSubmit={(e) => { e.preventDefault(); void create() }}>
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Tên vai trò, ví dụ Trưởng ca" aria-label="Tên vai trò mới" className="min-w-[14rem] flex-1" />
        <Button type="submit" size="sm" variant="outline" disabled={busy || !newName.trim()}>Tạo vai trò</Button>
      </form>
      {message && <p role="status" className="text-caption text-success">{message}</p>}
      {error && <InlineError message={error} />}

      <div className="grid gap-4 md:grid-cols-[16rem_1fr]">
        <section className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
          <p className="text-body-sm font-bold text-text">Vai trò riêng của cửa hàng</p>
          {custom.length === 0 && <p className="text-caption text-text-muted">Chưa có vai trò riêng.</p>}
          {custom.map((r) => (
            <Button key={r.id} type="button" variant={r.id === selectedId ? "secondary" : "ghost"} size="xs" className="justify-between" onClick={() => select(r)}>
              <span className="truncate">{r.name}</span>
              <Badge tone="neutral" size="sm">{r.capabilities.length} quyền</Badge>
            </Button>
          ))}
          <p className="mt-2 text-caption text-text-muted">Vai có sẵn của hệ thống: {roles?.filter((r) => r.is_system).map((r) => r.name).join(", ")}.</p>
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
          {!selected ? (
            <p className="text-caption text-text-muted">Chọn một vai trò riêng để xem và chọn quyền.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <p className="flex-1 text-body-sm font-bold text-text">Quyền của vai “{selected.name}”</p>
                <Button type="button" size="sm" disabled={busy || changes.length === 0} onClick={() => void save()}>
                  {busy ? "Đang lưu…" : changes.length > 0 ? `Lưu quyền (${changes.length} thay đổi)` : "Lưu quyền"}
                </Button>
              </div>
              <p className="text-caption text-text-muted">Các việc chỉ dành cho Điều hành (xác nhận tiền, huỷ đơn, hoàn tiền, giá dưới sàn, tạo vai…) không giao được cho vai riêng.</p>
              <ul className="divide-y divide-border rounded-xl border border-border">
                {groups.map((g) => {
                  const on = g.items.filter((i) => draft.has(i.code)).length
                  const open = openGroup === g.group
                  return (
                    <li key={g.group} className="px-3 py-2">
                      <Button type="button" variant="ghost" size="xs" className="w-full justify-between" aria-expanded={open} onClick={() => setOpenGroup(open ? null : g.group)}>
                        <span className="font-semibold text-text">{g.label}</span>
                        <span className="text-caption text-text-muted">{on}/{g.items.length}</span>
                      </Button>
                      {open && (
                        <div className="mt-2 flex flex-col gap-2">
                          {g.items.map((i) => (
                            <label key={i.code} className="flex items-center gap-3 text-body-sm text-text">
                              <Switch checked={draft.has(i.code)} disabled={busy} onCheckedChange={(v) => toggle(i.code, v)} aria-label={i.label} />
                              {i.label}
                            </label>
                          ))}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
