"use client"

// Chọn bộ máy phân tích ảnh cho cả tổ chức (`H4`, trần cứng `dieu_hanh`).
//
//   Đọc  → GET /api/v1/vision/engine   (H1 — ai chạy phân tích cũng xem được)
//   Ghi  → PUT /api/v1/vision/engine   (H4 — chỉ Điều hành)
//
// Ba bộ trả cùng một hợp đồng JSON nên mọi thứ hạ nguồn không đổi. Thứ đổi
// là chất lượng, chi phí, và ảnh có rời khỏi hạ tầng của tổ chức hay không —
// nên màn này nói thẳng cả ba, thay vì bày ba lựa chọn trông ngang nhau.

import { useI18n } from "@/lib/i18n"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle } from "@/components/ui/icon-set/alert-triangle"
import { Check } from "@/components/ui/icon-set/check"
import { Cloud } from "@/components/ui/icon-set/cloud"
import { Server } from "@/components/ui/icon-set/server"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { Card } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { useSession } from "@/lib/session"
import { cn } from "@/lib/utils"

type TrangThai = "san_xuat" | "thu_nghiem" | "chua_san_sang"

type MoTaBoMay = {
  key: string
  ten: string
  mo_ta: string
  trang_thai: TrangThai
  gui_anh_ra_ngoai: boolean
}

const NHAN_TRANG_THAI: Record<TrangThai, { chu: string; lop: string }> = {
  san_xuat: { chu: "Đã chạy thật", lop: "bg-success-bg text-primary" },
  thu_nghiem: { chu: "Chưa đo độ chính xác", lop: "bg-warning-bg text-warning-text" },
  chua_san_sang: { chu: "Chưa sẵn sàng", lop: "bg-surface-alt text-text-muted" },
}

export default function BoMayPage() {
  const { t } = useI18n()
  const router = useRouter()
  const { can } = useSession()
  const [danhSach, setDanhSach] = useState<MoTaBoMay[] | null>(null)
  const [dangDung, setDangDung] = useState<string | null>(null)
  const [chon, setChon] = useState<string | null>(null)
  const [dangLuu, setDangLuu] = useState(false)
  const [loi, setLoi] = useState<string | null>(null)
  const [daLuu, setDaLuu] = useState(false)
  const [hienXacNhan, setHienXacNhan] = useState(false)

  useEffect(() => {
    let huy = false
    async function nap() {
      const res = await fetch("/api/v1/vision/engine")
      if (res.status === 401) {
        router.push("/dang-nhap")
        return
      }
      if (!res.ok) {
        if (!huy) setLoi(`Không đọc được cấu hình bộ máy (${res.status})`)
        return
      }
      const data = (await res.json()) as { dang_dung: string; danh_sach: MoTaBoMay[] }
      if (huy) return
      setDanhSach(data.danh_sach)
      setDangDung(data.dang_dung)
      setChon(data.dang_dung)
    }
    void nap()
    return () => {
      huy = true
    }
  }, [router])

  async function luu() {
    if (!chon || chon === dangDung) return
    setDangLuu(true)
    setLoi(null)
    setDaLuu(false)
    try {
      const res = await fetch("/api/v1/vision/engine", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bo_may: chon }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
        throw new Error(data?.error?.message ?? `Không lưu được (${res.status})`)
      }
      const data = (await res.json()) as { dang_dung: string }
      setDangDung(data.dang_dung)
      setDaLuu(true)
      setHienXacNhan(false)
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không lưu được")
    } finally {
      setDangLuu(false)
    }
  }

  const doiDuoc = can("H4")
  const boChonMoTa = danhSach?.find((b) => b.key === chon)
  const boHienTaiMoTa = danhSach?.find((b) => b.key === dangDung)

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-shrink-0 border-b border-border bg-surface px-[18px] py-4">
        <PageHeader title="Bộ máy phân tích ảnh" backHref="/" backLabel="Trang chủ" />
      </div>

      <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto p-4">
        <div className="text-caption leading-relaxed text-text-muted">
          Cả ba bộ trả về cùng một cấu trúc kết quả, nên luồng duyệt và dữ liệu sản phẩm không đổi khi
          bạn chuyển. Thứ đổi là độ chính xác, chi phí mỗi lượt, và ảnh có rời khỏi hệ thống hay không.
        </div>

        {loi && (
          <div className="rounded-xl border border-warning/30 bg-warning-bg px-3.5 py-2.5 text-caption font-medium text-warning-text">
            {loi}
          </div>
        )}

        {danhSach === null && !loi && (
          <div className="py-4"><SkeletonBlock lines={3} /></div>
        )}

        {danhSach && (
          <div role="radiogroup" aria-label="Danh sách bộ máy phân tích ảnh" className="flex flex-col gap-3">
            {danhSach.map((bo) => {
              const dangChon = chon === bo.key
              const nhan = NHAN_TRANG_THAI[bo.trang_thai]
              return (
                <div
                  key={bo.key}
                  role="radio"
                  aria-checked={dangChon}
                  aria-disabled={!doiDuoc}
                  tabIndex={doiDuoc ? 0 : -1}
                  onClick={() => doiDuoc && setChon(bo.key)}
                  onKeyDown={(e) => {
                    if (doiDuoc && (e.key === " " || e.key === "Enter")) {
                      e.preventDefault()
                      setChon(bo.key)
                    }
                  }}
                  className={cn(
                    "flex flex-col gap-2.5 p-4 rounded-2xl border text-left transition-all duration-150 bg-surface",
                    dangChon
                      ? "border-primary ring-1 ring-primary/20 bg-primary/[0.02]"
                      : "border-border hover:border-border-subtle",
                    doiDuoc ? "cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" : "cursor-default opacity-85"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                        dangChon ? "border-primary bg-primary text-white" : "border-border"
                      )}
                    >
                      {dangChon && <Check size={13} strokeWidth={3} />}
                    </div>
                    <div className="flex-1 text-body-sm font-bold text-text">{bo.ten}</div>
                    {bo.key === dangDung && (
                      <span className="rounded-full bg-success-bg px-2.5 py-1 text-caption font-bold text-primary">
                        Đang dùng
                      </span>
                    )}
                  </div>

                  <div className="text-caption leading-relaxed text-text-muted">{bo.mo_ta}</div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={cn("rounded-full px-2 py-0.5 text-caption font-bold", nhan.lop)}>
                      {nhan.chu}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-surface-alt px-2 py-0.5 text-caption font-semibold text-text-muted">
                      {bo.gui_anh_ra_ngoai ? (
                        <>
                          <Cloud size={11} strokeWidth={2} /> Ảnh gửi ra nhà cung cấp
                        </>
                      ) : (
                        <>
                          <Server size={11} strokeWidth={2} /> Ảnh không rời hệ thống
                        </>
                      )}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {danhSach && (
          <div className="flex items-start gap-2 rounded-xl bg-warning-bg p-3.5">
            <AlertTriangle size={16} strokeWidth={1.8} className="mt-0.5 flex-shrink-0 text-warning-text" />
            <div className="text-caption leading-relaxed text-warning-text">
              Chỉ bộ &quot;Đầy đủ&quot; đã chạy trên ảnh thật. Hai bộ còn lại chưa được chấm điểm trên
              bộ ảnh chuẩn, nên chưa có căn cứ nói bộ nào đếm đúng hơn. Đổi bộ máy được ghi vào nhật ký
              kiểm toán để về sau đối chiếu được kết quả của từng giai đoạn.
            </div>
          </div>
        )}
      </div>

      {danhSach && (
        <div className="flex-shrink-0 border-t border-border bg-surface p-5">
          {doiDuoc ? (
            <>
              <Button
                variant="primary"
                className="h-[50px] w-full"
                disabled={dangLuu || !chon || chon === dangDung}
                onClick={() => setHienXacNhan(true)}
              >
                {chon === dangDung ? "Đang dùng bộ này" : "Chuyển sang bộ đã chọn"}
              </Button>
              {daLuu && (
                <div className="mt-2 text-center text-caption text-text-muted">
                  Đã lưu. Lượt phân tích đang chạy dở vẫn dùng bộ cũ.
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl bg-surface-alt px-3.5 py-3 text-center text-caption text-text-muted">
              Chỉ Điều hành mới đổi được bộ máy phân tích.
            </div>
          )}
        </div>
      )}

      {/* Dialog xác nhận đổi bộ máy theo 03a §22 */}
      <Dialog
        open={hienXacNhan}
        onOpenChange={setHienXacNhan}
        title="Xác nhận đổi bộ máy phân tích ảnh"
        description="Hành động tác động lớn đến toàn bộ quy trình nhận diện sản phẩm của tổ chức."
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={dangLuu}
              onClick={() => setHienXacNhan(false)}
            >
              Hủy
            </Button>
            <Button
              variant="warning"
              size="sm"
              disabled={dangLuu}
              onClick={luu}
            >
              {dangLuu ? "Đang lưu…" : "Xác nhận chuyển đổi"}
            </Button>
          </>
        }
      >
        <div className="space-y-3.5 text-caption text-text">
          <div className="p-3 rounded-xl bg-surface-alt border border-border flex flex-col gap-1.5">
            <div className="flex justify-between">
              <span className="text-text-muted">Bộ máy hiện tại:</span>
              <span className="font-bold">{boHienTaiMoTa?.ten || dangDung}</span>
            </div>
            <div className="flex justify-between text-primary">
              <span className="text-text-muted">Chuyển sang:</span>
              <span className="font-extrabold">{boChonMoTa?.ten || chon}</span>
            </div>
          </div>

          <div className="rounded-xl border border-warning/30 bg-warning-bg p-3 flex flex-col gap-1.5 text-warning-text">
            <div className="font-bold flex items-center gap-1.5">
              <AlertTriangle size={14} /> Lưu ý trước khi đổi:
            </div>
            <ul className="list-disc pl-4 space-y-1 text-caption leading-relaxed">
              <li>Lượt nhận diện ảnh đang chạy dở vẫn tiếp tục dùng bộ máy cũ.</li>
              <li>Bộ máy mới sẽ áp dụng ngay cho tất cả lượt tải ảnh tiếp theo của toàn tổ chức.</li>
              <li>Quyền riêng tư dữ liệu: {boChonMoTa?.gui_anh_ra_ngoai ? "Ảnh sẽ gửi ra nhà cung cấp AI bên ngoài." : "Ảnh xử lý nội bộ, không rời khỏi hệ thống."}</li>
              <li>Hành động này sẽ được ghi nhận vào nhật ký kiểm toán hệ thống (Audit Log).</li>
            </ul>
          </div>
        </div>
      </Dialog>
    </div>
  )
}

