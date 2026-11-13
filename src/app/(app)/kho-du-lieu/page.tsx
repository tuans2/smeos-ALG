"use client"

import Link from "next/link"
import { AccountStorageHub } from "@/components/storage/account-storage-hub"
import { Button } from "@/components/ui/button"
import { Camera } from "@/components/ui/icon-set/camera"
import { ListLayout } from "@/components/layout/page-layout"
import { PageHeader } from "@/components/ui/page-header"
import { useI18n } from "@/lib/i18n"

export default function KhoDuLieuPage() {
  const { dict } = useI18n()
  return (
    <ListLayout
      header={
        <PageHeader
          title={dict.storage.header.title}
          tip={dict.storage.header.description}
          actions={
            <Link href="/tai-anh">
              <Button size="sm" className="flex items-center gap-2 font-bold shadow-xs">
                <Camera size={16} strokeWidth={2} />
                {dict.storage.header.uploadButton}
              </Button>
            </Link>
          }
        />
      }
    >
      <AccountStorageHub initialTab="approved" />
    </ListLayout>
  )
}
