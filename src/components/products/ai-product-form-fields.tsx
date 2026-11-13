"use client"

import React, { useRef } from "react"
import type { IndustryPluginContract } from "@/modules/organization/domain/industry-plugin-contract"
import type { BomItem, TerminologyGetter } from "./create-product-types"
import type { ProductFormValues } from "./ai-product-helpers"
import { CreateGeneralCard } from "./create-general-card"
import { EMPTY_PRICING } from "./pricing/pricing-form"
import { CreateDesignCard } from "./create-design-card"
import { CreateBomCard } from "./create-bom-card"
import { CreateStoryCard } from "./create-story-card"

interface AiProductFormFieldsProps {
  ti: TerminologyGetter
  industry: IndustryPluginContract
  values: ProductFormValues
  onChange: <K extends keyof ProductFormValues>(field: K, value: ProductFormValues[K]) => void
  onImageFileSelected: (file: File) => void
  onRemoveImage: () => void
  imagePreview: string | null
  uploadingImage: boolean
  onCallContentEngine?: (style: "luxurious" | "sweet" | "creative" | "concise") => Promise<void>
  isGeneratingContent?: boolean
  contentSuggestions?: string[]
  onSelectSuggestion?: (text: string) => void
}

export function AiProductFormFields({
  ti,
  industry,
  values,
  onChange,
  onImageFileSelected,
  onRemoveImage,
  imagePreview,
  uploadingImage,
}: AiProductFormFieldsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const categories = industry.taxonomy.defaultCategories.map((c) => c.label)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onImageFileSelected(file)
    }
  }

  // BOM Handlers
  const handleAddBomItem = () => {
    const defaultUnit = industry.bomSpec?.measurementUnits?.[0] || "cái"
    const defaultRole =
      industry.bomSpec?.componentRoles?.[1]?.label ||
      industry.bomSpec?.componentRoles?.[0]?.label ||
      "Phụ"

    const newItem: BomItem = {
      id: `bom-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      name: "",
      quantity: 1,
      unit: defaultUnit,
      color: "",
      role: defaultRole,
    }

    onChange("flowers", [...values.flowers, newItem])
  }

  const handleUpdateBomItem = (id: string, field: keyof BomItem, value: string | number) => {
    onChange(
      "flowers",
      values.flowers.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
  }

  const handleRemoveBomItem = (id: string) => {
    onChange(
      "flowers",
      values.flowers.filter((item) => item.id !== id)
    )
  }

  return (
    <div className="space-y-5">
      {/* 1. Ảnh đại diện và thông tin chung */}
      <CreateGeneralCard
        ti={ti}
        industry={industry}
        name={values.name}
        setName={(val) => onChange("name", val)}
        code={values.code}
        setCode={(val) => onChange("code", val)}
        priceVnd={values.priceVnd}
        setPriceVnd={(val) => onChange("priceVnd", val)}
        pricing={values.pricing ?? EMPTY_PRICING}
        setPricing={(val) => onChange("pricing", val)}
        category={values.category}
        setCategory={(val) => onChange("category", val)}
        categories={categories}
        status={values.status}
        setStatus={(val) => onChange("status", val)}
        imagePreview={imagePreview}
        onFileChange={handleFileChange}
        onRemoveImage={onRemoveImage}
        fileInputRef={fileInputRef}
        driveLink={values.driveLink}
      />

      {/* 2. Kiểu dáng & Hướng nhìn / View phòng / Quy cách */}
      <CreateDesignCard
        industryKey={industry.identity.key}
        shape={values.shape}
        setShape={(val) => onChange("shape", val)}
        facing={values.facing}
        setFacing={(val) => onChange("facing", val)}
        container={values.container}
        setContainer={(val) => onChange("container", val)}
        primaryColor={values.primaryColor}
        setPrimaryColor={(val) => onChange("primaryColor", val)}
      />

      {/* 3. Định mức BOM & Thành phần vật tư / Tiện nghi phòng */}
      <CreateBomCard
        ti={ti}
        industry={industry}
        bomItems={values.flowers}
        onAddBomItem={handleAddBomItem}
        onUpdateBomItem={handleUpdateBomItem}
        onRemoveBomItem={handleRemoveBomItem}
      />

      {/* 4. Câu chuyện và thông điệp trải nghiệm / tiếp thị */}
      <CreateStoryCard
        ti={ti}
        industry={industry}
        description={values.description}
        setDescription={(val) => onChange("description", val)}
      />
    </div>
  )
}
