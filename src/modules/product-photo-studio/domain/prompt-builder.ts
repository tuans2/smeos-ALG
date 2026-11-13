import { BACKGROUND_PRESETS } from "./preset-catalog"

export interface PromptBuildParams {
  readonly presetId?: string | undefined
  readonly customNote?: string | undefined
  readonly retryHint?: string | undefined
  readonly failedCriteria?: readonly string[] | undefined
  readonly brandColor?: string | undefined
}

export function buildEnhancePrompt(params: PromptBuildParams): string {
  const directives: string[] = [
    "Professional commercial product studio photography.",
  ]

  const preset = BACKGROUND_PRESETS.find((p) => p.id === params.presetId) ?? BACKGROUND_PRESETS[0]
  if (params.presetId === "brand_custom" && params.brandColor) {
    directives.push(
      `Clean seamless studio background with subtle soft ambient tone harmonizing with ${params.brandColor}, balanced softbox lighting.`
    )
  } else if (preset) {
    directives.push(preset.promptDirective)
  }

  directives.push(
    "CRITICAL MANDATORY INSTRUCTION: DO NOT alter, reshape, add, replace, or remove the product. " +
    "Preserve 100% of the exact product geometry, materials, brand labels, colors, text, and physical structure. " +
    "Only replace the background, eliminate harsh glares/clutter, enhance professional studio lighting, and cast soft natural contact floor shadows."
  )

  if (params.customNote?.trim()) {
    directives.push(`User specific preference: ${params.customNote.trim()}.`)
  }

  if (params.failedCriteria && params.failedCriteria.length > 0) {
    directives.push(
      `PREVIOUS QC CORRECTION: Pay special attention to fixing: ${params.failedCriteria.join(", ")}.`
    )
  }

  if (params.retryHint?.trim()) {
    directives.push(`Correction guidance: ${params.retryHint.trim()}.`)
  }

  directives.push("Output: Clean, ultra-sharp, high-resolution commercial product photograph.")

  return directives.join(" ")
}
