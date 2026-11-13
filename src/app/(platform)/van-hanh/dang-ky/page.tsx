"use client"

// Duyệt tài khoản tự đăng ký (`N13`, PO 22/10/2026). Xem đặc tả 06 mục 21.

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { useI18n } from "@/lib/i18n"
import { formatDateTime } from "@/lib/i18n/formatters"
import { PageHeader } from "@/components/ui/page-header"

type PendingRegistration = {
  userId: string
  email: string
  name: string | null
  createdAt: string
  organizationName: string | null
  instantTrial: boolean
  leadPhone: string | null
}

type DecisionResult = { status: "APPROVED" | "REJECTED"; temporaryPassword?: string }

async function taiDanhSach(): Promise<{ data: PendingRegistration[] } | { loi: string }> {
  const res = await fetch("/api/v1/platform/registrations")
  if (!res.ok) return { loi: res.status === 403 ? "Bạn chưa có quyền duyệt đăng ký." : "Không tải được danh sách đăng ký." }
  return { data: ((await res.json()) as { data: PendingRegistration[] }).data }
}

export default function DuyetDangKyPage() {
  const { t, dict } = useI18n()
  const [confirm, confirmDialog] = useConfirmDialog()
  const [items, setItems] = useState<PendingRegistration[] | null>(null)
  const [loi, setLoi] = useState<string | null>(null)
  const [dangXuLy, setDangXuLy] = useState<string | null>(null)
  const [matKhauTam, setMatKhauTam] = useState<{ email: string; phone: string | null; password: string } | null>(null)

  const apDung = useCallback((kq: Awaited<ReturnType<typeof taiDanhSach>>) => {
    if ("loi" in kq) setLoi(kq.loi)
    else setItems(kq.data)
  }, [])

  useEffect(() => {
    void (async () => apDung(await taiDanhSach()))()
  }, [apDung])

  async function quyet(item: PendingRegistration, decision: "APPROVE" | "REJECT") {
    if (
      decision === "REJECT" &&
      !(await confirm({
        title: `Từ chối đăng ký của ${item.email}?`,
        consequence: "Yêu cầu đăng ký sẽ bị huỷ bỏ.",
        confirmLabel: "Từ chối",
        tone: "danger",
      }))
    ) {
      return
    }
    setDangXuLy(item.userId)
    setLoi(null)
    try {
      const res = await fetch(`/api/v1/platform/registrations/${item.userId}/decision`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision }),
      })
      const body = (await res.json().catch(() => null)) as { data?: DecisionResult; error?: { message?: string } } | null
      if (!res.ok) {
        setLoi(body?.error?.message ?? "Không xử lý được đăng ký này.")
        return
      }
      if (body?.data?.temporaryPassword) {
        setMatKhauTam({ email: item.email, phone: item.leadPhone, password: body.data.temporaryPassword })
      }
      apDung(await taiDanhSach())
    } finally {
      setDangXuLy(null)
    }
  }

  if (!items && !loi) return <div className="py-4"><SkeletonBlock lines={4} /></div>

  return (
    <Card className="overflow-x-auto p-4 rounded-2xl shadow-xs">
      <PageHeader
        className="mb-3 border-b border-border pb-2"
        title="Duyệt đăng ký"
        tip="Tài khoản tự đăng ký hoặc dùng thử chỉ đăng nhập được sau khi bạn duyệt."
        actions={
          <span className="rounded bg-surface-alt px-2 py-0.5 text-caption text-text-muted">{items?.length ?? 0} đang chờ</span>
        }
      />

      {loi && <p className="mb-3 text-body-sm text-danger">{loi}</p>}

      {matKhauTam && (
        <div className="mb-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-body-sm" role="status">
          <div className="font-semibold text-text">Mật khẩu tạm cho {matKhauTam.email}</div>
          <div className="mt-1 font-mono text-body text-text select-all">{matKhauTam.password}</div>
          <div className="mt-1 text-caption text-text-muted">
            Chỉ hiện một lần. Gửi cho khách{matKhauTam.phone ? ` qua số ${matKhauTam.phone}` : ""} rồi đóng thông báo này.
          </div>
          <Button type="button" variant="outline" className="mt-2" onClick={() => setMatKhauTam(null)}>
            Đã gửi, đóng lại
          </Button>
        </div>
      )}

      {items && items.length === 0 ? (
        <p className="py-6 text-center text-body-sm text-text-muted">Không có đăng ký nào đang chờ.</p>
      ) : (
        <table className="w-full text-left text-caption">
          <thead>
            <tr className="border-b border-border text-text-muted">
              <th className="py-2 pr-3">Tài khoản</th>
              <th className="py-2 pr-3">Tổ chức</th>
              <th className="py-2 pr-3">Hình thức</th>
              <th className="py-2 pr-3">Đăng ký lúc</th>
              <th className="py-2 pr-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items?.map((item) => (
              <tr key={item.userId} className="hover:bg-surface-alt">
                <td className="py-2 pr-3">
                  <div className="font-medium text-text">{item.email}</div>
                  {item.name && <div className="text-text-muted">{item.name}</div>}
                </td>
                <td className="py-2 pr-3">{item.organizationName ?? "—"}</td>
                <td className="py-2 pr-3">
                  {item.instantTrial ? `Dùng thử${item.leadPhone ? ` · ${item.leadPhone}` : ""}` : "Đăng ký"}
                </td>
                <td className="py-2 pr-3">{formatDateTime(item.createdAt)}</td>
                <td className="py-2 pr-3">
                  <div className="flex justify-end gap-2">
                    <Button type="button" disabled={dangXuLy === item.userId} onClick={() => void quyet(item, "APPROVE")}>
                      Duyệt
                    </Button>
                    <Button type="button" variant="outline" disabled={dangXuLy === item.userId} onClick={() => void quyet(item, "REJECT")}>
                      Từ chối
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {confirmDialog}
    </Card>
  )
}
