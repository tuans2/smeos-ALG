"use client"

// Danh sách mọi tổ chức (`N1`, P25a). Xem đặc tả 06 mục 21.

import { CreateOrganizationCard } from "@/components/platform/create-organization-card"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { useI18n } from "@/lib/i18n"
import { formatDate } from "@/lib/i18n/formatters"
import { PageHeader } from "@/components/ui/page-header"

type PlatformOrganizationSummary = {
  id: string
  name: string
  slug: string
  type: string
  creditBalance: number
  createdAt: string
  memberCount: number
}

async function layJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url)
  if (!res.ok) return null
  return (await res.json()) as T
}

export default function DanhSachToChucPage() {
  const { t, dict } = useI18n()
  const [orgs, setOrgs] = useState<PlatformOrganizationSummary[] | null>(null)
  const [loi, setLoi] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const res = await layJson<{ data: PlatformOrganizationSummary[] }>("/api/v1/platform/organizations")
      if (!res) {
        setLoi(dict.platform.organizations.loadError)
        return
      }
      setOrgs(res.data)
    })()
  }, [dict.platform.organizations.loadError])

  if (loi) return <p className="text-body-sm text-danger">{loi}</p>
  if (!orgs) return <div className="py-4"><SkeletonBlock lines={4} /></div>

  return (
    <Card className="overflow-x-auto p-4 rounded-2xl shadow-xs">
      <PageHeader
        className="mb-3 border-b border-border pb-2"
        title="Tổ chức"
        tip="Danh sách tất cả doanh nghiệp, chuỗi và cửa hàng đăng ký trên toàn nền tảng."
        actions={
          <span className="rounded bg-surface-alt px-2 py-0.5 text-caption text-text-muted">{dict.platform.organizations.scopeSystem}</span>
        }
      />
      <div className="mb-3"><CreateOrganizationCard onCreated={() => window.location.reload()} /></div>
      <table className="w-full text-left text-caption">
        <thead>
          <tr className="border-b border-border text-text-muted">
            <th className="py-2 pr-3">{dict.platform.organizations.table.org}</th>
            <th className="py-2 pr-3">{dict.platform.organizations.table.type}</th>
            <th className="py-2 pr-3">{dict.platform.organizations.table.members}</th>
            <th className="py-2 pr-3">{dict.platform.organizations.table.credit}</th>
            <th className="py-2 pr-3">{dict.platform.organizations.table.createdAt}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {orgs.map((org) => (
            <tr key={org.id} className="hover:bg-surface-alt">
              <td className="py-2 pr-3">
                <Link href={`/van-hanh/to-chuc/${org.id}` as never} className="font-medium text-primary">
                  {org.name}
                </Link>
                <span className="ml-1 text-text-muted">({org.slug})</span>
              </td>
              <td className="py-2 pr-3">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-caption font-medium bg-surface-alt text-text">
                  {org.type === "STORE" || org.type === "SINGLE" ? dict.platform.organizations.types.store :
                   org.type === "CHAIN" ? dict.platform.organizations.types.network :
                   org.type === "PLATFORM" ? dict.platform.organizations.types.platform :
                   org.type === "EXPERIENCE" ? dict.platform.organizations.types.experience : org.type}
                </span>
              </td>
              <td className="py-2 pr-3">{org.memberCount}</td>
              <td className="py-2 pr-3">{org.creditBalance}</td>
              <td className="py-2 pr-3">{formatDate(org.createdAt)}</td>
            </tr>
          ))}
          {orgs.length === 0 && (
            <tr>
              <td colSpan={5} className="py-4 text-center text-text-muted">
                {dict.platform.organizations.empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  )
}
