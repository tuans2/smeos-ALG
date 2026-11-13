"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { InlineError } from "@/components/ui/inline-error"
import { SkeletonBlock } from "@/components/ui/skeleton"
import type { GovernanceItem } from "@/modules/integration-hub/use-cases/integration-governance"
import type { GovernanceMode } from "@/modules/integration-hub/domain/integration-governance"
import { GovernanceEditor } from "./governance-editor"

type Payload = { scope: string; items: GovernanceItem[]; industries: Array<{ key: string; name: string }> }

/** Khoá/cấp sẵn tích hợp cho toàn nền tảng hoặc từng ngành (quyền vận hành N16). Không có quyền → ẩn. */
export function PlatformGovernanceSection() {
  const [scope, setScope] = useState("GLOBAL")
  const [data, setData] = useState<Payload | null>(null)
  const [hidden, setHidden] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const load = useCallback(async (next: string) => {
    const res = await fetch(`/api/v1/platform/integrations/governance?scope=${encodeURIComponent(next)}`)
    if (res.status === 401 || res.status === 403) return setHidden(true)
    if (!res.ok) return setError("Không tải được thiết lập")
    setData((await res.json()) as Payload)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu từ API theo phạm vi đang chọn; setState nằm trong hàm tải (nợ #149)
    void load(scope)
  }, [load, scope])

  async function change(connectorKey: string, mode: GovernanceMode) {
    setBusyKey(connectorKey)
    setError(null)
    try {
      const res = await fetch("/api/v1/platform/integrations/governance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scopeId: scope, connectorKey, mode }),
      })
      const body = (await res.json().catch(() => ({}))) as Partial<Payload> & { error?: { message?: string } }
      if (!res.ok) throw new Error(body.error?.message ?? "Không lưu được")
      setData(body as Payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được")
    } finally {
      setBusyKey(null)
    }
  }

  if (hidden) return null
  return (
    <section aria-label="Khoá tích hợp theo tầng" className="space-y-3">
      <h2 className="text-title font-bold text-text">Khoá tích hợp theo tầng</h2>
      <p className="text-body-sm text-text-muted">
        Thiết lập cho toàn nền tảng áp lên mọi ngành, chuỗi và cửa hàng; thiết lập của một ngành áp cho các tổ chức thuộc ngành đó.
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Phạm vi áp dụng">
        {[{ key: "GLOBAL", name: "Toàn nền tảng" }, ...(data?.industries ?? []).map((i) => ({ key: `industry:${i.key}`, name: `Ngành ${i.name}` }))].map((s) => (
          <Button key={s.key} size="xs" variant={scope === s.key ? "primary" : "outline"} aria-pressed={scope === s.key} onClick={() => setScope(s.key)}>
            {s.name}
          </Button>
        ))}
      </div>
      {error && <InlineError message={error} />}
      {data ? <GovernanceEditor items={data.items} busyKey={busyKey} onChange={change} /> : <SkeletonBlock lines={4} label="Đang tải thiết lập" />}
    </section>
  )
}
