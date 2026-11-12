"use client"

import { Button } from "@/components/ui/button"
import React from "react"
import { useRouter } from "next/navigation"
import type { LucideIcon } from "@/components/ui/icon-set/wrap"
import { AlertTriangle } from "@/components/ui/icon-set/alert-triangle"
import { ChevronRight } from "@/components/ui/icon-set/chevron-right"
import { Clock } from "@/components/ui/icon-set/clock"
import { ShoppingBag } from "@/components/ui/icon-set/shopping-bag"
import { Card } from "@/components/ui/card"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { isHrefOpen } from "@/lib/feature-lock"

export type DraftOrder = {
  id: string
  code?: string
  order_number?: string
}

interface DongCanThiepProps {
  icon: LucideIcon
  nhan: string
  giaTri: string
  onClick: () => void
  nguyCap?: boolean
}

export function DongCanThiep({
  icon: Icon,
  nhan,
  giaTri,
  onClick,
  nguyCap,
}: DongCanThiepProps) {
  return (
    <Button variant="ghost"
      type="button"
      onClick={onClick}
      className="py-0 text-[length:inherit] font-[inherit] flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-1 text-left hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-primary cursor-pointer"
    >
      <span className="flex items-center gap-2.5">
        <Icon size={17} strokeWidth={1.9} className={nguyCap ? "text-danger" : "text-text-muted"} />
        <span className="text-body font-semibold text-text">{nhan}</span>
      </span>
      <span className="flex items-center gap-1 text-body-sm font-bold text-primary">
        {giaTri}
        <ChevronRight size={15} aria-hidden="true" />
      </span>
    </Button>
  )
}

interface StoreManagerActionItemsCardProps {
  daTai: boolean
  tongCanThiep: number
  loiJobsCount: number
  soChoDuyet: number | null
  soDonNhap: number | null
  draftOrders: DraftOrder[]
  onScrollToJobs: () => void
}

export function StoreManagerActionItemsCard({
  daTai,
  tongCanThiep,
  loiJobsCount,
  soChoDuyet,
  soDonNhap,
  draftOrders,
  onScrollToJobs,
}: StoreManagerActionItemsCardProps) {
  const router = useRouter()

  return (
    <Card className="flex flex-col gap-2 p-4">
      <h2 className="text-title-sm font-bold">
        {daTai && tongCanThiep === 0 ? "Không có việc cần can thiệp" : "Cần can thiệp"}
      </h2>
      {!daTai ? (
        <SkeletonBlock lines={3} />
      ) : (
        <>
          {loiJobsCount > 0 && (
            <DongCanThiep
              icon={AlertTriangle}
              nhan="Job lỗi"
              giaTri={`${loiJobsCount}`}
              nguyCap
              onClick={onScrollToJobs}
            />
          )}
          {soChoDuyet !== null && soChoDuyet > 0 && isHrefOpen("/duyet") && (
            <DongCanThiep
              icon={Clock}
              nhan="Kết quả chờ duyệt"
              giaTri={`${soChoDuyet}`}
              onClick={() => router.push("/duyet" as never)}
            />
          )}
          {soDonNhap !== null && soDonNhap > 0 && (
            <div className="space-y-1.5">
              <DongCanThiep
                icon={ShoppingBag}
                nhan="Đơn nháp chưa chốt"
                giaTri={`${soDonNhap}`}
                onClick={() => router.push("/don-hang" as never)}
              />
              {draftOrders.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pl-7 pb-1">
                  {draftOrders.slice(0, 3).map((d) => (
                    <span
                      key={d.id}
                      className="rounded-md bg-surface-alt px-2 py-0.5 text-caption font-semibold text-text-muted"
                    >
                      #{d.order_number ?? d.code ?? d.id.slice(0, 8)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          {tongCanThiep === 0 && (
            <p className="text-body-sm text-text-muted">
              Job, hàng chờ duyệt và đơn nháp đều đã được xử lý.
            </p>
          )}
        </>
      )}
    </Card>
  )
}
