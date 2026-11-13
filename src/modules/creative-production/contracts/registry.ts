/**
 * Sổ đăng ký hợp đồng input/output của 14 chặng Creative Studio.
 * Chặng 06 CREATE tách bốn hợp đồng theo khu vực: 06a (B nội dung), 06b (C âm
 * thanh), 06c (D ảnh), 06d (E video). Thêm/đổi chặng: sửa tệp `stage-*.ts`,
 * khai ở đây, rồi `npm run gen:schemas:creative`.
 */

import type { StageContract } from "./define-stage"
import { stage01Bring } from "./stage-01-bring"
import { stage02Understand } from "./stage-02-understand"
import { stage03Discover } from "./stage-03-discover"
import { stage04Ideate } from "./stage-04-ideate"
import { stage05Choose } from "./stage-05-choose"
import { stage06aContent } from "./stage-06a-content"
import { stage06bAudio } from "./stage-06b-audio"
import { stage06cMedia } from "./stage-06c-media"
import { stage06dVideo } from "./stage-06d-video"
import { stage07Package } from "./stage-07-package"
import { stage08Qa } from "./stage-08-qa"
import { stage09Approve } from "./stage-09-approve"
import { stage10Launch } from "./stage-10-launch"
import { stage11Sell } from "./stage-11-sell"
import { stage12Measure } from "./stage-12-measure"
import { stage13Learn } from "./stage-13-learn"
import { stage14NextBestAction } from "./stage-14-next-best-action"

export const CREATIVE_STUDIO_STAGES: readonly StageContract[] = [
  stage01Bring,
  stage02Understand,
  stage03Discover,
  stage04Ideate,
  stage05Choose,
  stage06aContent,
  stage06bAudio,
  stage06cMedia,
  stage06dVideo,
  stage07Package,
  stage08Qa,
  stage09Approve,
  stage10Launch,
  stage11Sell,
  stage12Measure,
  stage13Learn,
  stage14NextBestAction,
] as unknown as readonly StageContract[]
