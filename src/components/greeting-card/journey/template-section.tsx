"use client"

import { useState } from "react"
import { InlineError } from "@/components/ui/inline-error"
import { DisplaySettingsDialog, useDisplaySettings } from "./display-settings-dialog"
import { useAnnounce } from "@/components/ui/live-region"
import { TemplateSelectorSplitPane } from "@/components/greeting-card/customer/templates/template-selector-split-pane"
import { cn } from "@/lib/utils"
import { useJourneyFocus } from "./journey-focus-context"
import { useSession } from "@/lib/session"
import {
  GREETING_TEMPLATES,
  resolveGreetingTemplateId,
  type GreetingTemplateId,
} from "@/modules/greeting-card/domain/greeting-template-registry"
import type { CatalogOption } from "./use-journey-catalogs"

/** Giao diện khách xem đang lưu cho bộ sưu tập (mặc định khi chưa chọn). */
export function catalogTemplateId(catalog: CatalogOption | undefined): GreetingTemplateId {
  const raw = catalog?.filters?.templateId
  return resolveGreetingTemplateId(typeof raw === "string" ? raw : null)
}

/** Khoá dựng khung xem trước: số mẫu đổi → tải lại để ảnh thật vừa thêm hiện ngay (không kẹt ảnh mẫu). */
export function previewPaneKey(catalog: Pick<CatalogOption, "id" | "itemCount">): string {
  return `${catalog.id}:${catalog.itemCount}`
}

export function templateName(id: GreetingTemplateId): string {
  return GREETING_TEMPLATES[id]?.name ?? id
}

interface TemplateSectionProps {
  catalog: CatalogOption
  onSave: (catalog: CatalogOption, templateId: GreetingTemplateId) => Promise<void>
  /** Cài đặt hiển thị dùng chung cả tiệm — chỉ L4 (Sale, Điều phối chỉnh giao diện bộ sưu tập của mình, không đổi cài đặt chung) */
  canEditSharedDisplay?: boolean | undefined
}

/** Bước 1b: chọn giao diện khách sẽ lướt xem — lưu ngay khi bấm "Chọn mẫu". */
export function TemplateSection({ catalog, onSave, canEditSharedDisplay = true }: TemplateSectionProps) {
  const { organization } = useSession()
  const [pendingId, setPendingId] = useState<GreetingTemplateId | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { announce } = useAnnounce()
  const savedId = catalogTemplateId(catalog)
  const display = useDisplaySettings()
  const [settingsFor, setSettingsFor] = useState<GreetingTemplateId | null>(null)

  async function handleSelect(id: GreetingTemplateId) {
    if (id === savedId || pendingId) return
    setPendingId(id)
    setError(null)
    try {
      await onSave(catalog, id)
      announce(`Đã chọn giao diện ${templateName(id)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được giao diện.")
    } finally {
      setPendingId(null)
    }
  }

  const { activeBlock, setActiveBlock } = useJourneyFocus()
  const isBlock2Active = activeBlock === 2

  return (
    <section
      aria-label="Giao diện khách xem"
      onClick={() => setActiveBlock(2)}
      className={cn(
        "flex flex-col gap-3 rounded-2xl p-4 sm:p-5 border transition-all duration-300 cursor-pointer",
        isBlock2Active
          ? "border-primary/50 bg-surface shadow-sm ring-2 ring-primary/20 opacity-100"
          : "border-border/60 bg-transparent hover:bg-surface/60"
      )}
    >
      <TemplateSelectorSplitPane
        key={previewPaneKey(catalog)}
        selectedTemplateId={pendingId ?? savedId}
        onSelectTemplate={(id) => {
          setActiveBlock(2)
          void handleSelect(id)
        }}
        catalogId={catalog.id}
        displaySettings={display.settings}
        onOpenDisplaySettings={canEditSharedDisplay ? setSettingsFor : undefined}
        industryKey={organization?.industry}
      />
      {error && <InlineError message={error} />}
      {settingsFor && (
        <DisplaySettingsDialog
          key={settingsFor}
          open
          onOpenChange={(o) => !o && setSettingsFor(null)}
          templateId={settingsFor}
          settings={display.settings}
          shop={display.shop}
          onSave={display.save}
        />
      )}
    </section>
  )
}
