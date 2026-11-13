"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Download } from "@/components/ui/icon-set/download"
import { Eraser } from "@/components/ui/icon-set/eraser"
import { PencilLine } from "@/components/ui/icon-set/pencil-line"
import { InfoTip } from "@/components/ui/info-tip"
import { InlineError } from "@/components/ui/inline-error"
import { Textarea } from "@/components/ui/textarea"
import { useSession } from "@/lib/session"
import { packageToCsv } from "@/modules/crm/domain/data-package-csv"

import { CustomerDataRequestList } from "./customer-data-requests"

type Pkg = Record<string, unknown>

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement("a")
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

const post = (customerId: string, kind: string, note?: string) =>
  fetch(`/api/v1/crm/customers/${customerId}/data-requests/${kind}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(note ? { note } : {}),
  })

/**
 * Khách yêu cầu xuất / xoá / sửa dữ liệu cá nhân (ADR-014 D-P5, bước P-7b) — trong tab Quyền riêng tư của hồ sơ khách.
 * Nút theo mã năng lực: xuất `R13`, xoá `Q4`, sửa `Q3`. Xoá là hành động R3 không hoàn tác → `ConfirmDialog` bắt gõ chữ.
 */
export function CustomerDataRequestsPanel({ customerId, code, onErased }: { customerId: string; code: string; onErased: () => void }) {
  const { can } = useSession()
  const [reloadKey, setReloadKey] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [exported, setExported] = useState<Pkg | null>(null)
  const [confirmErase, setConfirmErase] = useState(false)
  const [rectifyOpen, setRectifyOpen] = useState(false)
  const [note, setNote] = useState("")

  async function run(kind: "export" | "erase" | "rectify", body?: string) {
    setBusy(kind)
    setError(null)
    try {
      const res = await post(customerId, kind, body)
      if (!res.ok) throw new Error()
      if (kind === "export") setExported(((await res.json()) as { data: { package: Pkg } }).data.package)
      if (kind === "erase") onErased()
      if (kind === "rectify") {
        setRectifyOpen(false)
        setNote("")
      }
      setReloadKey((k) => k + 1)
    } catch {
      setError("Chưa xử lý được yêu cầu. Thử lại sau.")
    } finally {
      setBusy(null)
    }
  }

  const canExport = can("R13")
  const canErase = can("Q4")
  const canRectify = can("Q3")

  return (
    <section className="space-y-3" aria-labelledby="data-requests-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="data-requests-title" className="flex items-center gap-1 text-title-sm font-bold text-text">
          Yêu cầu về dữ liệu
          <InfoTip label="Giải thích: yêu cầu về dữ liệu">
            Khách có quyền xin bản sao, xin sửa hoặc xin xoá dữ liệu cá nhân của mình. Mỗi yêu cầu được ghi lại, hạn xử lý 72 giờ.
          </InfoTip>
        </h3>
        <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap">
          {canExport && (
            <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => void run("export")}>
              <Download className="h-4 w-4" aria-hidden="true" /> Xuất dữ liệu
            </Button>
          )}
          {canRectify && (
            <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => setRectifyOpen((v) => !v)} aria-expanded={rectifyOpen}>
              <PencilLine className="h-4 w-4" aria-hidden="true" /> Ghi nhận yêu cầu sửa
            </Button>
          )}
          {canErase && (
            <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => setConfirmErase(true)} className="text-danger-text">
              <Eraser className="h-4 w-4" aria-hidden="true" /> Xoá dữ liệu
            </Button>
          )}
        </div>
      </div>

      {error && <InlineError message={error} />}

      {exported && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-success-border bg-success-bg p-3 text-caption text-success-text" role="status">
          <span>Đã tạo bản sao dữ liệu. Tải về để gửi cho khách.</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => download(`du-lieu-${code}.json`, JSON.stringify(exported, null, 2), "application/json")}>Tải JSON</Button>
            <Button variant="outline" size="sm" onClick={() => download(`du-lieu-${code}.csv`, packageToCsv(exported), "text/csv;charset=utf-8")}>Tải CSV</Button>
          </div>
        </div>
      )}

      {rectifyOpen && (
        <form className="space-y-2 rounded-xl border border-border p-3" onSubmit={(e) => { e.preventDefault(); void run("rectify", note.trim()) }}>
          <label htmlFor="rectify-note" className="text-caption font-semibold text-text">Khách muốn sửa gì?</label>
          <Textarea id="rectify-note" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="Ví dụ: đổi địa chỉ giao hàng" rows={2} />
          <p className="text-caption text-text-muted">Sửa hồ sơ ở tab Hồ sơ, rồi bấm “Đã sửa xong” ở danh sách bên dưới.</p>
          <Button type="submit" size="sm" disabled={busy !== null}>Ghi nhận</Button>
        </form>
      )}

      <CustomerDataRequestList customerId={customerId} reloadKey={reloadKey} canResolve={canRectify} />

      <ConfirmDialog
        open={confirmErase}
        onOpenChange={setConfirmErase}
        tone="danger"
        title="Xoá dữ liệu cá nhân của khách?"
        consequence={
          <span>
            Tên, số điện thoại, email, địa chỉ, ghi chú, dịp kỷ niệm và tin nhắn của khách bị xoá vĩnh viễn; khách không còn
            nhận tin. Đơn hàng, phiếu thu và thông tin hoá đơn VAT vẫn được giữ để đối chiếu sổ sách. Đơn còn đang làm / đang giao
            giữ địa chỉ, người nhận và lời thiệp tới khi đơn kết thúc, rồi hệ thống tự xoá nốt. Không hoàn tác được.
          </span>
        }
        confirmLabel="Xoá dữ liệu"
        requireText="XOÁ"
        onConfirm={() => run("erase")}
      />
    </section>
  )
}
