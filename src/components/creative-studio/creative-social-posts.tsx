"use client"

import { useState } from "react"
import { Check } from "@/components/ui/icon-set/check"
import { Copy } from "@/components/ui/icon-set/copy"
import { Edit3 } from "@/components/ui/icon-set/edit3"
import { Eye } from "@/components/ui/icon-set/eye"
import { FileText } from "@/components/ui/icon-set/file-text"
import { Grid } from "@/components/ui/icon-set/grid"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export type PlatformKey = "facebook" | "instagram" | "tiktok" | "zalo"

export interface FullPostRecord {
  platform: PlatformKey
  platformLabel: string
  icon: string
  characterCount: number
  targetAudience: string
  recommendedPostingTime: string
  hashtags: string[]
  content: string
}

export function CreativeSocialPosts({
  fullPosts,
  editedContent,
  editingPlatform,
  setEditingPlatform,
  handleUpdateContent,
  handleCopy,
  copiedKey,
  handleCopyAllHashtags,
  platforms,
  platformLabels,
}: {
  fullPosts: Record<PlatformKey, FullPostRecord>
  editedContent: Record<PlatformKey, string>
  editingPlatform: PlatformKey | null
  setEditingPlatform: (p: PlatformKey | null) => void
  handleUpdateContent: (platform: PlatformKey, val: string) => void
  handleCopy: (text: string, key: string) => void
  copiedKey: string | null
  handleCopyAllHashtags: () => void
  platforms: PlatformKey[]
  platformLabels: Record<PlatformKey, { label: string; icon: string; bgActive: string }>
}) {
  const [viewMode, setViewMode] = useState<"tabbed" | "grid">("tabbed")
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformKey>("facebook")

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 space-y-4 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-primary" />
          <div>
            <h4 className="text-body-sm font-bold text-text">
              2. Bài viết mạng xã hội hoàn chỉnh đa kênh (Facebook, Instagram, TikTok, Zalo)
            </h4>
            <p className="text-caption text-text-muted">
              Nội dung đã được biên soạn và tối ưu cấu trúc riêng biệt cho từng nền tảng bán hoa.
            </p>
          </div>
        </div>

        {/* Toggle View Mode: Tabbed vs Grid */}
        <div className="flex items-center gap-1.5 self-start sm:self-center">
          <Button
            type="button"
            variant={viewMode === "tabbed" ? "primary" : "outline"}
            size="xs"
            onClick={() => setViewMode("tabbed")}
            className="text-caption font-bold gap-1"
          >
            <Eye size={12} /> Xem từng kênh
          </Button>
          <Button
            type="button"
            variant={viewMode === "grid" ? "primary" : "outline"}
            size="xs"
            onClick={() => setViewMode("grid")}
            className="text-caption font-bold gap-1"
          >
            <Grid size={12} /> Xem cả 4 kênh
          </Button>
        </div>
      </div>

      {/* Platform Switcher Tabs (khi ở chế độ tabbed) */}
      {viewMode === "tabbed" && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {platforms.map((p) => {
            const info = platformLabels[p]
            const isSelected = selectedPlatform === p
            return (
              <Button
                key={p}
                type="button"
                variant={isSelected ? "primary" : "outline"}
                size="xs"
                onClick={() => setSelectedPlatform(p)}
                className={`text-caption font-bold gap-2 shrink-0 ${isSelected ? info.bgActive : ""}`}
              >
                <span className="text-body-sm">{info.icon}</span>
                <span>{info.label}</span>
              </Button>
            )
          })}
        </div>
      )}

      {/* Danh sách bài viết theo ViewMode */}
      <div
        className={
          viewMode === "grid"
            ? "grid grid-cols-1 md:grid-cols-2 gap-4"
            : "space-y-4"
        }
      >
        {(viewMode === "grid" ? platforms : [selectedPlatform]).map((platform) => {
          const post = fullPosts[platform]
          if (!post) return null
          const content = editedContent[platform] ?? post.content
          const isEditing = editingPlatform === platform
          const copyKey = `post-${platform}`

          return (
            <div
              key={platform}
              className="rounded-xl border border-border bg-surface-alt/60 p-4 space-y-3 flex flex-col justify-between transition-all hover:border-border-hover"
            >
              {/* Header thẻ bài viết */}
              <div className="space-y-2 border-b border-border/80 pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-title-sm">{post.icon}</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-caption font-bold text-text">{post.platformLabel}</span>
                        <span className="text-caption text-primary font-bold bg-primary/10 px-1.5 py-0.2 rounded-full border border-primary/20">
                          ✓ Đã tối ưu
                        </span>
                      </div>
                      <span className="text-caption text-text-muted block">
                        Khung giờ vàng: <strong className="text-text">{post.recommendedPostingTime}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingPlatform(isEditing ? null : platform)}
                      className="text-text-muted hover:text-text text-caption font-semibold h-7 px-2 gap-1"
                    >
                      <Edit3 size={12} />
                      {isEditing ? "Đóng sửa" : "Chỉnh sửa"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(content, copyKey)}
                      className="text-caption font-bold gap-1 h-7 px-2.5 bg-surface shadow-2xs hover:bg-success/10 hover:text-success hover:border-success/30"
                    >
                      {copiedKey === copyKey ? (
                        <><Check size={12} className="text-success" /> Đã sao chép</>
                      ) : (
                        <><Copy size={12} /> Sao chép bài</>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-caption text-text-muted flex-wrap">
                  <span className="bg-surface px-2 py-0.5 rounded border border-border">
                    {post.characterCount} ký tự
                  </span>
                  <span className="bg-surface px-2 py-0.5 rounded border border-border truncate max-w-xs">
                    {post.targetAudience}
                  </span>
                </div>
              </div>

              {/* Body bài viết (Social Post Preview) */}
              <div className="rounded-lg bg-surface p-3.5 border border-border text-caption text-text shadow-2xs leading-relaxed">
                {isEditing ? (
                  <div className="space-y-2">
                    <Textarea
                      value={content}
                      onChange={(e) => handleUpdateContent(platform, e.target.value)}
                      rows={12}
                      className="w-full text-caption text-text font-mono"
                    />
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setEditingPlatform(null)}
                        className="bg-success hover:bg-success-text text-white text-caption font-bold h-7 px-3"
                      >
                        <Check size={12} className="mr-1" /> Lưu chỉnh sửa
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="whitespace-pre-line font-sans text-text space-y-1">
                    {content}
                  </div>
                )}
              </div>

              {/* Footer thẻ: Hashtags */}
              {post.hashtags.length > 0 && (
                <div className="pt-2 flex flex-wrap gap-1">
                  {Array.from(new Set(post.hashtags)).map((tag, tagIdx) => (
                    <span
                      key={`${platform}-${tag}-${tagIdx}`}
                      className="inline-block px-2 py-0.5 rounded-full bg-surface-alt text-text-muted text-caption font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Nút sao chép toàn bộ tất cả bài viết */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-border/60 text-caption text-text-muted">
        <span>💡 Bạn có thể nhấp <strong>“Sao chép bài”</strong> ở từng kênh để dán trực tiếp lên Facebook Fanpage, TikTok Shop hoặc Zalo OA.</span>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={handleCopyAllHashtags}
          className="text-caption font-bold text-primary hover:text-primary-dark flex items-center gap-1 transition shrink-0 p-0 h-auto"
        >
          {copiedKey === "all-hashtags" ? "✓ Đã sao chép tất cả hashtags" : "Sao chép tất cả hashtags →"}
        </Button>
      </div>
    </div>
  )
}
