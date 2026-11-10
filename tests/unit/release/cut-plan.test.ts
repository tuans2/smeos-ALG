import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import { planCut, type CutManifest } from "../../../scripts/release/cut-plan"

/** Kế hoạch bàn giao GD1, Bước 2.3 mục 6: CI của bản giao là CI trong lớp phủ, không phải CI của smeOS. */
const manifest: CutManifest = {
  phase: "gd1",
  features: [],
  framework: [],
  excluded: [],
  frameworkRoutes: [],
  excludedApis: [],
  rootFiles: [],
  registryFiles: { files: [] },
  acceptedViolations: [],
  cut: {
    keepTopLevel: [".github", "scripts", "src"],
    keepDocs: [],
    removePaths: [{ reason: "CI nội bộ", paths: [".github/workflows/release-gd1.yml"] }],
    dropNpmScripts: [],
    removedPythonPackages: [],
    overlay: "releases/gd1/overlay",
    regenerate: [],
  },
}

let root = ""

function write(file: string, content: string): void {
  mkdirSync(path.dirname(path.join(root, file)), { recursive: true })
  writeFileSync(path.join(root, file), content)
}

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true })
})

describe("planCut — script mà CI của bản giao dùng", () => {
  it("đọc workflow trong lớp phủ thay cho bản của smeOS, bỏ qua workflow bị loại", () => {
    root = mkdtempSync(path.join(tmpdir(), "cut-plan-"))
    write("src/app/page.tsx", "export default function Page() { return null }\n")
    write(".github/workflows/ci.yml", "steps:\n  - run: npx tsx scripts/smeos-only.ts\n")
    write(".github/workflows/release-gd1.yml", "steps:\n  - run: npx tsx scripts/release-only.ts\n")
    write("releases/gd1/overlay/.github/workflows/ci.yml", "steps:\n  - run: npx tsx scripts/alg-ci.ts\n")
    write("releases/gd1/overlay/.github/workflows/nightly.yml", "steps:\n  - run: npx tsx scripts/alg-nightly.ts\n")
    for (const name of ["smeos-only", "release-only", "alg-ci", "alg-nightly"]) write(`scripts/${name}.ts`, "export {}\n")

    const plan = planCut(root, manifest, {})

    expect(plan.keep).toEqual(expect.arrayContaining(["scripts/alg-ci.ts", "scripts/alg-nightly.ts", ".github/workflows/ci.yml"]))
    const removed = new Map(plan.removals.map((r) => [r.path, r.reason]))
    expect(removed.get("scripts/smeos-only.ts")).toBe("Script không còn lệnh nào dùng")
    expect(removed.get("scripts/release-only.ts")).toBe("Script không còn lệnh nào dùng")
    expect(removed.get(".github/workflows/release-gd1.yml")).toBe("CI nội bộ")
  })
})
