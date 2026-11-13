import { conflict } from "@/core/http/errors"
import {
  DEMO_SHOP_PROFILE_MESSAGE,
  demoShopContactGap,
  isConfirmedDemoContact,
  isDemoShopContact,
  toShopContact,
  type ShopContact,
} from "../domain/shop-contact"
import { ShopContactRepository, getShopContactRepository } from "../infra/shop-contact-repository"
import { parseStorePolicies } from "../domain/store-policy"
import { getUnlockedLocales, parseBrochureLanguagePolicy } from "../domain/brochure-language-policy"

export async function getShopContact(
  organizationId: string,
  repo = getShopContactRepository(),
): Promise<ShopContact | null> {
  const raw = await repo.findByOrganizationId(organizationId)
  if (!raw) return null
  const { settings, ...contact } = raw
  const unlocked = getUnlockedLocales(settings)
  const languagePolicy = parseBrochureLanguagePolicy(settings, unlocked)
  // Cam kết lấy từ Chính sách trong Hồ sơ tiệm (PO 08/10/2026), áp chung mọi link của tiệm
  const shopContact = toShopContact({ ...contact, commitments: parseStorePolicies(settings).commitments })
  if (!shopContact) return null
  return {
    ...shopContact,
    languagePolicy,
  }
}

export async function getShopContactBySlug(
  orgSlug: string,
  repo = getShopContactRepository(),
): Promise<ShopContact | null> {
  const id = await repo.findOrganizationIdBySlug(orgSlug)
  return id ? getShopContact(id, repo) : null
}

/** Chặn gửi link cho khách khi hồ sơ tiệm còn là dữ liệu mẫu và chưa xác nhận (PO 08/10/2026) — 409 kèm việc cần làm. */
export async function assertShopReadyForCustomers(organizationId: string, repo = getShopContactRepository()): Promise<void> {
  const raw = await repo.findByOrganizationId(organizationId)
  if (!raw) return
  const isConfirmed = isConfirmedDemoContact(raw.settings)
  const contact = toShopContact({ ...raw, commitments: parseStorePolicies(raw.settings).commitments })
  if (contact && isDemoShopContact(contact, isConfirmed)) {
    const message = demoShopContactGap(contact) || DEMO_SHOP_PROFILE_MESSAGE
    throw conflict(message)
  }
}

