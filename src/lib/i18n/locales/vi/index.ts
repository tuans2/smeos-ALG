/**
 * index.ts — Bộ từ điển Tiếng Việt gốc (SSOT 100% của ALG)
 */

import { commonVi } from "./common"
import { homeVi } from "./home"
import { layoutVi } from "./layout"
import { toolkitVi } from "./toolkit"
import { platformVi } from "./platform"
import { ordersVi } from "./orders"
import { greetingCardVi } from "./greeting-card"
import { productsVi } from "./products"
import { storageVi } from "./storage"
import { profileVi } from "./profile"
import { settingsVi } from "./settings"
import { notificationsVi } from "./notifications"
import { chatVi } from "./chat"

export const viDictionary = {
  common: commonVi,
  home: homeVi,
  layout: layoutVi,
  toolkit: toolkitVi,
  platform: platformVi,
  orders: ordersVi,
  greetingCard: greetingCardVi,
  products: productsVi,
  storage: storageVi,
  profile: profileVi,
  settings: settingsVi,
  notifications: notificationsVi,
  chat: chatVi,
} as const

export type I18nSchema = typeof viDictionary
