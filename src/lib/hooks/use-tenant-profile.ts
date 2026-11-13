"use client"

import { useState, useEffect, useCallback } from "react"
import type { BusinessProfileDetail } from "@/modules/profiles/use-cases/get-business-profile"
import type { BrandProfileDetail } from "@/modules/profiles/use-cases/get-brand-profile"
import type { UpsertBusinessProfileInput } from "@/modules/profiles/infra/business-profile-repository"
import type { UpsertBrandProfileInput } from "@/modules/profiles/infra/brand-profile-repository"
import { errorText } from "@/lib/error-text"

export interface TenantProfileState {
  business: BusinessProfileDetail | null
  brand: BrandProfileDetail | null
  loading: boolean
  saving: boolean
  error: string | null
  successMessage: string | null
  reload: () => Promise<void>
  saveBusiness: (data: UpsertBusinessProfileInput) => Promise<boolean>
  saveBrand: (data: UpsertBrandProfileInput) => Promise<boolean>
}

export function useTenantProfile(): TenantProfileState {
  const [business, setBusiness] = useState<BusinessProfileDetail | null>(null)
  const [brand, setBrand] = useState<BrandProfileDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [resBiz, resBrand] = await Promise.all([
        fetch("/api/v1/business-profile"),
        fetch("/api/v1/brand-profile"),
      ])

      if (!resBiz.ok) {
        throw new Error(`Không tải được hồ sơ kinh doanh (${resBiz.status})`)
      }
      if (!resBrand.ok) {
        throw new Error(`Không tải được hồ sơ thương hiệu (${resBrand.status})`)
      }

      const bizData = await resBiz.json()
      const brandData = await resBrand.json()

      setBusiness(bizData)
      setBrand(brandData)
    } catch (err: unknown) {
      setError(errorText(err) || "Lỗi tải thông tin hồ sơ")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu từ API khi mount/đổi tham số; setState nằm trong hàm tải (nợ #149)
    reload()
  }, [reload])

  const saveBusiness = async (data: UpsertBusinessProfileInput): Promise<boolean> => {
    setSaving(true)
    setError(null)
    setSuccessMessage(null)
    try {
      const res = await fetch("/api/v1/business-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.message || `Cập nhật hồ sơ kinh doanh thất bại (${res.status})`)
      }

      const updated = await res.json()
      setBusiness(updated)
      setSuccessMessage("Đã lưu thông tin hồ sơ kinh doanh thành công!")
      return true
    } catch (err: unknown) {
      setError(errorText(err) || "Lỗi khi lưu hồ sơ kinh doanh")
      return false
    } finally {
      setSaving(false)
    }
  }

  const saveBrand = async (data: UpsertBrandProfileInput): Promise<boolean> => {
    setSaving(true)
    setError(null)
    setSuccessMessage(null)
    try {
      const res = await fetch("/api/v1/brand-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.message || `Cập nhật hồ sơ thương hiệu thất bại (${res.status})`)
      }

      const updated = await res.json()
      setBrand(updated)
      setSuccessMessage("Đã lưu nhận diện thương hiệu thành công!")
      return true
    } catch (err: unknown) {
      setError(errorText(err) || "Lỗi khi lưu nhận diện thương hiệu")
      return false
    } finally {
      setSaving(false)
    }
  }

  return {
    business,
    brand,
    loading,
    saving,
    error,
    successMessage,
    reload,
    saveBusiness,
    saveBrand,
  }
}
