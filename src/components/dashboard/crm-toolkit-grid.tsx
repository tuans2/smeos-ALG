"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import type { Route } from "next"
import { Users } from "@/components/ui/icon-set/users"
import { MessageSquare } from "@/components/ui/icon-set/message-square"
import { ShoppingBag } from "@/components/ui/icon-set/shopping-bag"
import { Gift } from "@/components/ui/icon-set/gift"
import { Card } from "@/components/ui/card"
import { isHrefInPhase } from "@/lib/delivery/delivery-phase"

export function CrmToolkitGrid() {
  const router = useRouter()

  return (
    <Card className="flex flex-col gap-3 p-4">
      <h2 className="text-title-sm font-bold">Bộ công cụ quan hệ khách hàng</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Button variant="outline"
          type="button"
          onClick={() => router.push("/khach-hang" as Route)}
          className="text-[length:inherit] h-auto justify-start font-[inherit] flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface p-3 text-left hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-primary hover:bg-surface"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users size={20} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-body font-bold text-text">Hồ sơ khách hàng</div>
            <div className="text-caption text-text-muted">Quản lý danh bạ & phân tầng RFM</div>
          </div>
        </Button>

        {isHrefInPhase("/hoi-thoai") && (
          <Button variant="outline"
            type="button"
            onClick={() => router.push("/hoi-thoai" as Route)}
            className="text-[length:inherit] h-auto justify-start font-[inherit] flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface p-3 text-left hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-primary hover:bg-surface"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent-text">
              <MessageSquare size={20} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-body font-bold text-text">Hội thoại tư vấn</div>
              <div className="text-caption text-text-muted">Chat đa kênh & hỗ trợ thông minh</div>
            </div>
          </Button>
        )}

        <Button variant="outline"
          type="button"
          onClick={() => router.push("/don-hang" as Route)}
          className="text-[length:inherit] h-auto justify-start font-[inherit] flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface p-3 text-left hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-primary hover:bg-surface"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning-bg text-warning-text">
            <ShoppingBag size={20} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-body font-bold text-text">Lịch sử đơn hàng</div>
            <div className="text-caption text-text-muted">Theo dõi giá trị mua & vòng đời</div>
          </div>
        </Button>

        <Button variant="outline"
          type="button"
          onClick={() => router.push("/khach-hang" as Route)}
          className="text-[length:inherit] h-auto justify-start font-[inherit] flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface p-3 text-left hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-primary hover:bg-surface"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-bg text-success">
            <Gift size={20} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-body font-bold text-text">Dịp kỷ niệm & Voucher</div>
            <div className="text-caption text-text-muted">Tri ân & khuyến mãi thân thiết</div>
          </div>
        </Button>
      </div>
    </Card>
  )
}
