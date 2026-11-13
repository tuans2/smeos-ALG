"use client"

import useSWR from "swr"
import type { AvailabilityMode } from "@/modules/greeting-card/domain/product-availability-config"

export interface AvailabilityParams {
  productId: string
  industryKey?: string | null | undefined
  checkInDate?: string | undefined
  checkOutDate?: string | undefined
  deliveryDate?: string | undefined
  deliveryTimeSlot?: string | undefined
  variantId?: string | undefined
  quantity?: number | undefined
}

export interface AvailabilityResponse {
  available: boolean
  mode: AvailabilityMode
  unavailableDates?: string[] | undefined
  nextAvailableDate?: string | null | undefined
  fullSlots?: string[] | undefined
  remainingQuantity?: number | null | undefined
  message?: string | undefined
  errors?: Record<string, string> | undefined
}

async function fetchAvailability([url, body]: readonly [string, string]): Promise<AvailabilityResponse> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  })
  if (!res.ok) {
    // Nếu lỗi mạng/server — fallback an toàn cho phép tiếp tục thay vì block cứng
    return { available: true, mode: "STOCK_QUANTITY" }
  }
  return (await res.json()) as AvailabilityResponse
}

export function useProductAvailability(
  checkUrl: string | null | undefined,
  params: AvailabilityParams,
) {
  // Chỉ gọi khi có checkUrl và productId
  const shouldFetch = Boolean(checkUrl && params.productId)

  const body = JSON.stringify({
    productId: params.productId,
    ...(params.industryKey ? { industryKey: params.industryKey } : {}),
    ...(params.checkInDate ? { checkInDate: params.checkInDate } : {}),
    ...(params.checkOutDate ? { checkOutDate: params.checkOutDate } : {}),
    ...(params.deliveryDate ? { deliveryDate: params.deliveryDate } : {}),
    ...(params.deliveryTimeSlot ? { deliveryTimeSlot: params.deliveryTimeSlot } : {}),
    ...(params.variantId ? { variantId: params.variantId } : {}),
    ...(params.quantity ? { quantity: params.quantity } : {}),
  })

  const swr = useSWR(
    shouldFetch ? ([checkUrl!, body] as const) : null,
    fetchAvailability,
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
      dedupingInterval: 1000,
    },
  )

  return {
    available: swr.data?.available ?? null,
    mode: swr.data?.mode ?? null,
    unavailableDates: swr.data?.unavailableDates ?? [],
    nextAvailableDate: swr.data?.nextAvailableDate ?? null,
    fullSlots: swr.data?.fullSlots ?? [],
    remainingQuantity: swr.data?.remainingQuantity ?? null,
    message: swr.data?.message ?? null,
    errors: swr.data?.errors ?? {},
    loading: swr.isValidating || swr.isLoading,
  }
}
