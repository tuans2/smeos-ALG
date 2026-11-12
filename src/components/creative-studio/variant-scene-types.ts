import type { VariantDirection } from "@/modules/media/domain/variant-direction-rules"
import type { VariantRenderOptions } from "@/modules/media/domain/variant-candidates"
import type { PublishRatio } from "@/modules/creative-production/domain/publishing-rules"
import type { M04bIntegrity } from "./types"

export type { VariantDirection }

export type SceneMeta = {
  assetId: string
  jobId: string
  integrity: number | null
  engine: "local_studio" | "cloud_provider"
  cloudFallback: boolean
  cloudFallbackReason?: string | null
  approved?: boolean
  transparentUrl?: string | null
  planRevision?: number | null
  ratio?: string | null
  direction?: VariantDirection | null
  aestheticScore?: number | null
  aiRelit?: boolean
  integrityResult?: string | null
  integrityDetail?: string | null
}

export type SceneCandidate = SceneMeta & { url: string }

export type VariantJobPoll = {
  status: string
  result: string | null
  error: string | null
  source: {
    engine: "local_studio" | "cloud_provider"
    cloud_fallback: boolean
    cloud_fallback_reason?: string | null
    direction?: Record<string, unknown> | null
  }
  subject_integrity: M04bIntegrity | null
  quality_report?: { aesthetic: { score: number } | null; ai_relit?: boolean; flow?: string } | null
  variants: Array<{ asset_id: string; variant_key: string; url: string }>
}

export type NarrativeScene = {
  sceneIndex: number
  beat: string
  beatColor: string
  title: string
  setting: string
  lighting: string
  palette: readonly string[]
  purpose: string
  imageUrl: string
  transparentUrl: string | null
  isOriginal: boolean
  tag: string
  ratio: string
  integrityText: string
  hasGenerated: boolean
  usesCloud: boolean
  approved: boolean
  error: string | null
  fallbackReason: string | null
}

export const MAX_CANDIDATES_SHOWN = 8

export const BEAT_COLORS: Record<string, string> = {
  SETUP: "bg-primary/10 text-primary border-primary/20",
  RISING: "bg-primary/15 text-primary border-primary/30",
  CLIMAX: "bg-danger/10 text-danger border-danger/20",
  RESOLUTION: "bg-success/10 text-success border-success/20",
  CTA: "bg-warning/10 text-warning-text border-warning/20",
}

export function metaOf(c: SceneCandidate): SceneMeta {
  const { url, ...meta } = c
  void url
  return meta
}

export function formatIntegrity(value: number | null, hasGenerated: boolean, detail?: string | null): string {
  if (!hasGenerated) return "Chưa sinh — chưa đo"
  if (detail) return detail
  if (value === null) return "Chưa có số đo"
  const pct = (value * 100).toFixed(2)
  if (value >= 0.999) return `Lõi trùng khít ${pct}% (SAFE)`
  if (value >= 0.99) return `Lõi trùng khít ${pct}% (WARNING)`
  return `Lõi trùng khít ${pct}% (REJECTED)`
}

export type ResultBoardProps = {
  narrativeResultScenes: NarrativeScene[]
  sceneCandidates: Record<number, SceneCandidate[]>
  sceneMeta: Record<number, SceneMeta>
  selectedSceneIndex: number
  setSelectedSceneIndex: (i: number) => void
  sceneCount: number
  generatedSceneCount: number
  sceneCreditTotal: number
  cloudAvailable: boolean
  sceneEngine: "cloud_provider" | "local_studio"
  setSceneEngine: (e: "cloud_provider" | "local_studio") => void
  renderOpts: VariantRenderOptions
  setRenderOpts: React.Dispatch<React.SetStateAction<VariantRenderOptions>>
  sceneProvider: string
  setSceneProvider: (v: string) => void
  watermarkEnabled: boolean
  variantRatio: PublishRatio
  setVariantRatio: (r: PublishRatio) => void
  planRatios: PublishRatio[]
  ratioCounts: Record<string, number>
  viewRatio: string
  judgmentB: string | null
  variantIntegrity: { subject_pixel_identity: number; ly_do: string[] } | null
  minSceneIntegrity: number | null
  generatingAllScenes: boolean
  generatingSceneIndex: number | null
  approvingSceneIndex: number | null
  canApproveVariantCap: boolean
  handleGenerateAllScenes: () => Promise<void>
  handleGenerateAllRatios: () => Promise<void>
  handleGenerateSingleScene: (idx: number, ratio?: string, opts?: { direction?: VariantDirection; count?: number }) => Promise<void>
  handleApproveScene: (idx: number) => Promise<void>
  handleSelectCandidate: (idx: number, c: SceneCandidate) => void
  setPhase: (p: "select" | "config-b" | "running-b" | "result-b" | "saved" | "error") => void
  navigateToArea: (a: "a" | "b" | "c" | "d" | "e" | "f") => void
  planScenes: readonly { sceneIndex: number; beat: string }[]
}
