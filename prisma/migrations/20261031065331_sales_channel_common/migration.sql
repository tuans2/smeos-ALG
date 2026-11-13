-- CreateEnum
CREATE TYPE "sales_listing_status" AS ENUM ('PENDING', 'SYNCED', 'REJECTED', 'REMOVED');

-- CreateEnum
CREATE TYPE "sales_channel_order_status" AS ENUM ('IMPORTED', 'FAILED');

-- CreateTable
CREATE TABLE "sales_channel_listings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "connection_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "external_id" TEXT,
    "status" "sales_listing_status" NOT NULL DEFAULT 'PENDING',
    "last_error" TEXT,
    "last_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_channel_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_channel_orders" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "connection_id" TEXT NOT NULL,
    "external_order_id" TEXT NOT NULL,
    "order_id" TEXT,
    "status" "sales_channel_order_status" NOT NULL,
    "error_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_channel_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sales_channel_listings_organization_id_idx" ON "sales_channel_listings"("organization_id");

-- CreateIndex
CREATE INDEX "sales_channel_listings_organization_id_product_id_idx" ON "sales_channel_listings"("organization_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_channel_listings_connection_id_product_id_key" ON "sales_channel_listings"("connection_id", "product_id");

-- CreateIndex
CREATE INDEX "sales_channel_orders_organization_id_idx" ON "sales_channel_orders"("organization_id");

-- CreateIndex
CREATE INDEX "sales_channel_orders_organization_id_created_at_idx" ON "sales_channel_orders"("organization_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "sales_channel_orders_connection_id_external_order_id_key" ON "sales_channel_orders"("connection_id", "external_order_id");

-- AddForeignKey
ALTER TABLE "sales_channel_listings" ADD CONSTRAINT "sales_channel_listings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_channel_listings" ADD CONSTRAINT "sales_channel_listings_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "integration_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_channel_orders" ADD CONSTRAINT "sales_channel_orders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_channel_orders" ADD CONSTRAINT "sales_channel_orders_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "integration_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
