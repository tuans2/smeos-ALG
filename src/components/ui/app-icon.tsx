import * as React from "react"
import * as Ph from "@phosphor-icons/react/dist/ssr"
import type { Icon as PhosphorIcon, IconWeight } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

/**
 * Bộ icon chuẩn ALG (Phosphor, PO 30/10/2026). Danh mục vẫn lưu tên icon kiểu lucide
 * (`"Camera"`, `"BadgeCheck"`…) — bảng dưới ánh xạ sang Phosphor, thiếu thì dùng `Folder`.
 * Bảng tường minh, không tra động qua `./icons`: tra động buộc bundler giữ MỌI icon trong chunk chung
 * của shell (trước đây ~236 icon × 6 nét vẽ, 174 KB gzip ở mọi trang).
 */
const ICONS: Readonly<Record<string, PhosphorIcon>> = {
  Activity: Ph.Pulse, Award: Ph.Medal, BadgeCheck: Ph.SealCheck, BarChart3: Ph.ChartBar,
  Bell: Ph.Bell, BookOpen: Ph.BookOpen, Brain: Ph.Brain, Briefcase: Ph.Briefcase,
  Building2: Ph.Buildings, Calculator: Ph.Calculator, CalendarClock: Ph.CalendarCheck,
  CalendarDays: Ph.CalendarDots, Camera: Ph.Camera, CircleDashed: Ph.CircleDashed,
  ClipboardCheck: Ph.ListChecks, ClipboardList: Ph.ClipboardText, CreditCard: Ph.CreditCard,
  FileSpreadsheet: Ph.FileXls, FileText: Ph.FileText, FlaskConical: Ph.Flask, Gift: Ph.Gift,
  Globe: Ph.Globe, Hammer: Ph.Hammer, Heart: Ph.Heart, HeartHandshake: Ph.Handshake,
  Image: Ph.Image, Images: Ph.Images, Library: Ph.Books, Link: Ph.Link, ListChecks: Ph.ListChecks,
  Magnet: Ph.Magnet, MapPin: Ph.MapPin, Megaphone: Ph.Megaphone,
  MessageSquareHeart: Ph.ChatCircleText, MessagesSquare: Ph.ChatsCircle, Network: Ph.TreeStructure,
  Package: Ph.Package, Palette: Ph.Palette, Presentation: Ph.PresentationChart, QrCode: Ph.QrCode,
  Radio: Ph.Broadcast, Receipt: Ph.Receipt, Repeat: Ph.Repeat, ScanLine: Ph.Scan, Shield: Ph.Shield,
  ShoppingBag: Ph.ShoppingBag, ShoppingCart: Ph.ShoppingCart, Sparkles: Ph.Sparkle,
  Store: Ph.Storefront, Table: Ph.Table, Target: Ph.Target, TrendingUp: Ph.TrendUp,
  Truck: Ph.Truck, Bot: Ph.Robot, IdCard: Ph.IdentificationCard, Inbox: Ph.Tray, LayoutTemplate: Ph.Layout,
  CheckCircle2: Ph.CheckCircle, Coins: Ph.Coins, Database: Ph.Database, Flower2: Ph.Flower, Handshake: Ph.Handshake, PackageCheck: Ph.Package, Plug: Ph.Plug, Printer: Ph.Printer, Rocket: Ph.Rocket, Settings: Ph.GearSix, ShieldAlert: Ph.ShieldWarning, SlidersHorizontal: Ph.SlidersHorizontal, UserCog: Ph.UserGear, Volume2: Ph.SpeakerHigh,
  Percent: Ph.Percent, Route: Ph.Path, Ticket: Ph.Ticket, Sliders: Ph.Sliders, Layers: Ph.Stack, Download: Ph.DownloadSimple, Upload: Ph.UploadSimple, UserPlus: Ph.UserPlus, Users: Ph.Users, Video: Ph.VideoCamera, Wallet: Ph.Wallet,
}

export function hasAppIcon(name: string): boolean {
  return name in ICONS
}

const TONE_ORDER: readonly IconTone[] = [
  "plum", "rose", "orange", "amber", "teal", "blue", "indigo", "green", "pink", "emerald",
]

/** Màu nhóm cố định theo khoá (vd. mã mục) — cùng khoá luôn cùng màu. */
export function toneFor(key: string): IconTone {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return TONE_ORDER[h % TONE_ORDER.length] ?? "plum"
}

interface AppIconProps {
  name: string
  weight?: IconWeight
  className?: string
}

export function AppIcon({ name, weight = "duotone", className }: AppIconProps) {
  const Icon = ICONS[name]
  if (Icon) return <Icon weight={weight} className={className} aria-hidden="true" />
  return <Ph.Folder weight={weight} className={className} aria-hidden="true" />
}

export type IconTone =
  | "plum" | "rose" | "orange" | "amber" | "teal" | "blue" | "indigo" | "green" | "pink" | "emerald"

// Viết đủ tên lớp để Tailwind quét được.
const SOFT: Record<IconTone, string> = {
  plum: "bg-tone-plum/10 text-tone-plum ring-tone-plum/15",
  rose: "bg-tone-rose/10 text-tone-rose ring-tone-rose/15",
  orange: "bg-tone-orange/10 text-tone-orange ring-tone-orange/15",
  amber: "bg-tone-amber/10 text-tone-amber ring-tone-amber/15",
  teal: "bg-tone-teal/10 text-tone-teal ring-tone-teal/15",
  blue: "bg-tone-blue/10 text-tone-blue ring-tone-blue/15",
  indigo: "bg-tone-indigo/10 text-tone-indigo ring-tone-indigo/15",
  green: "bg-tone-green/10 text-tone-green ring-tone-green/15",
  pink: "bg-tone-pink/10 text-tone-pink ring-tone-pink/15",
  emerald: "bg-tone-emerald/10 text-tone-emerald ring-tone-emerald/15",
}
const SOLID: Record<IconTone, string> = {
  plum: "from-tone-plum/75 to-tone-plum shadow-tone-plum/40",
  rose: "from-tone-rose/75 to-tone-rose shadow-tone-rose/40",
  orange: "from-tone-orange/75 to-tone-orange shadow-tone-orange/40",
  amber: "from-tone-amber/75 to-tone-amber shadow-tone-amber/40",
  teal: "from-tone-teal/75 to-tone-teal shadow-tone-teal/40",
  blue: "from-tone-blue/75 to-tone-blue shadow-tone-blue/40",
  indigo: "from-tone-indigo/75 to-tone-indigo shadow-tone-indigo/40",
  green: "from-tone-green/75 to-tone-green shadow-tone-green/40",
  pink: "from-tone-pink/75 to-tone-pink shadow-tone-pink/40",
  emerald: "from-tone-emerald/75 to-tone-emerald shadow-tone-emerald/40",
}

interface IconTileProps {
  name: string
  tone?: IconTone
  /** soft: icon 2 lớp trên nền nhạt (mặc định) · solid: icon đặc trắng trên ô màu — chỉ cho lưới điều hướng chính */
  variant?: "soft" | "solid"
  size?: "md" | "lg"
  className?: string
}

/** Ô icon chuẩn: md = 48px, lg = 48px điện thoại / 64px máy tính. */
export function IconTile({ name, tone = "plum", variant = "soft", size = "lg", className }: IconTileProps) {
  const box = size === "lg" ? "w-12 h-12 sm:w-16 sm:h-16 rounded-2xl" : "w-12 h-12 rounded-xl"
  const glyph = size === "lg" ? "w-7 h-7 sm:w-9 sm:h-9" : "w-7 h-7"
  return (
    <div
      className={cn(
        "flex items-center justify-center shrink-0",
        box,
        variant === "solid"
          ? cn("bg-gradient-to-br text-surface shadow-md", SOLID[tone])
          : cn("ring-1 ring-inset", SOFT[tone]),
        className,
      )}
    >
      <AppIcon name={name} weight={variant === "solid" ? "fill" : "duotone"} className={glyph} />
    </div>
  )
}
