import { notFound } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { GenerationJobRepository, getGenerationJobRepository } from "@/modules/jobs/infra/generation-job-repository"

/** `GET /jobs/:id` (`G4`, đặc tả 06 mục 7). */
export async function getJob(ctx: TenantContext, id: string) {
  const job = await getGenerationJobRepository().findById(ctx, id)
  if (!job) throw notFound()
  return job
}
