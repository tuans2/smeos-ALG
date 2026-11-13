"use client"

import React from "react"
import { ArrowLeft, ArrowRight, Sparkles } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { useConfirmPublish } from "./use-confirm-publish"

interface LandingWizardNavProps {
  currentStep: number
  isPublishing: boolean
  onPrev: () => void
  onNext: () => void
  onPublish: () => Promise<void>
}

export function LandingWizardNav({
  currentStep,
  isPublishing,
  onPrev,
  onNext,
  onPublish,
}: LandingWizardNavProps) {
  const [publish, publishDialog] = useConfirmPublish(onPublish)
  if (currentStep >= 5) return null

  return (
    <div className="flex items-center justify-between pt-4 border-t border-border">
      <Button
        type="button"
        variant="outline"
        disabled={currentStep === 1}
        onClick={onPrev}
        className="flex items-center gap-1.5 text-body-sm font-semibold border-border hover:bg-surface-alt"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Quay lại</span>
      </Button>

      <div className="flex items-center gap-2">
        {currentStep < 4 ? (
          <Button
            type="button"
            variant="outline"
            onClick={onNext}
            className="border-primary text-primary hover:bg-primary-muted/20 flex items-center gap-1.5 text-body-sm font-semibold"
          >
            <span>Tiếp tục sang Bước {currentStep + 1}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => void publish()}
            disabled={isPublishing}
            className="bg-primary text-surface hover:bg-primary-dark flex items-center gap-1.5 text-body-sm font-semibold px-6"
          >
            <Sparkles className="h-4 w-4" />
            <span>{isPublishing ? "Đang xuất bản..." : "Xuất bản ngay →"}</span>
          </Button>
        )}
      </div>
      {publishDialog}
    </div>
  )
}
