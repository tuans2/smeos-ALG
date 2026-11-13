/**
 * Đăng ký phiên bản prompt đang dùng cho mỗi agent (mục 5.1 kế hoạch: đổi
 * phiên bản = đổi một dòng ở đây, không rải rác trong use-case). Nâng cấp
 * prompt: tạo `vN.ts` mới cạnh `v1.ts`, rồi trỏ registry sang bản mới —
 * không sửa lặng lẽ bản đang chạy.
 *
 * Thuần — không import Prisma, không gọi mạng.
 */

import { BRAND_IDENTITY_PROMPT_V1 } from "./brand-identity/v1"
import { CATALOG_WRITER_PROMPT_V2 } from "./catalog/v2"
import { CRITIC_PROMPT_V1 } from "./critic/v1"
import { LANDING_WRITER_PROMPT_V2 } from "./landing/v2"
import { REWRITER_PROMPT_V1 } from "./rewriter/v1"
import { STRATEGIST_PROMPT_V1 } from "./strategist/v1"
import { WRITER_PROMPT_V1 } from "./writer/v1"

export const ACTIVE_PROMPTS = {
  strategist: STRATEGIST_PROMPT_V1,
  writer: WRITER_PROMPT_V1,
  critic: CRITIC_PROMPT_V1,
  rewriter: REWRITER_PROMPT_V1,
  /** Landing (08) / Catalog (09) — v1 vẫn giữ, quay về bằng cách trỏ lại `LANDING_WRITER_PROMPT_V1` / `CATALOG_WRITER_PROMPT_V1`. */
  landingWriter: LANDING_WRITER_PROMPT_V2,
  catalogWriter: CATALOG_WRITER_PROMPT_V2,
  /** Khẩu hiệu Bộ nhận diện (mục Thương hiệu bước 2, PO 08/11/2026). */
  brandIdentity: BRAND_IDENTITY_PROMPT_V1,
} as const
