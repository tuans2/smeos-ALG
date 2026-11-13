/**
 * Domain types for Greeting Card Templates (Mẫu Thẻ Chào).
 * Pure TypeScript — No Prisma or external infrastructure imports.
 */

export type GreetingTemplateId =
  // 12 Visual Swipe Styles (SSOT theo tài liệu Nang_cap_cac_Templates_The_chao_hang)
  | "editorial-luxury"
  | "minimal-clean"
  | "cinematic-dark"
  | "romantic-pastel"
  | "botanical-frame"
  | "glassmorphism"
  | "real-life-shop"
  | "real-life-daylight"
  | "real-life-in-store"
  | "real-life-handheld"
  | "lifestyle-context"
  | "mixed-media"
  // Legacy / Bổ trợ
  | "enterprise-luxury"
  | "swipe-classic"
  | "lookbook-grid"
  | "editorial-story"
  | "video-reels"
  | "occasion-budget-quiz"
  | "event-moodboard"
  | "split-compare"

export type TemplateCategory = "swipe-style" | "interactive-deck"

export interface GreetingCardTemplateDef {
  id: GreetingTemplateId
  styleNumber?: string
  name: string
  subtitle: string
  badge: string
  description: string
  tag: string
  category: TemplateCategory
  isDefault?: boolean
  features: string[]
  recommendedFor: string
}
