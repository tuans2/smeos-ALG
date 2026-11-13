/**
 * render-banner-single-call.use-case.ts — Use-case điều phối render poster & banner.
 * Tuân thủ quy chuẩn Single-Call Provider và QC evaluation trước khi hoàn tất.
 */

import type { BannerProjectInput, BannerAspectRatio } from "../domain/banner-types"
import { evaluateBannerQc, type BannerQcEvaluation } from "../domain/banner-rules"
import {
  DefaultBannerProviderAdapter,
  type IBannerProviderAdapter,
  type BannerRenderResult,
} from "../adapters/banner-provider-adapter"

export interface RenderBannerUseCaseInput {
  readonly project: BannerProjectInput
  readonly formats?: readonly BannerAspectRatio[]
}

export interface RenderBannerUseCaseOutput {
  readonly qc: BannerQcEvaluation
  readonly results: readonly BannerRenderResult[]
}

export async function renderBannerSingleCallUseCase(
  input: RenderBannerUseCaseInput,
  adapter: IBannerProviderAdapter = new DefaultBannerProviderAdapter()
): Promise<RenderBannerUseCaseOutput> {
  // 1. Thẩm định QC dự án
  const qc = evaluateBannerQc(input.project)

  // 2. Xác định các định dạng mục tiêu
  const targetFormats = input.formats && input.formats.length > 0
    ? input.formats
    : input.project.targetFormats

  // 3. Thực hiện render từng kích thước theo adapter
  const results: BannerRenderResult[] = []
  for (const format of targetFormats) {
    const result = await adapter.renderBanner(input.project, format)
    results.push(result)
  }

  return {
    qc,
    results,
  }
}
