import { describe, it, expect } from "vitest"
import {
  GREETING_TEMPLATES,
  GREETING_TEMPLATE_LIST,
  SWIPE_12_STYLES,
  resolveGreetingTemplateId,
} from "../greeting-template-registry"

describe("Greeting Template Registry Domain Tests", () => {
  it("should use editorial-luxury (style #01) as the single default template", () => {
    expect(GREETING_TEMPLATES["editorial-luxury"].isDefault).toBe(true)
    expect(GREETING_TEMPLATE_LIST.filter((t) => t.isDefault)).toHaveLength(1)
  })

  it("should contain 12 swipe styles plus the 8 interactive decks", () => {
    expect(SWIPE_12_STYLES).toHaveLength(12)
    expect(GREETING_TEMPLATE_LIST).toHaveLength(20)
    const expectedIds = [
      "enterprise-luxury",
      "swipe-classic",
      "lookbook-grid",
      "editorial-story",
      "video-reels",
      "occasion-budget-quiz",
      "event-moodboard",
      "split-compare",
    ]

    for (const id of expectedIds) {
      expect(GREETING_TEMPLATES[id as keyof typeof GREETING_TEMPLATES]).toBeDefined()
    }
  })

  it("should correctly resolve template IDs with fallback to editorial-luxury", () => {
    expect(resolveGreetingTemplateId("enterprise-luxury")).toBe("enterprise-luxury")
    expect(resolveGreetingTemplateId("swipe-classic")).toBe("swipe-classic")
    expect(resolveGreetingTemplateId("lookbook-grid")).toBe("lookbook-grid")
    expect(resolveGreetingTemplateId("editorial-story")).toBe("editorial-story")
    expect(resolveGreetingTemplateId("video-reels")).toBe("video-reels")
    expect(resolveGreetingTemplateId("occasion-budget-quiz")).toBe("occasion-budget-quiz")
    expect(resolveGreetingTemplateId("event-moodboard")).toBe("event-moodboard")
    expect(resolveGreetingTemplateId("split-compare")).toBe("split-compare")
    expect(resolveGreetingTemplateId(null)).toBe("editorial-luxury")
    expect(resolveGreetingTemplateId(undefined)).toBe("editorial-luxury")
    expect(resolveGreetingTemplateId("unknown-template")).toBe("editorial-luxury")
  })

  it("all templates should have required commercial features and description", () => {
    for (const tpl of GREETING_TEMPLATE_LIST) {
      expect(tpl.name.length).toBeGreaterThan(0)
      expect(tpl.description.length).toBeGreaterThan(0)
      expect(tpl.badge.length).toBeGreaterThan(0)
      expect(tpl.features.length).toBeGreaterThan(0)
      expect(tpl.recommendedFor.length).toBeGreaterThan(0)
    }
  })
})
