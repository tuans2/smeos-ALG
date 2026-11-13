import type { Prisma } from "@/generated/prisma/client"
import { getIndustryPlugin } from "@/modules/organization/domain/industry-profile"
import { getMockAssetsForIndustry } from "@/modules/profiles/domain/mock-data-catalog"

/**
 * Nạp 3-4 sản phẩm mẫu sống động cho ngành vào bảng products (kèm ảnh và giá chuẩn)
 */
export async function seedSampleProductsForIndustry(tx: Prisma.TransactionClient, organizationId: string, industryKey: string) {
  const plugin = getIndustryPlugin(industryKey)
  const mockAssets = getMockAssetsForIndustry(industryKey)
  const categories = plugin.taxonomy.defaultCategories

  if (mockAssets && mockAssets.products.length > 0) {
    for (let i = 0; i < mockAssets.products.length; i++) {
      const p = mockAssets.products[i]!
      const code = `DEMO-${industryKey.slice(0, 3)}-${String(i + 1).padStart(3, "0")}`

      const product = await tx.products.create({
        data: {
          organization_id: organizationId,
          code,
          name: p.name,
          category: p.category,
          status: "ACTIVE",
          attributes: {
            sample: true,
            imageUrl: p.image,
            price: p.price,
            original_price: p.originalPrice,
            description: p.description,
            unit: categories[0]?.defaultUnit || "món",
          },
        },
      })

      await tx.product_variants.create({
        data: {
          organization_id: organizationId,
          product_id: product.id,
          name: "Tiêu chuẩn",
          multiplier: 1.0,
          attributes: {
            price: p.price,
            original_price: p.originalPrice,
          },
        },
      })
    }
    return
  }

  // Fallback nếu ngành chưa có mock assets catalog
  const sampleNames = plugin.aiConfig.sampleProductNames.slice(0, 3)
  for (let i = 0; i < sampleNames.length; i++) {
    const name = sampleNames[i]!
    const cat = categories[i % categories.length]
    const code = `DEMO-${industryKey.slice(0, 3)}-${String(i + 1).padStart(3, "0")}`

    const product = await tx.products.create({
      data: {
        organization_id: organizationId,
        code,
        name,
        category: cat?.key || "GENERAL",
        status: "ACTIVE",
        attributes: {
          sample: true,
          unit: cat?.defaultUnit || "món",
          description: `Sản phẩm mẫu phục vụ trải nghiệm tính năng của ${plugin.identity.name}`,
        },
      },
    })

    await tx.product_variants.create({
      data: {
        organization_id: organizationId,
        product_id: product.id,
        name: "Tiêu chuẩn",
        multiplier: 1.0,
        attributes: {
          price: (i + 1) * 150000 + 100000,
          original_price: (i + 1) * 180000 + 100000,
        },
      },
    })
  }
}
