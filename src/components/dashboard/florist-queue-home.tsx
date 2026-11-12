"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { Route } from "next"

import { CalendarHeart } from "@/components/ui/icon-set/calendar-heart"
import { Clock } from "@/components/ui/icon-set/clock"
import { Flower2 } from "@/components/ui/icon-set/flower2"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { FeatureGuidanceCard } from "@/components/ui/feature-guidance-card"
import { InlineError } from "@/components/ui/inline-error"
import { PageHeader } from "@/components/ui/page-header"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { UserMenu } from "@/components/layout/user-menu"
import { useSession } from "@/lib/session"
import { getIndustryTerminology } from "@/modules/organization/domain/industry-profile"

import { NotSignedIn, getJson, postJson } from "./role-work-api"

interface Work {
  orderId: string
  code: string
  productionStatus: "ASSIGNED" | "ARRANGING" | "QUALITY_CHECK"
  deliveryWindow: { date: string; timeSlot?: string } | null
  cardMessage: string | null
  items: { description: string | null; quantity: number; variantName: string | null; stemCount: number | null; sampleImageUrl: string | null; recipe: { flowerName: string; quantity: number; unit: string | null; color: string | null; role: string | null }[] }[]
}

const STATUS_TEXT: Record<Work["productionStatus"], string> = {
  ASSIGNED: "Chờ nhận việc",
  ARRANGING: "Đang cắm",
  QUALITY_CHECK: "Đang kiểm tra",
}

async function fetchWorks(): Promise<Work[]> {
  return (await getJson<{ data: Work[] }>("/api/v1/orders/my-work"))?.data ?? []
}

/** Trang chủ Thợ chế tác — "Việc của tôi" (checklist ALG 4.13): đơn giao cho mình, sắp theo giờ giao. */
export function FloristQueueHome() {
  const router = useRouter()
  const { orgName, userInitials, roleUx, organization } = useSession()
  const terms = getIndustryTerminology(organization?.industry)
  const [works, setWorks] = useState<Work[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const fail = useCallback((e: unknown) => {
    if (e instanceof NotSignedIn) return router.push("/dang-nhap" as Route)
    setError(e instanceof Error ? e.message : "Không tải được việc của bạn")
  }, [router])

  const load = useCallback(async () => {
    try {
      setWorks(await fetchWorks())
      setError(null)
    } catch (e) {
      fail(e)
    }
  }, [fail])

  useEffect(() => {
    fetchWorks().then((d) => setWorks(d)).catch(fail)
  }, [fail])

  const act = async (work: Work) => {
    setBusyId(work.orderId)
    setError(null)
    try {
      await postJson(`/api/v1/orders/${work.orderId}/my-work`, { action: work.productionStatus === "ASSIGNED" ? "START" : "FINISH" })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không cập nhật được việc")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader
        className="flex-shrink-0 border-b border-border bg-surface px-4 py-4"
        breadcrumbs={roleUx?.label ?? terms.makerTitle}
        title={orgName}
        actions=<UserMenu initials={userInitials} />
      />
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        <FeatureGuidanceCard
          id="florist_queue_guidance"
          badgeLabel="VIỆC CỦA TÔI"
          title="Làm đúng công thức, đúng giờ giao"
          description={`Đơn được giao cho bạn hiện ở đây theo thứ tự giờ giao. Nhận việc khi bắt đầu ${terms.makerAction.toLowerCase()}, báo xong khi ${terms.sampleProduct.toLowerCase()} sẵn sàng giao.`}
          tips={["Xem công thức và ảnh mẫu trước khi bắt đầu", "Đơn giao sớm nhất nằm trên cùng", "Báo xong để Điều phối gọi shipper"]}
        />
        {error && <InlineError message={error} onRetry={() => void load()} />}
        {works === null && !error && <SkeletonBlock lines={4} label="Đang tải việc của bạn" />}
        {works?.length === 0 && (
          <EmptyState title="Chưa có việc nào" reason="Khi Điều phối giao đơn cho bạn, việc sẽ hiện ở đây." icon={Flower2} />
        )}
        {works?.map((work) => (
          <Card key={work.orderId} className="flex flex-col gap-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-title-sm font-bold text-text">Đơn {work.code}</p>
                <p className="flex items-center gap-1 text-caption text-text-muted">
                  <Clock size={14} />
                  {work.deliveryWindow ? `Giao ${work.deliveryWindow.timeSlot ?? ""} ngày ${work.deliveryWindow.date}` : "Chưa hẹn giờ giao"}
                </p>
              </div>
              <span className="rounded-full bg-surface-alt px-2 py-0.5 text-caption text-text-muted">{STATUS_TEXT[work.productionStatus]}</span>
            </div>
            {work.items.map((item, i) => (
              <div key={i} className="flex gap-3">
                {item.sampleImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.sampleImageUrl} alt={`Ảnh mẫu ${item.description ?? ""}`} className="h-20 w-20 rounded-lg object-cover" />
                )}
                <div className="text-body-sm text-text">
                  <p className="font-semibold">{item.description ?? "Mẫu theo yêu cầu"} × {item.quantity}</p>
                  {item.variantName && <p className="text-primary">Phiên bản {item.variantName}{item.stemCount ? `: ${item.stemCount} cành` : ""}</p>}
                  <ul className="text-text-muted">
                    {item.recipe.map((r, j) => (
                      <li key={j}>{r.flowerName}{r.color ? ` (${r.color})` : ""}: {r.quantity} {r.unit ?? ""}{r.role ? ` · ${r.role}` : ""}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
            {work.cardMessage && (
              <p className="flex items-start gap-2 rounded-lg bg-surface-alt p-2 text-body-sm text-text">
                <CalendarHeart size={16} className="mt-0.5 flex-shrink-0" />
                Lời thiệp: {work.cardMessage}
              </p>
            )}
            <Button onClick={() => void act(work)} disabled={busyId === work.orderId} className="self-end">
              {work.productionStatus === "ASSIGNED" ? "Nhận việc" : "Báo xong"}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
