"use client"

import useSWR from "swr"
import { addressDataUrl, type AddressSystem, type AddressUnitsData } from "@/modules/greeting-card/domain/vn-address-units"

async function load(system: AddressSystem): Promise<AddressUnitsData> {
  const res = await fetch(addressDataUrl(system))
  if (!res.ok) throw new Error("Không tải được danh sách địa chỉ")
  const json = (await res.json()) as { provinces: unknown }
  return { system, provinces: json.provinces } as AddressUnitsData
}

/** Danh sách tỉnh/quận/phường của một hệ địa chỉ — tải một lần, dữ liệu tĩnh không đổi. */
export function useVnAddressUnits(system: AddressSystem) {
  const res = useSWR(["vn-address-units", system], ([, s]) => load(s as AddressSystem), {
    revalidateOnFocus: false,
    revalidateIfStale: false,
  })
  return { data: res.data ?? null, loading: res.isLoading, error: res.error ? "Không tải được danh sách địa chỉ — bạn có thể tự nhập." : null }
}
