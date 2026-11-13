-- AlterTable
ALTER TABLE "chain_branches" ADD COLUMN     "zalo_link_code" TEXT;

-- CreateTable
CREATE TABLE "platform_secrets" (
    "key" TEXT NOT NULL,
    "sealed_value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_secrets_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "chain_branches_zalo_link_code_key" ON "chain_branches"("zalo_link_code");

