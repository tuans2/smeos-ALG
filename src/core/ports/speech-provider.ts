/**
 * Cổng tiếng nói — `AIC-21` (giọng đọc) và `AIC-22` (phụ đề).
 */
import type { AssetRef, ProviderMedia } from "./shared-media"

export interface SynthesizeInput {
  readonly text: string
  readonly voice: string
  readonly language: string
}

export interface TranscribeInput {
  readonly mediaRef: AssetRef
  readonly language?: string
}

export interface TranscribeOutput {
  readonly segments: ReadonlyArray<{
    readonly startMs: number
    readonly endMs: number
    readonly text: string
  }>
  readonly modelVersion: string
}

export interface SpeechProvider {
  readonly name: string
  synthesize(input: SynthesizeInput): Promise<ProviderMedia>
  transcribe(input: TranscribeInput): Promise<TranscribeOutput>
}
