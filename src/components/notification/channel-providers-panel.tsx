"use client"

import { useApi } from "@/components/greeting-card/greeting-api"
import { InfoTip } from "@/components/ui/info-tip"
import { InlineError } from "@/components/ui/inline-error"
import { Skeleton } from "@/components/ui/skeleton"
import { ChannelProviderCard } from "./channel-provider-card"
import { PROVIDERS_URL, type ChannelProvidersView } from "./channel-providers-api"

/**
 * Khối "Kênh liên lạc" ở `/van-hanh/thong-bao` (checklist 4.30): đăng ký nhà cung cấp SMS / Zalo / Web Push một
 * lần cho cả hệ thống, rồi bật/tắt. Chỉ người vận hành có quyền cấu hình thông báo mới thấy dữ liệu (API trả 403).
 */
export function ChannelProvidersPanel() {
  const { data, error, isLoading, mutate } = useApi<{ data: ChannelProvidersView }>(PROVIDERS_URL)
  const view = data?.data

  return (
    <section aria-labelledby="channel-providers-heading" className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h2 id="channel-providers-heading" className="text-title font-semibold text-text">
          Kênh liên lạc
        </h2>
        <InfoTip label="Kênh liên lạc">
          Nhập thông số nhà cung cấp một lần cho cả hệ thống. Sau đó chỉ cần bật hoặc tắt; từng chuỗi, cửa hàng chọn sự kiện nào gửi qua kênh nào ở bảng bên dưới.
        </InfoTip>
      </div>
      {isLoading && !view ? (
        <div role="status" className="flex flex-col gap-4">
          <span className="sr-only">Đang tải kênh liên lạc</span>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <InlineError message={error.message || "Không tải được kênh liên lạc"} onRetry={() => void mutate()} />
      ) : view ? (
        <div className="flex flex-col gap-4">
          {view.channels.map((state) => (
            <ChannelProviderCard
              key={state.channel}
              state={state}
              definition={view.catalog.find((d) => d.channel === state.channel)}
              onChanged={() => mutate()}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}
