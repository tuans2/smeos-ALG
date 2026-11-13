"use client"

import { useRouter } from "next/navigation"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { Button } from "@/components/ui/button"
import { FormLayout } from "@/components/layout/page-layout"
import { PageHeader } from "@/components/ui/page-header"
import { useI18n } from "@/lib/i18n"
import { getIndustryPlugin } from "@/modules/organization/domain/industry-profile"
import { CreateGeneralCard } from "@/components/products/create-general-card"
import { CreateDesignCard } from "@/components/products/create-design-card"
import { CreateBomCard } from "@/components/products/create-bom-card"
import { CreateStoryCard } from "@/components/products/create-story-card"
import { CreateOccasionSizeCard } from "@/components/products/create-occasion-size-card"
import { useCreateProductForm } from "@/components/products/use-create-product-form"

export default function CreateProductPage() {
  const router = useRouter()
  const { ti, industry } = useI18n()
  const activeIndustry = industry || getIndustryPlugin()

  const form = useCreateProductForm({ ti, activeIndustry })

  return (
    <FormLayout
      header={
        <PageHeader
          backHref="/san-pham"
          backLabel="Danh sách sản phẩm"
          title={ti("createButtonLabel")}
          tip={`Thêm ${ti("sampleProduct").toLowerCase()} mới vào ${ti("catalogTitle").toLowerCase()}. Có thể dùng AI nhận diện từ ảnh để điền sẵn.`}
          actions={
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => router.push("/tai-anh" as never)}
                className="flex items-center gap-1.5"
                title={`Dùng AI nhận diện ảnh và tự sinh ${ti("productRecipe").toLowerCase()}`}
              >
                <Sparkles size={14} className="text-primary" />
                <span className="hidden sm:inline">{ti("scanButtonLabel")}</span>
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={form.handleSubmit}
                disabled={form.submitting}
                className="flex items-center gap-1.5 font-bold"
              >
                <CheckCircle2 size={15} strokeWidth={2.2} />
                <span>
                  {form.submitting ? "Đang lưu..." : `Lưu vào ${ti("catalogTitle").toLowerCase()}`}
                </span>
              </Button>
            </div>
          }
        />
      }
    >
      <div className="mx-auto max-w-4xl space-y-6">
        {form.errorMsg && (
          <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger-bg p-4 text-body-sm font-medium text-danger">
            <AlertCircle size={18} className="flex-shrink-0" />
            <span>{form.errorMsg}</span>
          </div>
        )}

        <form onSubmit={form.handleSubmit} className="space-y-6">
          <CreateGeneralCard
            ti={ti}
            industry={activeIndustry}
            name={form.name}
            setName={form.setName}
            code={form.code}
            setCode={form.setCode}
            priceVnd={form.priceVnd}
            setPriceVnd={form.setPriceVnd}
            pricing={form.pricing}
            setPricing={form.setPricing}
            category={form.category}
            setCategory={form.setCategory}
            categories={form.categories}
            status={form.status}
            setStatus={form.setStatus}
            imagePreview={form.imagePreview}
            imageFile={form.imageFile}
            onFileChange={form.handleFileChange}
            onRemoveImage={form.handleRemoveImage}
            onAcceptNormalizedImage={form.handleAcceptNormalizedImage}
            fileInputRef={form.fileInputRef}
            industryPrefix={form.industryPrefix}
          />

          <CreateDesignCard
            industryKey={activeIndustry.identity.key}
            shape={form.shape}
            setShape={form.setShape}
            facing={form.facing}
            setFacing={form.setFacing}
            container={form.container}
            setContainer={form.setContainer}
            primaryColor={form.primaryColor}
            setPrimaryColor={form.setPrimaryColor}
          />

          <CreateOccasionSizeCard value={form.occasionSize} craftStyles={activeIndustry.craftFee?.styles ?? []} />

          <CreateBomCard
            ti={ti}
            industry={activeIndustry}
            bomItems={form.bomItems}
            onAddBomItem={form.handleAddBomItem}
            onUpdateBomItem={form.handleUpdateBomItem}
            onRemoveBomItem={form.handleRemoveBomItem}
          />

          <CreateStoryCard
            ti={ti}
            industry={activeIndustry}
            description={form.description}
            setDescription={form.setDescription}
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/san-pham" as never)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={form.submitting}
              className="flex items-center gap-1.5 font-bold"
            >
              <CheckCircle2 size={16} />
              <span>
                {form.submitting
                  ? "Đang lưu..."
                  : `Lưu vào ${ti("catalogTitle").toLowerCase()}`}
              </span>
            </Button>
          </div>
        </form>
      </div>
    </FormLayout>
  )
}
