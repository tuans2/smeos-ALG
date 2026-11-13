import { IMAGE_SET_BUNDLES, type SetVariantDefinition } from "./bundle-catalog"

export interface SetPromptBuildParams {
  readonly bundleId?: string | undefined
  readonly variant: SetVariantDefinition
  readonly customNote?: string | undefined
  readonly referenceImageKey?: string | undefined
  readonly retryHint?: string | undefined
}

export function buildSetVariantPrompt(params: SetPromptBuildParams): string {
  const directives: string[] = [
    "Professional commercial studio product set photography.",
    params.variant.promptDirective,
    "CRITICAL SET CONSISTENCY & IDENTITY RULE: This photo is part of an official commercial product set. " +
    "You MUST preserve 100% exact product identity compared to the original reference photo: " +
    "identical product type and components, exact count of items/parts, exact packaging materials and colors, exact geometry, and structural proportions. " +
    "DO NOT introduce new elements, substitute product components, or add logos not present in the original. Maintain flawless visual continuity across the entire set."
  ]

  if (params.customNote?.trim()) {
    directives.push(`Custom client directive: ${params.customNote.trim()}.`)
  }

  if (params.retryHint?.trim()) {
    directives.push(`Correction note: ${params.retryHint.trim()}.`)
  }

  directives.push("Output: High-resolution, crisp commercial photograph ready for multichannel sales.")

  return directives.join(" ")
}
