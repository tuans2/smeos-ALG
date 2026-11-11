"use client";

/**
 * FeaturePicker — Main component for selecting AI capabilities per product.
 * 
 * Flow:
 * 1. Load product + check Master Image approval status
 * 2. Render ModuleFeatureGroup accordion for each module
 * 3. User ticks checkboxes for desired features
 * 4. Real-time credit estimation + dependency validation
 * 5. Submit → POST /api/v1/jobs/batch → returns job IDs
 * 6. Redirect to job monitoring page or show SSE progress
 */

import { useState, useCallback, useMemo } from "react";
import { ChevronDown } from "@/components/ui/icon-set/chevron-down"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { Info } from "@/components/ui/icon-set/info"
import { CreditCard } from "@/components/ui/icon-set/credit-card"
import { Zap } from "@/components/ui/icon-set/zap"
import { Lock } from "@/components/ui/icon-set/lock"
import { Eye } from "@/components/ui/icon-set/eye"
import { EyeOff } from "@/components/ui/icon-set/eye-off"
import { HelpCircle } from "@/components/ui/icon-set/help-circle"
import { ExternalLink } from "@/components/ui/icon-set/external-link"
;
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/session";
import {
  FEATURE_CATALOG,
  MODULE_GROUPS,
  ModuleFeatureGroup,
  SubFeature,
  ModuleKey,
  checkFeatureDependencies,
  checkModuleDependencies,
  getJobFeatureForModule,
  getCapabilitiesForModule,
  getVisibleFeaturesByModule,
} from "@/lib/feature-catalog";
import { estimateTotalCredits, getCreditBreakdown, getCostWarningLevel, formatCredits } from "@/lib/credit-estimator";

interface FeaturePickerProps {
  productId: string;
  productName: string;
  hasApprovedAnalysis: boolean;
  hasApprovedMasterImage: boolean;
  masterImageId: string | undefined;
  userCreditBalance: number;
  onJobsCreated: (jobs: Array<{ jobId: string; feature: string; module: string }>) => void;
  onError: (error: string) => void;
  onClose?: () => void;
}

export function FeaturePicker({
  productId,
  productName,
  hasApprovedAnalysis,
  hasApprovedMasterImage,
  masterImageId,
  userCreditBalance,
  onJobsCreated,
  onError,
  onClose,
}: FeaturePickerProps) {
  const { capabilities } = useSession();
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(new Set());
  const [expandedModules, setExpandedModules] = useState<Set<ModuleKey>>(new Set(["M01b", "M04b", "M04c", "M07"]));
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showCreditDetails, setShowCreditDetails] = useState(false);

  // Filter features by user RBAC and status
  const moduleGroups = useMemo(() => {
    return MODULE_GROUPS.map(group => ({
      ...group,
      features: group.features.filter(f => 
        f.status !== "coming_soon" || f.module === "M01b" // show coming soon for M01b as preview
      ).filter(f => !f.rbacRun || capabilities.includes(f.rbacRun)), // RBAC gate
      dependencyCheck: checkModuleDependencies(group.module, {
        hasApprovedAnalysis,
        hasApprovedMasterImage,
      }),
    })).filter(g => g.features.length > 0);
  }, [capabilities, hasApprovedAnalysis, hasApprovedMasterImage]);

  // Dependency context for feature-level checks
  const depContext = useMemo(() => ({
    hasApprovedAnalysis,
    hasApprovedMasterImage,
    hasCustomerConsent: false, // TODO: check actual consent
  }), [hasApprovedAnalysis, hasApprovedMasterImage]);

  // Selected features array
  const selectedArray = Array.from(selectedFeatures);

  // Credit estimation
  const totalCredits = estimateTotalCredits(selectedArray);
  const creditBreakdown = getCreditBreakdown(selectedArray);
  const costWarning = getCostWarningLevel(userCreditBalance, selectedArray);

  // Can submit?
  const canSubmit = selectedArray.length > 0 && !submitting && costWarning !== "danger";

  // Toggle module expansion
  const toggleModule = (module: ModuleKey) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(module)) next.delete(module);
      else next.add(module);
      return next;
    });
  };

  // Toggle feature selection
  const toggleFeature = (feature: SubFeature) => {
    const depCheck = checkFeatureDependencies(feature, depContext);
    if (!depCheck.canRun) return; // blocked by dependency
    
    setSelectedFeatures(prev => {
      const next = new Set(prev);
      if (next.has(feature.key)) next.delete(feature.key);
      else next.add(feature.key);
      return next;
    });
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      // Group selected features by module
      const featuresByModule = new Map<ModuleKey, string[]>();
      for (const key of selectedArray) {
        const feature = FEATURE_CATALOG.find(f => f.key === key);
        if (feature) {
          const arr = featuresByModule.get(feature.module) ?? [];
          arr.push(key);
          featuresByModule.set(feature.module, arr);
        }
      }

      // Create jobs per module
      const jobs = await Promise.all(
        Array.from(featuresByModule.entries()).map(async ([module, featureKeys]) => {
          const jobFeature = getJobFeatureForModule(module);
          const capabilitiesList = getCapabilitiesForModule(module, featureKeys);
          
          const res = await fetch("/api/v1/jobs/batch", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": crypto.randomUUID(),
            },
            body: JSON.stringify({
              productId,
              masterImageId,
              feature: jobFeature,
              capabilities: capabilitiesList,
              module,
            }),
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
            throw new Error(err.message ?? `Failed to create ${module} job`);
          }

          const data = await res.json();
          return {
            jobId: data.job_id,
            feature: jobFeature,
            module,
          };
        })
      );

      onJobsCreated(jobs);
      if (onClose) onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Có lỗi khi tạo tác vụ";
      setSubmitError(msg);
      onError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Auto-run modules (M01, M04a) — show as single action buttons
  const autoRunModules = moduleGroups.filter(g => g.isAutoRun);

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full gap-4 p-4 overflow-y-auto">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-title font-extrabold">Chọn tính năng AI cho sản phẩm</h2>
              <p className="text-meta text-text-muted mt-0.5">
                {productName} — Tick từng tính năng, hệ thống sẽ tạo tác vụ riêng cho mỗi module
              </p>
            </div>
            <div className="flex items-center gap-2">
              <CreditEstimateBadge
                totalCredits={totalCredits}
                userBalance={userCreditBalance}
                warning={costWarning}
                onClick={() => setShowCreditDetails(!showCreditDetails)}
              />
            </div>
          </div>

          {/* Credit Details Popover */}
          {showCreditDetails && (
            <CreditDetailsPanel
              breakdown={creditBreakdown}
              totalCredits={totalCredits}
              userBalance={userCreditBalance}
              onClose={() => setShowCreditDetails(false)}
            />
          )}

          {/* Submit Bar */}
          <div className="flex items-center justify-between border-t border-border pt-3">
            <div className="flex items-center gap-3 text-meta">
              {selectedArray.length > 0 && (
                <>
                  <span className="text-primary font-bold">{selectedArray.length} tính năng đã chọn</span>
                  <Separator orientation="vertical" className="h-4" />
                  <span className={cn(
                    "font-bold",
                    costWarning === "danger" && "text-danger",
                    costWarning === "warning" && "text-warning-text",
                    costWarning === "safe" && "text-secondary-text"
                  )}>
                    {costWarning === "danger" && "⚠ Hết credit — "}
                    {costWarning === "warning" && "⚠ Sắp hết credit — "}
                    {formatCredits(totalCredits)} / {formatCredits(userCreditBalance)}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {onClose && (
                <Button variant="ghost" size="sm" onClick={onClose}>
                  Đóng
                </Button>
              )}
              <Button
                className="h-[44px] px-6"
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
              >
                {submitting ? "Đang tạo tác vụ…" : `Tạo ${featuresByModuleCount(moduleGroups, selectedArray)} tác vụ`}
              </Button>
            </div>
          </div>

          {submitError && (
            <div className="flex items-start gap-2 rounded-xl border-[1.5px] border-danger/30 bg-danger-bg px-3.5 py-2.5 text-meta font-medium text-danger">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span>{submitError}</span>
            </div>
          )}
        </div>

        {/* Auto-run Modules (M01, M04a) — Single Action Cards */}
        {autoRunModules.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {autoRunModules.map(group => (
              <AutoRunModuleCard
                key={group.module}
                group={group}
                depCheck={group.dependencyCheck}
                hasApprovedMasterImage={hasApprovedMasterImage}
              />
            ))}
          </div>
        )}

        {/* Selectable Modules — Accordion */}
        <div className="flex flex-col gap-3">
          {moduleGroups
            .filter(g => !g.isAutoRun)
            .map(group => (
              <ModuleAccordion
                key={group.module}
                group={group}
                depCheck={group.dependencyCheck}
                selectedFeatures={selectedFeatures}
                onToggleFeature={toggleFeature}
                isExpanded={expandedModules.has(group.module)}
                onToggleExpand={() => toggleModule(group.module)}
                userCapabilities={capabilities}
                depContext={depContext}
              />
            ))}
        </div>

        {/* Empty state */}
        {moduleGroups.filter(g => !g.isAutoRun).length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center text-text-muted">
            <HelpCircle size={32} className="mb-2 opacity-50" />
            <p className="font-medium">Chưa có tính năng nào sẵn sàng cho quyền của bạn</p>
            <p className="text-meta mt-1">Liên hệ quản trị để cấp quyền hoặc chờ triển khai module mới</p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function CreditEstimateBadge({
  totalCredits,
  userBalance,
  warning,
  onClick,
}: {
  totalCredits: number;
  userBalance: number;
  warning: "safe" | "warning" | "danger";
  onClick: () => void;
}) {
  const bgClass = warning === "danger" ? "bg-danger-bg" : 
                  warning === "warning" ? "bg-warning-bg" : "bg-success-bg";
  const textClass = warning === "danger" ? "text-danger" : 
                    warning === "warning" ? "text-warning-text" : "text-primary";

  return (
    <Button variant="ghost"
      type="button"
      onClick={onClick}
      className={cn("h-auto", "font-[inherit]", 
        "flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 transition-colors hover:opacity-80",
        bgClass,
        textClass
      )}
      aria-label="Xem chi tiết credit"
    >
      <Zap size={14} strokeWidth={2} />
      <span className="font-bold text-meta">{formatCredits(totalCredits)}</span>
      <span className="text-caption opacity-70">/ {formatCredits(userBalance)}</span>
      <Info size={12} strokeWidth={1.8} className="ml-0.5" />
    </Button>
  );
}

function CreditDetailsPanel({
  breakdown,
  totalCredits,
  userBalance,
  onClose,
}: {
  breakdown: Array<{ featureKey: string; featureLabel: string; estimatedCredits: number; breakdown?: string; confidence: "low" | "medium" | "high" }>;
  totalCredits: number;
  userBalance: number;
  onClose: () => void;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Chi tiết ước tính Credit"
      size="sm"
    >
      <div className="max-h-[60vh] overflow-y-auto p-4">
        <div className="flex flex-col gap-2">
          {breakdown.map((item) => (
            <div key={item.featureKey} className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-surface-alt">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-meta truncate">{item.featureLabel}</span>
                  <Badge tone="neutral" className="text-caption">
                    {item.confidence === "high" ? "🟢" : item.confidence === "medium" ? "🟡" : "🔴"}
                  </Badge>
                </div>
                {item.breakdown && (
                  <p className="mt-0.5 text-caption text-text-muted truncate">{item.breakdown}</p>
                )}
              </div>
              <span className="font-bold text-body-sm text-primary whitespace-nowrap">
                {formatCredits(item.estimatedCredits)}
              </span>
            </div>
          ))}
          <Separator className="my-2" />
          <div className="flex items-center justify-between text-body font-bold">
            <span>Tổng cộng</span>
            <span className="text-primary">{formatCredits(totalCredits)}</span>
          </div>
          <div className="flex items-center justify-between text-meta text-text-muted">
            <span>Số dư hiện tại</span>
            <span>{formatCredits(userBalance)}</span>
          </div>
          <div className="flex items-center justify-between text-meta font-medium">
            <span>Còn lại sau khi chạy</span>
            <span className={totalCredits > userBalance ? "text-danger" : "text-secondary-text"}>
              {formatCredits(Math.max(0, userBalance - totalCredits))}
            </span>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

function AutoRunModuleCard({
  group,
  depCheck,
  hasApprovedMasterImage,
  onRun,
}: {
  group: ModuleFeatureGroup;
  depCheck: { canRun: boolean; reason?: string };
  hasApprovedMasterImage: boolean;
  onRun?: () => void;
}) {
  const isM01 = group.module === "M01";
  const isM04a = group.module === "M04a";
  const label = isM01 ? "Phân tích ảnh sản phẩm" : "Tạo Master Image";
  const desc = isM01 
    ? "Nhận diện hoa, đếm cành, màu sắc, phong cách, gói/nơ — 1 lượt chạy"
    : "Tăng cường (Real-ESRGAN) + Identity Guard + Smart Reframe 4 tỷ lệ";
  const creditCost = isM01 ? 10 : 15;
  const capability = isM01 ? "H1" : "I1";

  return (
    <Card className={cn(
      "flex flex-col gap-3 p-4 border-border",
      !depCheck.canRun && "opacity-50"
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
            <Zap size={22} strokeWidth={1.8} className="text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-title-sm">{label}</h3>
            <p className="mt-0.5 text-meta text-text-muted">{desc}</p>
          </div>
        </div>
        <Badge tone={depCheck.canRun ? "neutral" : "warning"} className="text-caption">
          {depCheck.canRun ? "Sẵn sàng" : "Chờ điều kiện"}
        </Badge>
      </div>

      <div className="flex flex-col gap-2 text-meta text-text-muted border-t border-border pt-3">
        <div className="flex justify-between">
          <span>Chi phí ước tính</span>
          <span className="font-bold text-primary">{formatCredits(creditCost)}</span>
        </div>
        <div className="flex justify-between">
          <span>Quyền cần thiết</span>
          <span className="font-medium">{capability}</span>
        </div>
      </div>

      {!depCheck.canRun && depCheck.reason && (
        <div className="flex items-start gap-1.5 rounded-lg bg-warning-bg p-2.5 text-caption text-warning-text">
          <AlertCircle size={12} strokeWidth={1.8} className="mt-0.5 flex-shrink-0" />
          <span>{depCheck.reason}</span>
        </div>
      )}

      <Button
        className="w-full mt-2"
        disabled={!depCheck.canRun}
        variant={isM04a ? "secondary" : "primary"}
        onClick={onRun}
      >
        {isM01 ? "Bắt đầu phân tích" : "Tạo Master Image"}
      </Button>
    </Card>
  );
}

function ModuleAccordion({
  group,
  depCheck,
  selectedFeatures,
  onToggleFeature,
  isExpanded,
  onToggleExpand,
  userCapabilities,
  depContext,
}: {
  group: ModuleFeatureGroup;
  depCheck: { canRun: boolean; reason?: string };
  selectedFeatures: Set<string>;
  onToggleFeature: (feature: SubFeature) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  userCapabilities: string[];
  depContext: { hasApprovedAnalysis: boolean; hasApprovedMasterImage: boolean; hasCustomerConsent: boolean };
}) {
  const visibleFeatures = getVisibleFeaturesByModule(group.module);
  const selectedCount = visibleFeatures.filter(f => selectedFeatures.has(f.key)).length;

return (
      <Card className={cn("border-border", !depCheck.canRun && "opacity-50")}>
        <Button variant="ghost" type="button"
          aria-expanded={isExpanded}
          className="text-[length:inherit] h-auto justify-start font-[inherit] gap-0 flex w-full flex-row items-center justify-between p-3 text-left cursor-pointer"
          onClick={onToggleExpand}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-alt">
              <Zap size={20} strokeWidth={1.8} className="text-primary" />
            </div>
            <div>
              <h3 className="text-title-sm font-bold">{group.label}</h3>
              <span className="block text-caption text-text-muted">{group.description}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={depCheck.canRun ? "neutral" : "warning"} className="text-caption">
              {depCheck.canRun ? "Sẵn sàng" : "Chờ điều kiện"}
            </Badge>
            {selectedCount > 0 && (
              <Badge tone="accent" className="text-caption">
                {selectedCount}/{visibleFeatures.length}
              </Badge>
            )}
            <ChevronDown 
              size={16} 
              strokeWidth={2} 
              className={cn("text-text-muted transition-transform", isExpanded && "rotate-180")}
            />
          </div>
        </Button>

        {isExpanded && (
          <div className="pt-0 pb-4">
          {!depCheck.canRun && depCheck.reason && (
            <div className="mb-3 flex items-start gap-1.5 rounded-lg bg-warning-bg p-2.5 text-caption text-warning-text">
              <AlertCircle size={12} strokeWidth={1.8} className="mt-0.5 flex-shrink-0" />
              <span>{depCheck.reason}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {visibleFeatures.map(feature => (
              <FeatureCard
                key={feature.key}
                feature={feature}
                isSelected={selectedFeatures.has(feature.key)}
                onToggle={onToggleFeature}
                depCheck={checkFeatureDependencies(feature, depContext)}
                userCanRun={!feature.rbacRun || userCapabilities.includes(feature.rbacRun)}
              />
            ))}
          </div>

          {visibleFeatures.length === 0 && (
            <div className="py-4 text-center text-meta text-text-muted">
              Tất cả tính năng của module này đang phát triển (coming soon)
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function FeatureCard({
  feature,
  isSelected,
  onToggle,
  depCheck,
  userCanRun,
}: {
  feature: SubFeature;
  isSelected: boolean;
  onToggle: (feature: SubFeature) => void;
  depCheck: { canRun: boolean; reason?: string };
  userCanRun: boolean;
}) {
  const enabled = userCanRun && depCheck.canRun;
  const showTooltip = !enabled || feature.status === "coming_soon";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <label className={cn(
            "feature-card relative flex flex-col gap-2 rounded-xl border p-3 transition-all",
            "border-border bg-surface",
            isSelected && "border-primary bg-primary/5",
            !enabled && "opacity-40 cursor-not-allowed",
            feature.status === "coming_soon" && "border-dashed"
          )}>
            <div className="flex items-start gap-2.5">
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => enabled && onToggle(feature)}
                disabled={!enabled}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-semibold text-meta truncate">{feature.label}</h4>
                  {feature.status === "coming_soon" && (
                    <Badge tone="warning" className="text-caption h-4 px-1.5">
                      Sắp có
                    </Badge>
                  )}
                  {feature.needsApproval && (
                    <Badge tone="danger" className="text-caption h-4 px-1.5">
                      Cần duyệt
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-caption text-text-muted line-clamp-2">{feature.description}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge tone="neutral" className="text-caption h-4 px-1.5">
                    {feature.aiCapability}
                  </Badge>
                  <Badge tone="neutral" className={cn("text-caption h-4 px-1.5", 
                    feature.privacyFloor === "SENSITIVE" && "border-danger/30 text-danger",
                    feature.privacyFloor === "SHOP" && "border-warning/30 text-warning-text",
                    feature.privacyFloor === "PUBLIC" && "border-success/30 text-success"
                  )}>
                    {feature.privacyFloor}
                  </Badge>
                  {feature.creditCost && (
                    <Badge tone="accent" className="text-caption h-4 px-1.5">
                      ~{feature.creditCost} cr
                    </Badge>
                  )}
                  {feature.requiresApprovedInput && (
                    <Badge tone="neutral" className="text-caption h-4 px-1.5">
                      Cần: {feature.requiresApprovedInput}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {!enabled && depCheck.reason && (
              <div className="absolute bottom-full left-0 right-0 mb-1.5 px-2.5 py-1.5 rounded-lg bg-warning-bg text-caption text-warning-text text-center">
                {depCheck.reason}
              </div>
            )}
          </label>
        </TooltipTrigger>
        {showTooltip && (
          <TooltipContent side="top" align="center" className="max-w-xs p-2.5 text-caption">
            {!userCanRun && <p>❌ Bạn thiếu quyền: <code className="font-mono">{feature.rbacRun}</code></p>}
            {!depCheck.canRun && depCheck.reason && <p>⏸ {depCheck.reason}</p>}
            {feature.status === "coming_soon" && <p>🚧 Tính năng đang phát triển, chưa thể sử dụng</p>}
            {feature.creditCost && <p>💰 Chi phí ước tính: {feature.creditCost} credits (D14 placeholder)</p>}
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

function featuresByModuleCount(groups: ModuleFeatureGroup[], selected: string[]): number {
  const modules = new Set<string>();
  for (const key of selected) {
    const f = FEATURE_CATALOG.find(x => x.key === key);
    if (f) modules.add(f.module);
  }
  return modules.size;
}
