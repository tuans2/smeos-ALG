"use client"

import React from "react"
import { Card } from "@/components/ui/card"
import { Folder } from "@/components/ui/icon-set/folder"
import { ChevronRight } from "@/components/ui/icon-set/chevron-right"
import { FileSpreadsheet } from "@/components/ui/icon-set/file-spreadsheet"
import type { StoreDomainFolder } from "@/modules/field-platform/use-cases/get-store-folder-data"

interface DomainFolderCardProps {
  readonly folder: StoreDomainFolder
  readonly onOpenFolder: (folder: StoreDomainFolder) => void
}

export function DomainFolderCard({ folder, onOpenFolder }: DomainFolderCardProps) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onOpenFolder(folder)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onOpenFolder(folder)
        }
      }}
      className="group p-5 rounded-2xl border border-border/80 bg-surface hover:border-primary/50 hover:shadow-md transition-all cursor-pointer text-left focus:outline-primary flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors shadow-xs">
            <Folder size={20} className="fill-current" />
          </div>

          <span className="px-2.5 py-0.5 rounded-full text-caption font-bold bg-surface-alt border border-border text-text-muted">
            {folder.fieldCount} trường
          </span>
        </div>

        <h4 className="font-extrabold text-body-sm text-text group-hover:text-primary transition-colors">
          {folder.domainNameVi}
        </h4>
        <p className="text-caption text-text-muted mt-1 line-clamp-2">
          {folder.descriptionVi || `Nhóm dữ liệu ${folder.domainKey}`}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-caption font-bold text-primary">
        <span className="flex items-center gap-1.5 text-text-muted font-medium text-caption">
          <FileSpreadsheet size={13} />
          <span>Bấm để mở thư mục</span>
        </span>
        <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Card>
  )
}
