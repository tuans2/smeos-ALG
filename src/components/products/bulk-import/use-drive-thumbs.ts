"use client"

import { useEffect, useMemo, useState } from "react"
import { loadDriveThumbs } from "./drive-thumb-loader"
import { driveFileThumbnail, parseDriveLink, type DriveRef, type ParsedProductRow } from "./types"

export type DriveThumbState = {
  /** Drive id (folder hoặc file) → URL thumbnail. */
  thumbs: Map<string, string>
  /** Drive id đã thử nhưng không lấy được ảnh (folder khoá quyền, trống, lỗi). */
  missing: Set<string>
}

/** Phân giải link Drive của các dòng thành thumbnail: link file dùng thẳng, link folder gom lô hỏi server. */
export function useDriveThumbs(rows: ParsedProductRow[]): DriveThumbState {
  const [folders, setFolders] = useState<DriveThumbState>({ thumbs: new Map(), missing: new Set() })

  const refs = useMemo(
    () => rows.filter((r) => !r.previewUrl).map((r) => parseDriveLink(r.driveLink)).filter((r): r is DriveRef => r !== undefined),
    [rows],
  )

  useEffect(() => {
    const folderIds = [...new Set(refs.filter((r) => r.kind === "folder").map((r) => r.id))]
    if (folderIds.length === 0) return
    let alive = true

    void loadDriveThumbs(
      folderIds,
      (found, missing) =>
        setFolders((prev) => ({
          thumbs: new Map([...prev.thumbs, ...found]),
          missing: new Set([...prev.missing, ...missing]),
        })),
      { isAlive: () => alive },
    )

    return () => {
      alive = false
    }
  }, [refs])

  return useMemo(() => {
    const thumbs = new Map(folders.thumbs)
    for (const r of refs) if (r.kind === "file") thumbs.set(r.id, driveFileThumbnail(r.id))
    return { thumbs, missing: folders.missing }
  }, [refs, folders])
}
