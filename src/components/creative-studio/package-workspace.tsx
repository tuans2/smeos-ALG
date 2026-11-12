"use client"
/**
 * PackageWorkspace — Khu vực F (Chặng 07 PACKAGE → 08 QA → 09 APPROVE, rồi 10–14).
 *
 * 23/09/2026 — viết lại trên dữ liệu thật. Bản trước: tài sản luôn "READY",
 * QA là bốn hằng "PASSED 99.9%", duyệt chỉ đổi state trình duyệt, bài đăng mẫu
 * gõ cứng. Nay:
 *   07 — gói lưu ở bảng `campaign_packages`, chỉ giữ ĐỊNH DANH tài sản thật
 *        (biến thể của đúng Master, video job, audio job) + bài đăng người dùng soạn.
 *   08 — QA chạy phía máy chủ (`POST /packages/:id/qa`), năm trục, số đo thật.
 *   09 — duyệt qua endpoint riêng (`J5`), ghi `audit_logs` cùng giao dịch.
 *   10–14 — `<PackageDownstreamCard />` đọc số liệu thật (`/performance`).
 */

import { formatDateTime } from "@/lib/i18n/formatters"
import React from "react"
import { AlertTriangle } from "@/components/ui/icon-set/alert-triangle"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { RefreshCw } from "@/components/ui/icon-set/refresh-cw"
import { Save } from "@/components/ui/icon-set/save"
import { ShieldCheck } from "@/components/ui/icon-set/shield-check"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { PackageQACard } from "./package-qa-card"
import { PackageDownstreamCard } from "./package-downstream-card"
import { PackageReviewSection } from "./package-review-section"
import { PackageCreateCard } from "./package-create-card"
import { PackagePostsSection } from "./package-posts-section"
import { samePosts } from "./package-client"
import { CHANNELS, STATUS_LABEL } from "./package-workspace-model"
import { usePackageWorkspace } from "./use-package-workspace"

export function PackageWorkspace() {
  const {
    ctx,
    masterId,
    resolving,
    pkg,
    loadDraftFrom,
    marketing,
    videoJobs,
    busy,
    error,
    acknowledge,
    setAcknowledge,
    scenePlan,
    planRef,
    setAssetsNonce,
    bDraft,
    selectedVariants,
    setSelectedVariants,
    videoJobIds,
    audioJobId,
    setAudioJobId,
    posts,
    setPosts,
    draftPosts,
    planRatios,
    multiRatio,
    activeRatio,
    activeVideoId,
    setActiveVideo,
    ratioOfVideo,
    handlePromote,
    producedScenes,
    suggestedVideos,
    urlVideoJobId,
    urlAudioJobId,
    handleCreate,
    handleSave,
    applyRevision,
    onSceneRevised,
    rewriteText,
    setRewriteText,
    rewriteBusy,
    rewriteMsg,
    rewritePost,
    handleQa,
    handleApprove,
    approved,
    dirty,
    applyBDraft,
    goRework,
    refreshPackage,
    setVideoRatioTab,
  } = usePackageWorkspace()

  // ── Trạng thái tải / thiếu Master ─────────────────────────────────────────
  if (resolving) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-body-sm text-text-muted">
        <Loader2 size={16} className="animate-spin motion-reduce:animate-none" /> Đang tải gói chiến dịch...
      </div>
    )
  }

  if (!masterId) {
    return (
      <Card className="w-full max-w-3xl mx-auto p-6 space-y-3">
        <h3 className="text-title-sm font-bold text-text">Cần Master Image đã duyệt trước khi đóng gói</h3>
        <p className="text-body-sm text-text-muted">
          Gói chiến dịch neo vào Master Image đã duyệt (cổng 2). Bạn có thể dùng ngay ảnh gốc từ Tải &amp; chọn ảnh làm
          Master (không chỉnh sửa ảnh), hoặc tối ưu ảnh trước ở Tải ảnh.
        </p>
        {ctx?.assetId ? (
          <Button onClick={handlePromote} disabled={busy !== null} className="gap-2">
            {busy === "promote" ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" /> : <CheckCircle2 size={14} />}
            Skip — Dùng ảnh gốc làm Master (I2)
          </Button>
        ) : (
          <p className="text-body-sm text-danger">Chưa có ảnh sản phẩm — bắt đầu ở Tải &amp; chọn ảnh.</p>
        )}
        {error && <p className="text-meta text-danger">{error}</p>}
      </Card>
    )
  }

  if (!pkg) {
    return (
      <PackageCreateCard
        producedScenes={producedScenes}
        multiRatio={multiRatio}
        planRatios={planRatios}
        suggestedVideos={suggestedVideos}
        urlAudioJobId={urlAudioJobId}
        bDraft={bDraft}
        goRework={goRework}
        handleCreate={handleCreate}
        busy={busy}
        error={error}
      />
    )
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Tiêu đề + trạng thái */}
      <Card className="p-5 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-caption font-bold uppercase tracking-wider text-primary">Chiến dịch — Gói chiến dịch</div>
          <h3 className="text-title font-bold text-text">{pkg.name}</h3>
          <p className="text-meta text-text-muted">
            Mode {pkg.mode} · Master #{pkg.master_asset_id.slice(0, 8)}
            {pkg.topic ? ` · Chủ đề: ${pkg.topic.title}` : ""}
          </p>
        </div>
        <Badge
          tone={approved ? "success" : pkg.status === "QA_REJECTED" ? "danger" : pkg.status === "QA_NEEDS_REVIEW" ? "warning" : "neutral"}
          className="text-caption px-3 py-1 font-bold"
        >
          {STATUS_LABEL[pkg.status]}
        </Badge>
      </Card>

      {error && (
        <div className="rounded-xl border border-danger bg-danger-bg px-4 py-3 text-body-sm text-danger flex items-start gap-2">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {/* ── Chặng 07 — PACKAGE ── */}
      <Card className="p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h4 className="text-body font-bold text-text">Chặng 07 — Chọn tài sản & bài đăng</h4>
          {!approved && (
            <Button size="sm" onClick={handleSave} disabled={!dirty || busy !== null} className="gap-1.5">
              {busy === "save" ? <Loader2 size={13} className="animate-spin motion-reduce:animate-none" /> : <Save size={13} />}
              Lưu gói
            </Button>
          )}
        </div>

        {multiRatio && (
          <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Video theo khung">
            <span className="mr-1 text-caption font-bold uppercase tracking-wider text-text-muted">Video theo khung:</span>
            {planRatios.map((r) => {
              const has = videoJobIds.some((id) => ratioOfVideo(id) === r)
              return (
                <Button
                  key={r}
                  type="button"
                  role="tab"
                  aria-selected={r === activeRatio}
                  variant={r === activeRatio ? "primary" : "outline"}
                  size="xs"
                  onClick={() => setVideoRatioTab(r)}
                  className="text-caption font-bold"
                >
                  {r} · {has ? "có video" : "chưa có"}
                </Button>
              )
            })}
          </div>
        )}

        <PackageReviewSection
          pkg={pkg}
          approved={approved}
          scenePlan={scenePlan}
          planRef={planRef}
          marketing={marketing}
          selectedVariants={selectedVariants}
          setSelectedVariants={setSelectedVariants}
          videoJobs={multiRatio ? videoJobs.filter((v) => v.aspect_ratio === activeRatio) : videoJobs}
          videoJobId={activeVideoId}
          setVideoJobId={setActiveVideo}
          audioJobId={audioJobId}
          setAudioJobId={setAudioJobId}
          urlVideoJobId={urlVideoJobId}
          urlAudioJobId={urlAudioJobId}
          onAssetsChanged={() => setAssetsNonce((n) => n + 1)}
          onPackageRefresh={refreshPackage}
          onRework={goRework}
          masterAssetId={masterId}
          productName={ctx?.productName ?? ""}
          colors={ctx?.commercialPassport?.colors ?? []}
          topicTitle={ctx?.selectedTopic?.title ?? pkg.topic?.title ?? ""}
          angleCategory={ctx?.selectedTopic?.angleCategory}
          mode={(ctx?.mode ?? "CREATIVE") as "CREATIVE" | "AUTHENTIC"}
          onSceneRevised={onSceneRevised}
          onApply={applyRevision}
        />

        <PackagePostsSection
          approved={approved}
          goRework={goRework}
          bDraft={bDraft}
          draftPosts={draftPosts}
          samePosts={samePosts}
          applyBDraft={applyBDraft}
          channels={CHANNELS}
          posts={posts}
          setPosts={setPosts}
          rewriteText={rewriteText}
          setRewriteText={setRewriteText}
          rewriteBusy={rewriteBusy}
          rewritePost={rewritePost}
          rewriteMsg={rewriteMsg}
        />
      </Card>

      {/* ── Chặng 08 — QA ── */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-body font-bold text-text flex items-center gap-2">
            <ShieldCheck size={16} /> Chặng 08 — Kiểm định QA (chạy phía máy chủ)
          </h4>
          {!approved && (
            <Button size="sm" variant="outline" onClick={handleQa} disabled={dirty || busy !== null} className="gap-1.5">
              {busy === "qa" ? <Loader2 size={13} className="animate-spin motion-reduce:animate-none" /> : <RefreshCw size={13} />}
              {pkg.qa_report ? "Chạy lại QA" : "Chạy QA"}
            </Button>
          )}
        </div>
        {dirty && <p className="text-meta text-warning-text">Có thay đổi chưa lưu — lưu gói trước khi chạy QA.</p>}
        {pkg.qa_report ? (
          <PackageQACard report={pkg.qa_report} />
        ) : (
          <p className="text-meta text-text-muted">Chưa chạy QA cho phiên bản gói hiện tại.</p>
        )}
      </Card>

      {/* ── Chặng 09 — APPROVE ── */}
      <Card className="p-5 space-y-3">
        <h4 className="text-body font-bold text-text">Chặng 09 — Chủ shop duyệt chốt</h4>
        {approved ? (
          <p className="text-body-sm text-success flex items-center gap-2">
            <CheckCircle2 size={15} /> Đã duyệt lúc {formatDateTime(pkg.approved_at)} — đã ghi nhật ký kiểm toán.
          </p>
        ) : (
          <>
            {pkg.status === "QA_NEEDS_REVIEW" && (
              <label className="flex items-start gap-2 text-meta cursor-pointer">
                <Checkbox checked={acknowledge} onCheckedChange={(val) => setAcknowledge(!!val)} />
                Tôi đã xem các cảnh báo QA ở trên và chấp nhận đăng gói này.
              </label>
            )}
            <Button
              onClick={handleApprove}
              disabled={
                busy !== null ||
                dirty ||
                !(pkg.status === "QA_PASSED" || (pkg.status === "QA_NEEDS_REVIEW" && acknowledge))
              }
              className="gap-2"
            >
              {busy === "approve" ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" /> : <CheckCircle2 size={14} />}
              Duyệt chốt gói chiến dịch (J5)
            </Button>
            <p className="text-caption text-text-muted">
              Chỉ duyệt được sau khi QA đạt, hoặc QA cần xem lại và bạn đã xác nhận. QA từ chối thì phải sửa rồi chạy lại.
            </p>
          </>
        )}
      </Card>

      {approved && <PackageDownstreamCard pkg={pkg} onUpdated={loadDraftFrom} />}
    </div>
  )
}
