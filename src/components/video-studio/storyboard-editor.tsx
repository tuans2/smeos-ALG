"use client";

import React, { useEffect, useState } from "react";
import { Clock } from "@/components/ui/icon-set/clock"
import { Plus } from "@/components/ui/icon-set/plus"
import { Trash2 } from "@/components/ui/icon-set/trash2"
import { AlertTriangle } from "@/components/ui/icon-set/alert-triangle"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Check } from "@/components/ui/icon-set/check"
import { Image as ImageIcon } from "@/components/ui/icon-set/image"
;
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { VideoSceneItem, VideoFormat, VIDEO_FORMAT_SPECS, VideoMotionEffect, VIDEO_MOTION_SPECS } from "@/modules/video-studio/domain/video-types";
import { validateStoryboard } from "@/modules/video-studio/domain/video-storyboard";


const DEFAULT_MOTIONS: VideoMotionEffect[] = ["ZOOM_IN", "PAN_RIGHT", "ZOOM_OUT", "PAN_UP"];

interface StoryboardEditorProps {
  format: VideoFormat;
  initialScenes: VideoSceneItem[];
  isLocked?: boolean;
  onSaveScenes: (scenes: VideoSceneItem[]) => Promise<void>;
  /** Báo mọi thay đổi cho cha (23/09/2026) — Creative Studio Khu vực E gửi
   *  đúng storyboard đang thấy, không phải bản cũ trước khi bấm "Lưu". */
  onChange?: ((scenes: VideoSceneItem[]) => void) | undefined;
}

export function StoryboardEditor({
  format,
  initialScenes,
  isLocked = false,
  onSaveScenes,
  onChange,
}: StoryboardEditorProps) {
  const [scenes, setScenes] = useState<VideoSceneItem[]>(
    initialScenes.length > 0
      ? initialScenes
      : [
          {
            sceneIndex: 1,
            durationSeconds: 3.5,
            textOverlay: "Sản phẩm ngát hương đón ngày mới",
            voiceScript: "Mỗi đóa hoa được chọn lựa thủ công từ sáng sớm",
            transitionEffect: "fade",
            motionEffect: "ZOOM_IN",
          },
          {
            sceneIndex: 2,
            durationSeconds: 3.5,
            textOverlay: "Nghệ thuật chế tác tỉ mỉ",
            voiceScript: "Thiết kế sang trọng phù hợp mọi dịp kỷ niệm",
            transitionEffect: "slide_left",
            motionEffect: "PAN_RIGHT",
          },
          {
            sceneIndex: 3,
            durationSeconds: 4.0,
            textOverlay: "Nhắn tiệm để đặt hoa",
            voiceScript: "Nhắn tiệm để đặt hoa hôm nay",
            transitionEffect: "fade",
            motionEffect: "ZOOM_OUT",
          },
        ]
  );
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    onChange?.(scenes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenes]);

  const spec = VIDEO_FORMAT_SPECS[format];
  const validation = validateStoryboard(scenes, format);

  const handleUpdateScene = <K extends keyof VideoSceneItem>(
    index: number,
    field: K,
    value: VideoSceneItem[K]
  ) => {
    if (isLocked) return;
    setSavedSuccess(false);
    const updated = [...scenes];
    updated[index] = { ...updated[index]!, [field]: value };
    // Phụ đề = lời thoại (PO 24/09/2026).
    updated[index] = { ...updated[index]!, textOverlay: updated[index]!.voiceScript ?? "" };
    setScenes(updated);
  };

  const handleAddScene = () => {
    if (isLocked) return;
    setSavedSuccess(false);
    const newCount = scenes.length + 1;
    const target = spec?.targetDurationSeconds || 30;
    const perSec = Math.max(1.5, Math.round((target / newCount) * 10) / 10);
    const updated = scenes.map((s) => ({ ...s, durationSeconds: perSec }));
    setScenes([
      ...updated,
      {
        sceneIndex: newCount,
        durationSeconds: Math.max(1.0, Math.round((target - perSec * (newCount - 1)) * 10) / 10),
        textOverlay: "Phân cảnh mới",
        voiceScript: "Lời thoại mô tả nét đẹp của hoa",
        transitionEffect: "fade",
        motionEffect: DEFAULT_MOTIONS[(newCount - 1) % DEFAULT_MOTIONS.length]!,
      },
    ]);
  };

  const handleRemoveScene = (index: number) => {
    if (isLocked || scenes.length <= 1) return;
    setSavedSuccess(false);
    const filtered = scenes.filter((_, idx) => idx !== index);
    const newCount = filtered.length;
    const target = spec?.targetDurationSeconds || 30;
    const perSec = Math.max(1.5, Math.round((target / newCount) * 10) / 10);
    setScenes(
      filtered.map((s, idx) => ({
        ...s,
        sceneIndex: idx + 1,
        durationSeconds:
          idx === newCount - 1
            ? Math.max(1.0, Math.round((target - perSec * (newCount - 1)) * 10) / 10)
            : perSec,
      }))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveScenes(scenes);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header trạng thái kịch bản */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-4 rounded-xl border border-border">
        <div>
          <h3 className="text-title-sm font-bold text-text">Kịch bản phân cảnh chi tiết (Storyboard)</h3>
          <p className="text-caption text-text-muted mt-0.5">
            Phân rã trường nguyên tử: chỉnh sửa độc lập văn bản, phụ đề, thời lượng và hiệu ứng từng cảnh.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={validation.isValid ? "success" : "warning"} className="gap-1">
            <Clock size={12} />
            Tổng thời lượng: {validation.totalDurationSeconds}s / {spec?.targetDurationSeconds}s
          </Badge>
          <Badge tone="neutral">{scenes.length} phân cảnh</Badge>
        </div>
      </div>

      {/* Cảnh báo nếu kịch bản chưa hợp lệ */}
      {!validation.isValid && (
        <div className="flex items-start gap-2 bg-warning/10 border border-warning/30 text-text rounded-lg p-3 text-caption">
          <AlertTriangle size={15} className="shrink-0 mt-0.5 text-warning-text" />
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold">Cần điều chỉnh kịch bản:</span>
            {validation.errors.map((err, i) => (
              <span key={i}>• {err}</span>
            ))}
          </div>
        </div>
      )}

      {/* Danh sách các cảnh */}
      <div className="flex flex-col gap-3">
        {scenes.map((scene, idx) => (
          <Card key={idx} className="border border-border p-4 bg-surface flex flex-col gap-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-caption font-bold text-primary">
                  #{idx + 1}
                </span>
                <span className="text-caption font-bold text-text">Phân cảnh {idx + 1}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-caption">
                  <Clock size={12} className="text-text-muted" />
                  <Input
                    type="number"
                    step="0.5"
                    min="1"
                    max="15"
                    disabled={isLocked}
                    value={scene.durationSeconds}
                    onChange={(e) => handleUpdateScene(idx, "durationSeconds", parseFloat(e.target.value) || 1.0)}
                    className="w-16 h-7 text-caption text-center font-bold"
                  />
                  <span className="text-text-muted">giây</span>
                </div>
                {!isLocked && scenes.length > 1 && (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => handleRemoveScene(idx)}
                    className="h-7 px-2 text-caption gap-1"
                    title={`Xóa phân cảnh #${idx + 1}`}
                  >
                    <Trash2 size={13} />
                    <span>Xóa cảnh</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Ảnh phân cảnh — ảnh THẬT của sản phẩm (biến thể Khu vực D hoặc Master
                Image), gắn theo mã asset. 24/09/2026: bỏ ảnh mẫu Unsplash và ô
                "Chọn sản phẩm" — ảnh đó không phải sản phẩm của tiệm mà vẫn được
                đưa vào video. */}
            <div className="flex items-center gap-3 bg-surface-alt/60 p-2.5 rounded-lg border border-border">
              <div className="relative aspect-[9/16] w-12 shrink-0 rounded-md overflow-hidden bg-black/5 border border-border shadow-xs flex items-center justify-center">
                {scene.imageUrl ? (
                  <img src={scene.imageUrl} alt={`Phân cảnh ${idx + 1}`} className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon size={16} className="text-text-muted" />
                )}
              </div>
              <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                <label className="text-caption font-bold text-text flex items-center gap-1.5">
                  <ImageIcon size={13} className="text-primary" /> Hình ảnh phân cảnh
                </label>
                <span className="text-caption text-text-muted truncate">
                  {scene.imageAssetId
                    ? `Ảnh sản phẩm trong kho · asset ${String(scene.imageAssetId).slice(0, 8)}`
                    : "Chưa có ảnh — sinh ảnh cảnh này ở Khu vực D (biến thể theo kịch bản)"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Phụ đề = lời thoại (PO 24/09/2026) — không nhập riêng */}
              <div>
                <label className="text-caption font-semibold text-text-muted block mb-1">
                  Phụ đề
                </label>
                <p className="rounded-md border border-dashed border-border px-3 py-1.5 text-caption text-text-muted">
                  Luôn giống lời thoại bên dưới — sửa lời thoại là sửa phụ đề.
                </p>
              </div>

              {/* Chuyển động máy quay điện ảnh */}
              <div>
                <label className="text-caption font-semibold text-text-muted block mb-1">
                  Chuyển động máy quay (Camera)
                </label>
                <NativeSelect
                  disabled={isLocked}
                  value={scene.motionEffect || "ZOOM_IN"}
                  onChange={(e) => handleUpdateScene(idx, "motionEffect", e.target.value as VideoMotionEffect)}
                  className="w-full text-caption font-semibold"
                >
                  {Object.values(VIDEO_MOTION_SPECS).map((m) => (
                    <option key={m.motion} value={m.motion}>
                      🎬 {m.label}
                    </option>
                  ))}
                </NativeSelect>
              </div>

              {/* Hiệu ứng chuyển cảnh */}
              <div>
                <label className="text-caption font-semibold text-text-muted block mb-1">
                  Chuyển cảnh (Transition)
                </label>
                <NativeSelect
                  disabled={isLocked}
                  value={scene.transitionEffect || "fade"}
                  onChange={(e) => handleUpdateScene(idx, "transitionEffect", e.target.value as VideoSceneItem["transitionEffect"])}
                  className="w-full text-caption"
                >
                  <option value="fade">Mờ dần (Fade)</option>
                  <option value="slide_left">Trượt trái (Slide Left)</option>
                  <option value="slide_right">Trượt phải (Slide Right)</option>
                  <option value="zoom_in">Phóng to (Zoom In)</option>
                  <option value="zoom_out">Thu nhỏ (Zoom Out)</option>
                  <option value="dissolve">Hòa tan (Dissolve)</option>
                </NativeSelect>
              </div>

              {/* Lời thoại đọc voiceover */}
              <div className="md:col-span-3">
                <label className="text-caption font-semibold text-text-muted block mb-1">
                  Lời thoại lồng tiếng AI (Voiceover Script)
                </label>
                <Textarea
                  rows={2}
                  disabled={isLocked}
                  value={scene.voiceScript || ""}
                  onChange={(e) => handleUpdateScene(idx, "voiceScript", e.target.value)}
                  placeholder="Nhập kịch bản cho giọng đọc AI..."
                  className="text-caption resize-none leading-relaxed"
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Thanh tác vụ dưới kịch bản */}
      <div className="flex items-center justify-between pt-2">
        {!isLocked && (
          <Button variant="secondary" size="sm" onClick={handleAddScene} className="gap-1.5">
            <Plus size={14} /> Thêm phân cảnh
          </Button>
        )}
        <div className="flex items-center gap-2 ml-auto">
          {savedSuccess && (
            <span className="text-caption font-semibold text-success flex items-center gap-1">
              <Check size={14} /> Đã lưu kịch bản
            </span>
          )}
          {!isLocked && (
            <Button size="sm" onClick={handleSave} disabled={saving || !validation.isValid} className="gap-1.5">
              <Sparkles size={14} />
              {saving ? "Đang lưu..." : "Lưu kịch bản"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
