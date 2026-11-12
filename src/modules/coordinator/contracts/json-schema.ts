/**
 * Sinh JSON Schema (draft 2020-12) từ hợp đồng zod của 7 bước Coordinator.
 * Đầu ra ghi vào `docs/dac-ta/schemas/coordinator/` bởi
 * `scripts/gen-coordinator-schemas.ts`.
 */

import { z } from "zod"
import type { StepContract } from "./define-step"
import { COORDINATOR_STEPS } from "./registry"

export const COORDINATOR_SCHEMA_DIR = "docs/dac-ta/schemas/coordinator"
export const CONTRACTS_SOURCE_DIR = "src/modules/coordinator/contracts"

export interface GeneratedSchemaFile {
  readonly file: string
  readonly json: Record<string, unknown>
}

type Direction = "input" | "output"

export function stepFileBase(c: Pick<StepContract, "id" | "slug">): string {
  return `step-${c.id}-${c.slug}`
}

function sourceFile(c: StepContract): string {
  return `${CONTRACTS_SOURCE_DIR}/${stepFileBase(c)}.ts`
}

function toJson(schema: z.ZodType, io: Direction): Record<string, unknown> {
  const out = z.toJSONSchema(schema, { target: "draft-2020-12", io, unrepresentable: "any" }) as Record<string, unknown>
  delete out.$schema
  return out
}

function envelope(
  file: string,
  title: string,
  description: string,
  meta: Record<string, unknown>,
  body: Record<string, unknown>,
  example: unknown
): GeneratedSchemaFile {
  return {
    file,
    json: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: file,
      title,
      description,
      "x-alg": {
        ...meta,
        generated: "SINH TỰ ĐỘNG — không sửa tay. Sửa zod ở tệp nguồn rồi chạy `npm run gen:schemas:coordinator`.",
      },
      ...body,
      examples: [example],
    },
  }
}

export function buildStepSchemaFiles(c: StepContract): GeneratedSchemaFile[] {
  const base = stepFileBase(c)
  const meta = {
    stepId: c.id,
    step: c.step,
    code: c.code,
    endpoint: c.endpoint,
    source: sourceFile(c),
  }
  return (["input", "output"] as const).map((direction) =>
    envelope(
      `${base}.${direction}.schema.json`,
      `${c.title} — ${direction === "input" ? "Đầu vào" : "Đầu ra"}`,
      c.summary,
      { ...meta, direction },
      toJson(direction === "input" ? c.input : c.output, direction),
      direction === "input" ? c.examples.input : c.examples.output
    )
  )
}

export function buildCoordinatorSchemaFiles(): GeneratedSchemaFile[] {
  const perStep = COORDINATOR_STEPS.map((c) => ({ c, files: buildStepSchemaFiles(c) }))
  const index: GeneratedSchemaFile = {
    file: "index.json",
    json: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "index.json",
      title: "Chỉ mục JSON Schema — Coordinator Operations",
      description: "Danh sách tệp JSON Schema đầu vào/đầu ra của 7 bước Điều phối Đơn hàng.",
      "x-alg": {
        module: "coordinator",
        stepsCount: COORDINATOR_STEPS.length,
        generated: "SINH TỰ ĐỘNG — không sửa tay.",
      },
      steps: perStep.map(({ c, files }) => ({
        id: c.id,
        code: c.code,
        slug: c.slug,
        title: c.title,
        endpoint: c.endpoint,
        schemas: {
          input: files[0]?.file,
          output: files[1]?.file,
        },
      })),
    },
  }
  return [index, ...perStep.flatMap((p) => p.files)]
}

export function serializeSchemaFile(f: GeneratedSchemaFile): string {
  return `${JSON.stringify(f.json, null, 2)}\n`
}
