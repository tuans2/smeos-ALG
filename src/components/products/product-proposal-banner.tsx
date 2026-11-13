"use client"

import { useState } from "react"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useSession } from "@/lib/session"
import { proposalExpiresAt, readProposal } from "@/modules/products/domain/product-proposal"

interface ProductProposalBannerProps {
  productId: string
  attributes: Record<string, unknown> | null | undefined
  onChanged: () => void
}

const DAY_MS = 86_400_000

/**
 * Trạng thái mẫu nhân viên đề xuất ở trang chi tiết. Chỉ người có `H3` thấy nút
 * Duyệt / Từ chối; máy chủ kiểm lại ở `POST /products/:id/approve|reject`.
 */
export function ProductProposalBanner({ productId, attributes, onChanged }: ProductProposalBannerProps) {
  const { can } = useSession()
  const [dangGui, setDangGui] = useState<"approve" | "reject" | null>(null)
  const [moTuChoi, setMoTuChoi] = useState(false)
  const [lyDo, setLyDo] = useState("")
  const [loi, setLoi] = useState<string | null>(null)
  const [now] = useState(() => Date.now())

  const proposal = readProposal(attributes)
  if (!proposal || proposal.status === "approved") return null

  if (proposal.status !== "pending") {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger-bg px-3.5 py-2.5 text-body-sm font-medium text-danger">
        {proposal.status === "rejected" ? "Mẫu đề xuất đã bị từ chối và đang tạm ẩn." : "Mẫu đề xuất quá 30 ngày chưa được duyệt nên đã tự tạm ẩn."}
        {proposal.note ? ` Lý do: ${proposal.note}` : ""} Mẫu sẽ vào thùng rác sau 30 ngày.
      </div>
    )
  }

  const conLai = Math.max(0, Math.ceil((proposalExpiresAt(proposal).getTime() - now) / DAY_MS))

  const gui = async (kind: "approve" | "reject") => {
    setDangGui(kind)
    setLoi(null)
    try {
      const res = await fetch(`/api/v1/products/${productId}/${kind}`, {
        method: "POST",
        ...(kind === "reject" ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: lyDo }) } : {}),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.error?.message || "Không lưu được quyết định, vui lòng thử lại")
      setMoTuChoi(false)
      onChanged()
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không lưu được quyết định, vui lòng thử lại")
    } finally {
      setDangGui(null)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-warning/30 bg-warning-bg px-3.5 py-2.5 text-body-sm text-warning-text">
      <span className="flex-1 font-medium">
        Mẫu do nhân viên đề xuất, đang dùng được để bán và chờ Điều hành duyệt. Còn {conLai} ngày trước khi tự tạm ẩn.
      </span>
      {can("H3") && !moTuChoi && (
        <>
          <Button size="sm" variant="outline" onClick={() => setMoTuChoi(true)} disabled={dangGui !== null}>
            Từ chối
          </Button>
          <Button size="sm" onClick={() => gui("approve")} disabled={dangGui !== null} className="font-bold">
            {dangGui === "approve" && <Loader2 size={15} className="animate-spin motion-reduce:animate-none" />}
            <span>Duyệt mẫu</span>
          </Button>
        </>
      )}
      {moTuChoi && (
        <div className="flex w-full flex-wrap items-center gap-2">
          <label htmlFor="ly-do-tu-choi" className="sr-only">Lý do từ chối</label>
          <Input
            id="ly-do-tu-choi"
            value={lyDo}
            onChange={(e) => setLyDo(e.target.value)}
            maxLength={500}
            placeholder="Lý do từ chối, người đề xuất sẽ nhận được"
            className="h-9 min-w-0 flex-1"
          />
          <Button size="sm" variant="outline" onClick={() => setMoTuChoi(false)} disabled={dangGui !== null}>
            Huỷ
          </Button>
          <Button size="sm" variant="outline" onClick={() => gui("reject")} disabled={dangGui !== null || !lyDo.trim()} className="font-bold">
            {dangGui === "reject" && <Loader2 size={15} className="animate-spin motion-reduce:animate-none" />}
            <span>Xác nhận từ chối</span>
          </Button>
        </div>
      )}
      {loi && <span className="w-full text-danger">{loi}</span>}
    </div>
  )
}
