/**
 * nav-duplicate-audit.test.ts — Kiem tra trung lap href trong sidebar 4 tang
 * Chay: npx vitest run src/components/layout/nav-duplicate-audit.test.ts
 */
import { describe, it, expect } from "vitest"
import { buildNav } from "./nav-model"
import { ROLE_UX_CATALOG } from "@/modules/organization/domain/role-ux-catalog"

describe("Sidebar Duplicate Audit - 4 tang", () => {
  const allRoles = [null, ...ROLE_UX_CATALOG]

  for (const role of allRoles) {
    const roleName = role ? `${role.key} (${role.group})` : "null (default StoreOS)"

    it(`Role: ${roleName} - khong co href trung lap`, () => {
      const nav = buildNav(() => true, role)
      const seen = new Map<string, string>()
      const duplicates: Array<{ href: string; first: string; second: string }> = []

      for (const group of nav.groups) {
        for (const entry of group.entries) {
          const location = `${group.label} [${group.key}]`
          if (seen.has(entry.href)) {
            duplicates.push({
              href: entry.href,
              first: seen.get(entry.href)!,
              second: location,
            })
          } else {
            seen.set(entry.href, location)
          }
        }
      }

      if (duplicates.length > 0) {
        const msg = duplicates
          .map((d) => `"${d.href}": "${d.first}" -> "${d.second}"`)
          .join("\n")
        throw new Error(`Phat hien ${duplicates.length} href trung:\n${msg}`)
      }

      expect(duplicates).toHaveLength(0)
    })
  }
})
