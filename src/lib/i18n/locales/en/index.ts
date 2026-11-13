/**
 * en/index.ts — English locale dictionary (Foundation for multi-language scalability)
 */

import { commonEn } from "./common"
import { homeEn } from "./home"
import { layoutEn } from "./layout"
import { toolkitEn } from "./toolkit"
import { platformEn } from "./platform"
import { ordersEn } from "./orders"
import { greetingCardEn } from "./greeting-card"
import { productsEn } from "./products"
import { storageEn } from "./storage"
import { profileEn } from "./profile"
import { settingsEn } from "./settings"
import { notificationsEn } from "./notifications"
import { chatEn } from "./chat"

export const enDictionary = {
  common: commonEn,
  home: homeEn,
  layout: layoutEn,
  toolkit: toolkitEn,
  platform: platformEn,
  orders: ordersEn,
  greetingCard: greetingCardEn,
  products: productsEn,
  storage: storageEn,
  profile: profileEn,
  settings: settingsEn,
  notifications: notificationsEn,
  chat: chatEn,
} as const
