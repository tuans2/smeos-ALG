"use client"

import { useCallback, useEffect, useState } from "react"
import { InlineError } from "@/components/ui/inline-error"
import type { GovernanceItem } from "@/modules/integration-hub/use-cases/integration-governance"
import type { GovernanceMode } from "@/modules/integration-hub/domain/integration-governance"
import { GovernanceEditor } from "./governance-editor"

/**
 * Chuỗi quyết định cửa hàng thành viên được tự kết nối, bắt buộc dùng kết nối của chuỗi, hay bị cấm.
 * Chỉ hiện khi máy chủ cho phép (tổ chức là chuỗi và có quyền khoá tầng dưới) — 403/404 thì ẩn hẳn.
 */
export function ChainGovernanceSection() {
  const [items, setItems] = useState<GovernanceItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch("/api/v1/integrations/governance")
    if (!res.ok) return setItems(null)
    setItems(((await res.json()) as { items: GovernanceItem[] }).items)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu từ API khi mount; setState nằm trong hàm tải (nợ #149)
    void load()
  }, [load])

  async function change(connectorKey: string, mode: GovernanceMode) {
    setBusyKey(connectorKey)
    setError(null)
    try {
      const res = await fetch("/api/v1/integrations/governance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connector_key: connectorKey, mode }),
      })
      const body = (await res.json().catch(() => ({}))) as { items?: GovernanceItem[]; error?: { message?: string } }
      if (!res.ok) throw new Error(body.error?.message ?? "Không lưu được")
      if (body.items) setItems(body.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được")
    } finally {
      setBusyKey(null)
    }
  }

  if (!items) return null
  return (
    <section aria-label="Quản trị cửa hàng thành viên" className="space-y-3">
      <h2 className="text-title font-bold text-text">Quản trị cửa hàng thành viên</h2>
      <p className="text-body-sm text-text-muted">
        Chọn cửa hàng trong chuỗi được tự kết nối, bắt buộc dùng kết nối của chuỗi, hay không được dùng. Thay đổi áp ngay cho mọi cửa hàng đang liên kết.
      </p>
      {error && <InlineError message={error} />}
      <GovernanceEditor items={items} busyKey={busyKey} onChange={change} />
    </section>
  )
}
