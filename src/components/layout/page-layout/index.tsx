import * as React from "react"
import { PageHeader, type PageHeaderProps } from "@/components/ui/page-header"
import { DashboardLayout, type DashboardLayoutProps } from "./dashboard-layout"
import { ListLayout, type ListLayoutProps } from "./list-layout"
import { DetailLayout, type DetailLayoutProps } from "./detail-layout"
import { FormLayout, type FormLayoutProps } from "./form-layout"
import { BuilderLayout, type BuilderLayoutProps } from "./builder-layout"
import { SettingsLayout, type SettingsLayoutProps } from "./settings-layout"
import type { PageArchetype } from "./types"

export * from "./types"
export * from "./dashboard-layout"
export * from "./list-layout"
export * from "./detail-layout"
export * from "./form-layout"
export * from "./builder-layout"
export * from "./settings-layout"
export { PageHeader, type PageHeaderProps }

export type PageLayoutProps =
  | ({ archetype: "A" } & DashboardLayoutProps)
  | ({ archetype: "B" } & ListLayoutProps)
  | ({ archetype: "C" } & DetailLayoutProps)
  | ({ archetype: "D" } & FormLayoutProps)
  | ({ archetype: "E" } & BuilderLayoutProps)
  | ({ archetype: "F" } & SettingsLayoutProps)

/**
 * PageLayout — Bộ khung bố cục trang chuẩn mực 6 Archetypes (A–F)
 * Tuân thủ đặc tả UX-028 (docs/dac-ta/ux-patterns/page-archetypes.md).
 */
export function PageLayout(props: PageLayoutProps) {
  switch (props.archetype) {
    case "A":
      return <DashboardLayout {...props} />
    case "B":
      return <ListLayout {...props} />
    case "C":
      return <DetailLayout {...props} />
    case "D":
      return <FormLayout {...props} />
    case "E":
      return <BuilderLayout {...props} />
    case "F":
      return <SettingsLayout {...props} />
    default:
      return null
  }
}
