"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import type { Route } from "next"

import { CalendarHeart } from "@/components/ui/icon-set/calendar-heart"
import { Clock } from "@/components/ui/icon-set/clock"
import { MapPin } from "@/components/ui/icon-set/map-pin"
import { Phone } from "@/components/ui/icon-set/phone"
import { Truck } from "@/components/ui/icon-set/truck"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { FeatureGuidanceCard } from "@/components/ui/feature-guidance-card"
import { InlineError } from "@/components/ui/inline-error"
import { PageHeader } from "@/components/ui/page-header"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { UserMenu } from "@/components/layout/user-menu"
import { uploadCoordinatorPhoto } from "@/components/coordinator/coordinator-api"
import { formatDateTime } from "@/lib/i18n/formatters"
import { useSession } from "@/lib/session"

import { NotSignedIn, addressLine, getJson, postJson } from "./role-work-api"

interface Run {
  orderId: string
  code: string
  recipientName: string
  recipientPhone: string
  deliveryAddress: unknown
  deliveryTimeSlot: string | null
  deliveryTargetAt: string | null
  cardMessage: string | null
  deliveryState: "PICKED_UP" | "ON_THE_WAY" | null
}

const NEXT: Record<string, { event: "PICKED_UP" | "ON_THE_WAY" | "DELIVERED_SUCCESS"; label: string }> = {
  NONE: { event: "PICKED_UP", label: "Đã lấy hàng" },
  PICKED_UP: { event: "ON_THE_WAY", label: "Bắt đầu giao" },
  ON_THE_WAY: { event: "DELIVERED_SUCCESS", label: "Chụp ảnh và báo giao xong" },
}

async function fetchRuns(): Promise<{ phoneMissing: boolean; runs: Run[] }> {
  return (await getJson<{ phoneMissing: boolean; runs: Run[] }>("/api/v1/delivery/my-runs")) ?? { phoneMissing: false, runs: [] }
}

/** Trang chủ Shipper — "Đơn cần giao" (checklist ALG 4.5): chỉ người nhận, địa chỉ, giờ giao, lời thiệp. */
export function ShipperRunsHome() {
  const router = useRouter()
  const { orgName, userInitials, roleUx } = useSession()
  const [data, setData] = useState<{ phoneMissing: boolean; runs: Run[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [failing, setFailing] = useState<{ id: string; reason: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const photoFor = useRef<string | null>(null)

  const fail = useCallback((e: unknown) => {
    if (e instanceof NotSignedIn) return router.push("/dang-nhap" as Route)
    setError(e instanceof Error ? e.message : "Không tải được đơn cần giao")
  }, [router])

  const load = useCallback(async () => {
    try {
      setData(await fetchRuns())
      setError(null)
    } catch (e) {
      fail(e)
    }
  }, [fail])

  useEffect(() => {
    fetchRuns().then((d) => setData(d)).catch(fail)
  }, [fail])

  const send = async (orderId: string, body: Record<string, unknown>) => {
    setBusyId(orderId)
    setError(null)
    try {
      await postJson(`/api/v1/delivery/my-runs/${orderId}`, body)
      setFailing(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không cập nhật được đơn giao")
    } finally {
      setBusyId(null)
    }
  }

  const onPhoto = async (file: File | undefined) => {
    const orderId = photoFor.current
    if (!file || !orderId) return
    setBusyId(orderId)
    try {
      const { assetId } = await uploadCoordinatorPhoto(file)
      await send(orderId, { event: "DELIVERED_SUCCESS", podAssetId: assetId })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được ảnh giao hàng")
      setBusyId(null)
    }
  }

  const advance = (run: Run) => {
    const next = NEXT[run.deliveryState ?? "NONE"]!
    if (next.event !== "DELIVERED_SUCCESS") return void send(run.orderId, { event: next.event })
    photoFor.current = run.orderId
    fileRef.current?.click()
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader
        className="flex-shrink-0 border-b border-border bg-surface px-4 py-4"
        breadcrumbs={roleUx?.label ?? "Shipper"}
        title={orgName}
        actions=<UserMenu initials={userInitials} />
      />
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        <FeatureGuidanceCard
          id="shipper_runs_guidance"
          badgeLabel="ĐƠN CẦN GIAO"
          title="Giao đúng người, đúng giờ, có ảnh giao"
          description="Đơn Điều phối giao cho bạn hiện ở đây. Báo lấy hàng, bắt đầu giao, rồi chụp ảnh khi trao hàng cho người nhận."
          tips={["Gọi người nhận trước khi tới", "Ảnh giao hàng là bằng chứng bắt buộc", "Giao không được thì ghi rõ lý do"]}
        />
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => void onPhoto(e.target.files?.[0])} />
        {error && <InlineError message={error} onRetry={() => void load()} />}
        {data === null && !error && <SkeletonBlock lines={4} label="Đang tải đơn cần giao" />}
        {data?.phoneMissing && (
          <EmptyState title="Tài khoản chưa có số điện thoại" reason="Nhờ Điều hành cập nhật số điện thoại của bạn để nhận đơn giao." icon={Phone} />
        )}
        {data && !data.phoneMissing && data.runs.length === 0 && (
          <EmptyState title="Chưa có đơn cần giao" reason="Khi Điều phối giao đơn cho bạn, đơn sẽ hiện ở đây." icon={Truck} />
        )}
        {data?.runs.map((run) => (
          <Card key={run.orderId} className="flex flex-col gap-2 p-4 text-body-sm text-text">
            <p className="text-title-sm font-bold">Đơn {run.code} · {run.recipientName}</p>
            <a href={`tel:${run.recipientPhone}`} className="flex items-center gap-1 text-primary"><Phone size={14} />{run.recipientPhone}</a>
            <p className="flex items-start gap-1"><MapPin size={14} className="mt-0.5 flex-shrink-0" />{addressLine(run.deliveryAddress)}</p>
            <p className="flex items-center gap-1 text-text-muted">
              <Clock size={14} />{run.deliveryTimeSlot ?? (run.deliveryTargetAt ? formatDateTime(run.deliveryTargetAt) : "Chưa hẹn giờ")}
            </p>
            {run.cardMessage && <p className="flex items-start gap-1 rounded-lg bg-surface-alt p-2"><CalendarHeart size={14} className="mt-0.5" />{run.cardMessage}</p>}
            {failing?.id === run.orderId && (
              <Textarea value={failing.reason} onChange={(e) => setFailing({ id: run.orderId, reason: e.target.value })} placeholder="Lý do giao không được" aria-label="Lý do giao không được" />
            )}
            <div className="flex flex-wrap justify-end gap-2">
              {failing?.id === run.orderId ? (
                <Button variant="danger" disabled={busyId === run.orderId || !failing.reason.trim()} onClick={() => void send(run.orderId, { event: "DELIVERY_FAILED", failureReason: failing.reason })}>
                  Gửi lý do
                </Button>
              ) : (
                <Button variant="outline" disabled={busyId === run.orderId} onClick={() => setFailing({ id: run.orderId, reason: "" })}>
                  Giao không được
                </Button>
              )}
              <Button disabled={busyId === run.orderId} onClick={() => advance(run)}>{NEXT[run.deliveryState ?? "NONE"]!.label}</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
