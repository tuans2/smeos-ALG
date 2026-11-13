/**
 * Sinh JSON Schema (draft 2020-12) từ hợp đồng zod của 14 chặng.
 * Đầu ra ghi vào `docs/dac-ta/schemas/creative-studio/` bởi
 * `scripts/gen-creative-studio-schemas.ts`; test so tệp trên đĩa với hàm này.
 */

import { z } from "zod"

import type { StageContract } from "./define-stage"
import { CREATIVE_STUDIO_STAGES } from "./registry"

export const CREATIVE_STUDIO_SCHEMA_DIR = "docs/dac-ta/schemas/creative-studio"
export const CONTRACTS_SOURCE_DIR = "src/modules/creative-production/contracts"

export interface GeneratedSchemaFile {
  readonly file: string
  readonly json: Record<string, unknown>
}

type Direction = "input" | "output"

export function stageFileBase(c: Pick<StageContract, "id" | "slug">): string {
  return `stage-${c.id}-${c.slug}`
}

function sourceFile(c: StageContract): string {
  return `${CONTRACTS_SOURCE_DIR}/${stageFileBase(c)}.ts`
}

function toJson(schema: z.ZodType, io: Direction): Record<string, unknown> {
  const out = z.toJSONSchema(schema, { target: "draft-2020-12", io, unrepresentable: "any" }) as Record<string, unknown>
  // `$schema` đứng đầu, phần còn lại giữ thứ tự zod sinh ra.
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
        generated: "SINH TỰ ĐỘNG — không sửa tay. Sửa zod ở tệp nguồn rồi chạy `npm run gen:schemas:creative`.",
      },
      ...body,
      examples: [example],
    },
  }
}

export function buildStageSchemaFiles(c: StageContract): GeneratedSchemaFile[] {
  const base = stageFileBase(c)
  const meta = {
    stageId: c.id,
    stage: c.stage,
    code: c.code,
    endpoint: c.endpoint,
    source: sourceFile(c),
  }
  const files: GeneratedSchemaFile[] = (["input", "output"] as const).map((direction) =>
    envelope(
      `${base}.${direction}.schema.json`,
      `${c.title} — ${direction === "input" ? "Đầu vào" : "Đầu ra"}`,
      c.summary,
      { ...meta, direction },
      toJson(direction === "input" ? c.input : c.output, direction),
      direction === "input" ? c.examples.input : c.examples.output
    )
  )
  for (const [name, extra] of Object.entries(c.extras ?? {})) {
    files.push(
      envelope(
        `${base}.${name}.schema.json`,
        `${c.title} — hợp đồng phụ "${name}"`,
        extra.schema.description ?? c.summary,
        { ...meta, direction: name },
        toJson(extra.schema, "input"),
        extra.example
      )
    )
  }
  return files
}

/** Toàn bộ tệp cần có trong thư mục schema, kể cả `index.json`. */
export function buildCreativeStudioSchemaFiles(): GeneratedSchemaFile[] {
  const perStage = CREATIVE_STUDIO_STAGES.map((c) => ({ c, files: buildStageSchemaFiles(c) }))
  const index: GeneratedSchemaFile = {
    file: "index.json",
    json: {
      title: "ALG Creative Studio — hợp đồng input/output 14 chặng",
      "x-alg": {
        generated: "SINH TỰ ĐỘNG — không sửa tay. Sửa zod ở tệp nguồn rồi chạy `npm run gen:schemas:creative`.",
        source: CONTRACTS_SOURCE_DIR,
      },
      stages: perStage.map(({ c, files }) => ({
        id: c.id,
        stage: c.stage,
        code: c.code,
        title: c.title,
        endpoint: `${c.endpoint.method} ${c.endpoint.path}`,
        capability: c.endpoint.capability,
        idempotencyKey: c.endpoint.idempotencyKey === true,
        source: sourceFile(c),
        files: files.map((f) => f.file),
      })),
    },
  }
  return [index, ...perStage.flatMap((p) => p.files)]
}

export function serializeSchemaFile(f: GeneratedSchemaFile): string {
  return `${JSON.stringify(f.json, null, 2)}\n`
}
