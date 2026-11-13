"use client"

import { useCallback, useEffect, useState } from "react"
import type { ChainPartnershipEntity } from "@/modules/chain-partnership/domain/partnership-entities"

async function fetchChainPartners(): Promise<ChainPartnershipEntity[] | null> {
  try {
    const res = await fetch("/api/v1/coordinator/chain-partners")
    const json = await res.json()
    return res.ok && Array.isArray(json.data) ? (json.data as ChainPartnershipEntity[]) : null
  } catch {
    return null // lỗi mạng: giữ danh sách cũ
  }
}

/** Danh sách cửa hàng đối tác của chuỗi — tải khi mở trang, gọi `refresh()` sau khi thêm/liên kết. */
export function useChainPartners() {
  const [partners, setPartners] = useState<ChainPartnershipEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let alive = true
    fetchChainPartners().then((list) => {
      if (!alive) return
      if (list) setPartners(list)
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [version])

  const refresh = useCallback(() => {
    setLoading(true)
    setVersion((v) => v + 1)
  }, [])

  return { partners, setPartners, loading, refresh }
}
