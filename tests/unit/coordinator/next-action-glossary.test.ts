import { describe, expect, it } from "vitest"

import { GLOSSARY_BANNED } from "../../../scripts/ux-lint/rules-pd"
import { defaultNextAction } from "@/modules/coordinator/domain/operation-rules"
import { STAGE_LABELS } from "@/modules/coordinator/domain/stage-labels"
import type { CoordinatorStage } from "@/modules/coordinator/domain/coordinator-types"

/**
 * Nhãn bước và "việc kế tiếp" của điều phối hiện thẳng lên màn hình (thẻ tóm tắt đơn,
 * hàng chờ điều phối) nhưng nằm trong `src/modules/`, ngoài phạm vi UX lint R16.
 * Test này áp cùng danh sách từ cấm (docs/dac-ta/ux-patterns/glossary.md) cho chúng.
 */
const STAGES = Object.keys(STAGE_LABELS) as CoordinatorStage[]

function bannedTerms(text: string): string[] {
  return GLOSSARY_BANNED.filter(([pattern]) => pattern.test(text)).map(([pattern]) => text.match(pattern)![0])
}

describe("điều phối — chữ hiển thị theo từ điển thuật ngữ", () => {
  it.each(STAGES)("việc kế tiếp của bước %s không có từ cấm", (stage) => {
    expect(bannedTerms(defaultNextAction(stage))).toEqual([])
  })

  it.each(STAGES)("nhãn bước %s không có từ cấm", (stage) => {
    expect(bannedTerms(STAGE_LABELS[stage])).toEqual([])
  })
})
