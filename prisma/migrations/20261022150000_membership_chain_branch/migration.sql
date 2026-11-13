-- AlterTable
ALTER TABLE "memberships" ADD COLUMN     "chain_branch_code" TEXT;

-- CreateIndex
CREATE INDEX "memberships_organization_id_chain_branch_code_idx" ON "memberships"("organization_id", "chain_branch_code");

