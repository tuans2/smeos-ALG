/**
 * Flower Content Guard — Bộ kiểm duyệt và an toàn nội dung chuyên ngành hoa.
 * 
 * Áp dụng toàn bộ hệ thống (floraos-core + SocialFlow M07 Content Engine).
 * Domain thuần túy, zero-Prisma, zero-side-effects.
 * 
 * Nguồn quy tắc: docs/kien-truc/TU_DIEN_TU_CAM_CONTENT_NGANH_HOA.md
 * và src/core/ai/domain/flower-content-banned-lexicon.json
 */
import { AppError } from "@/core/http/errors"
import lexiconData from "./flower-content-banned-lexicon.json"

export type ModerationLevel = "HARD_BLOCK" | "WARNING"
export type BannedCategory =
  | "flower_false_guarantee"
  | "ai_slop"
  | "clickbait_cheap"
  | "platform_policy"
  | "custom_brand_forbidden"

export interface BannedRule {
  readonly id: string
  readonly phrase: string
  readonly level: ModerationLevel
  readonly category: BannedCategory
  readonly reason: string
  readonly suggested_replacement?: string
}

export interface ModerationMatch {
  readonly ruleId: string
  readonly phrase: string
  readonly level: ModerationLevel
  readonly category: BannedCategory
  readonly reason: string
  readonly suggestedReplacement: string
  readonly index: number
}

export interface FlowerContentCheckResult {
  readonly isValid: boolean // false nếu có bất kỳ vi phạm HARD_BLOCK nào
  readonly hasWarnings: boolean
  readonly hardBlocks: readonly ModerationMatch[]
  readonly warnings: readonly ModerationMatch[]
  readonly matchCount: number
}

export interface SanitizeResult {
  readonly sanitizedText: string
  readonly replacementsApplied: readonly {
    readonly original: string
    readonly replacement: string
    readonly ruleId: string
    readonly reason: string
  }[]
}

/** Tải danh mục quy tắc mặc định từ file JSON */
export function getDefaultFlowerRules(): readonly BannedRule[] {
  return lexiconData.rules as readonly BannedRule[]
}

/**
 * Phân tích danh sách forbidden_styles từ BrandProfile của tổ chức thành các rules bổ sung
 */
export function parseBrandForbiddenStyles(forbiddenStylesStr?: string | null): readonly BannedRule[] {
  if (!forbiddenStylesStr || typeof forbiddenStylesStr !== "string") {
    return []
  }

  return forbiddenStylesStr
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((phrase, idx) => ({
      id: `BRAND-FORBIDDEN-${idx + 1}`,
      phrase: phrase.toLowerCase(),
      level: "HARD_BLOCK" as ModerationLevel,
      category: "custom_brand_forbidden" as BannedCategory,
      reason: `Phong cách bị cấm theo BrandProfile của tổ chức: "${phrase}"`,
      suggested_replacement: "",
    }))
}

/**
 * Kiểm tra nội dung văn bản dựa trên từ điển ngành hoa và brand forbidden styles.
 */
export function checkFlowerContent(
  text: string,
  options?: {
    readonly brandForbiddenStyles?: string | null | undefined
    readonly additionalRules?: readonly BannedRule[] | undefined
  } | undefined
): FlowerContentCheckResult {
  if (!text || typeof text !== "string") {
    return {
      isValid: true,
      hasWarnings: false,
      hardBlocks: [],
      warnings: [],
      matchCount: 0,
    }
  }

  const normalizedText = text.toLowerCase()
  const defaultRules = getDefaultFlowerRules()
  const brandRules = parseBrandForbiddenStyles(options?.brandForbiddenStyles)
  const additionalRules = options?.additionalRules ?? []
  const allRules: readonly BannedRule[] = [...defaultRules, ...brandRules, ...additionalRules]

  const hardBlocks: ModerationMatch[] = []
  const warnings: ModerationMatch[] = []

  for (const rule of allRules) {
    const targetPhrase = rule.phrase.toLowerCase().trim()
    if (!targetPhrase) continue

    let startIndex = 0
    while (startIndex < normalizedText.length) {
      const matchIndex = normalizedText.indexOf(targetPhrase, startIndex)
      if (matchIndex === -1) break

      const match: ModerationMatch = {
        ruleId: rule.id,
        phrase: rule.phrase,
        level: rule.level,
        category: rule.category,
        reason: rule.reason,
        suggestedReplacement: rule.suggested_replacement ?? "",
        index: matchIndex,
      }

      if (rule.level === "HARD_BLOCK") {
        hardBlocks.push(match)
      } else {
        warnings.push(match)
      }

      startIndex = matchIndex + targetPhrase.length
    }
  }

  return {
    isValid: hardBlocks.length === 0,
    hasWarnings: warnings.length > 0,
    hardBlocks,
    warnings,
    matchCount: hardBlocks.length + warnings.length,
  }
}

/**
 * Tự động làm sạch văn bản: Thay thế các cụm từ vi phạm bằng cụm từ gợi ý hợp lệ.
 */
export function sanitizeFlowerContent(
  text: string,
  options?: {
    readonly replaceHardBlocksOnly?: boolean | undefined
    readonly brandForbiddenStyles?: string | null | undefined
  } | undefined
): SanitizeResult {
  if (!text || typeof text !== "string") {
    return { sanitizedText: text, replacementsApplied: [] }
  }

  let result = text
  const check = checkFlowerContent(text, {
    brandForbiddenStyles: options?.brandForbiddenStyles,
  })

  const rulesToApply = options?.replaceHardBlocksOnly
    ? check.hardBlocks
    : [...check.hardBlocks, ...check.warnings]

  // Sắp xếp các match từ cuối chuỗi lên đầu để việc replace không làm lệch index
  const sortedMatches = [...rulesToApply].sort((a, b) => b.index - a.index)
  const replacementsApplied: Array<{
    original: string
    replacement: string
    ruleId: string
    reason: string
  }> = []

  for (const match of sortedMatches) {
    if (match.suggestedReplacement !== undefined) {
      const originalSlice = result.slice(match.index, match.index + match.phrase.length)
      result =
        result.slice(0, match.index) +
        match.suggestedReplacement +
        result.slice(match.index + match.phrase.length)

      replacementsApplied.push({
        original: originalSlice,
        replacement: match.suggestedReplacement,
        ruleId: match.ruleId,
        reason: match.reason,
      })
    }
  }

  return {
    sanitizedText: result,
    replacementsApplied,
  }
}

/**
 * Chặn cứng nếu vi phạm: Ném ra AppError("VALIDATION_FAILED") nếu phát hiện HARD_BLOCK
 */
export function assertFlowerContentAllowed(
  text: string,
  contextName = "Nội dung",
  brandForbiddenStyles?: string | null | undefined
): void {
  const check = checkFlowerContent(text, { brandForbiddenStyles })

  if (!check.isValid) {
    const violationSummary = check.hardBlocks
      .map((m) => `"${m.phrase}" (${m.reason})`)
      .join(", ")

    throw new AppError(
      "VALIDATION_FAILED",
      `${contextName} chứa từ ngữ cấm ngành hoa: ${violationSummary}`,
      {
        violations: check.hardBlocks,
      }
    )
  }
}
