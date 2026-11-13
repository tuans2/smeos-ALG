-- Nhóm công cụ 6 — Tính giá và tối ưu lợi nhuận (#31–#35), PO duyệt schema 29/10/2026.
-- Bảng mới, không đụng dữ liệu cũ.
-- CreateTable
CREATE TABLE "materials" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "category_key" TEXT NOT NULL,
    "unit_cost_vnd" DECIMAL(14,2),
    "supplier_name" TEXT,
    "on_hand_qty" DECIMAL(14,3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_price_history" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "unit_cost_vnd" DECIMAL(14,2) NOT NULL,
    "source" TEXT NOT NULL,
    "effective_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,

    CONSTRAINT "material_price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_recipes" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "waste_percent" DECIMAL(5,2),
    "labor_minutes" INTEGER,
    "note" TEXT,
    "updated_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_recipe_items" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "recipe_id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,

    CONSTRAINT "product_recipe_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "materials_organization_id_idx" ON "materials"("organization_id");

-- CreateIndex
CREATE INDEX "materials_organization_id_category_key_idx" ON "materials"("organization_id", "category_key");

-- CreateIndex
CREATE UNIQUE INDEX "materials_organization_id_name_key" ON "materials"("organization_id", "name");

-- CreateIndex
CREATE INDEX "material_price_history_organization_id_idx" ON "material_price_history"("organization_id");

-- CreateIndex
CREATE INDEX "material_price_history_organization_id_material_id_effectiv_idx" ON "material_price_history"("organization_id", "material_id", "effective_at");

-- CreateIndex
CREATE INDEX "product_recipes_organization_id_idx" ON "product_recipes"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_recipes_organization_id_product_id_key" ON "product_recipes"("organization_id", "product_id");

-- CreateIndex
CREATE INDEX "product_recipe_items_organization_id_idx" ON "product_recipe_items"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_recipe_items_recipe_id_material_id_key" ON "product_recipe_items"("recipe_id", "material_id");

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_price_history" ADD CONSTRAINT "material_price_history_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_price_history" ADD CONSTRAINT "material_price_history_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_recipes" ADD CONSTRAINT "product_recipes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_recipes" ADD CONSTRAINT "product_recipes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_recipe_items" ADD CONSTRAINT "product_recipe_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_recipe_items" ADD CONSTRAINT "product_recipe_items_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "product_recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_recipe_items" ADD CONSTRAINT "product_recipe_items_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
