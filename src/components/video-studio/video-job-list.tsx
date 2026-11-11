"use client";

import React from "react";
import { Film } from "@/components/ui/icon-set/film"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Clock } from "@/components/ui/icon-set/clock"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { ChevronRight } from "@/components/ui/icon-set/chevron-right"
;
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VIDEO_FORMAT_SPECS, VideoFormat } from "@/modules/video-studio/domain/video-types";

export interface VideoJobSummary {
  id: string;
  title: string;
  format: VideoFormat;
  stage: string;
  script_approval: "PENDING" | "APPROVED" | "REJECTED";
  video_approval: "PENDING" | "APPROVED" | "REJECTED";
  duration_seconds: number;
  cost_credits: number;
  final_video_url?: string | null;
  created_at: string;
}

interface VideoJobListProps {
  jobs: VideoJobSummary[];
  loading: boolean;
  onSelectJob: (id: string) => void;
  onCreateNew: () => void;
}

export function VideoJobList({
  jobs,
  loading,
  onSelectJob,
  onCreateNew,
}: VideoJobListProps) {
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-text-muted">
          <Clock className="h-6 w-6 animate-spin motion-reduce:animate-none text-primary" />
          <span className="text-body-sm">Đang tải danh sách video...</span>
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-4 border-dashed border-2 border-border p-12 text-center bg-surface-alt">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Film size={28} />
        </div>
        <div>
          <h3 className="text-title-sm font-bold text-text">Chưa có video marketing nào</h3>
          <p className="mt-1 text-body-sm text-text-muted max-w-sm">
            Bắt đầu tạo video ngắn đầu tiên từ Master Image sản phẩm để quảng bá trên Reel, TikTok hoặc Slideshow.
          </p>
        </div>
        <Button onClick={onCreateNew} className="gap-2">
          <Sparkles size={16} /> Tạo video mới
        </Button>
      </Card>
    );
  }

  const renderStageBadge = (stage: string) => {
    switch (stage) {
      case "DRAFT":
        return <Badge tone="neutral">Bản nháp</Badge>;
      case "SCRIPT_READY":
        return <Badge tone="warning">Chờ duyệt kịch bản</Badge>;
      case "SCRIPT_APPROVED":
        return <Badge tone="accent">Kịch bản đã duyệt</Badge>;
      case "RENDERING":
        return <Badge tone="warning" className="animate-pulse motion-reduce:animate-none">Đang dựng video...</Badge>;
      case "RENDER_COMPLETED":
        return <Badge tone="success">Chờ duyệt video</Badge>;
      case "APPROVED":
        return <Badge tone="success" className="gap-1"><CheckCircle2 size={12} /> Đã chốt duyệt</Badge>;
      case "FAILED":
        return <Badge tone="danger" className="gap-1"><AlertCircle size={12} /> Thất bại</Badge>;
      default:
        return <Badge tone="neutral">{stage}</Badge>;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {jobs.map((job) => {
        const spec = VIDEO_FORMAT_SPECS[job.format];
        return (
          <Card
              role="button"
              tabIndex={0}
            key={job.id}
            onClick={() => onSelectJob(job.id)}
            className="cursor-pointer border border-border p-4 hover:border-primary hover:shadow-md transition-all flex flex-col justify-between gap-3 group"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-caption font-semibold text-text-muted">
                  {spec?.label || job.format}
                </span>
                {renderStageBadge(job.stage)}
              </div>
              <h4 className="mt-2 text-title-sm font-bold text-text line-clamp-1 group-hover:text-primary transition-colors">
                {job.title}
              </h4>
            </div>

            <div className="flex items-center justify-between text-caption text-text-muted border-t border-border/60 pt-3">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Clock size={13} /> {job.duration_seconds}s
                </span>
                <span className="font-medium text-warning-text">
                  {job.cost_credits} credits
                </span>
              </div>
              <span className="flex items-center gap-1 text-primary font-semibold text-caption">
                Chi tiết <ChevronRight size={14} />
              </span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
