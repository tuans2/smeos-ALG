/**
 * Cổng embedding — `AIC-27`, phục vụ truy hồi ở `AIC-28`.
 *
 * Vector lưu trên `pgvector` của chính Postgres đang dùng (D19). Không thêm
 * một cơ sở dữ liệu vector riêng.
 */
export interface EmbeddingInput {
  readonly texts: readonly string[]
}

export interface EmbeddingOutput {
  readonly vectors: readonly number[][]
  readonly modelVersion: string
}

export interface EmbeddingProvider {
  readonly name: string
  embed(input: EmbeddingInput): Promise<EmbeddingOutput>
}
