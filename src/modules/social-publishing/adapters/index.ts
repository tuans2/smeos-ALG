/** Bảng tra adapter đăng bài theo kênh — mỗi kênh một adapter API chính thức. */
import type { PublisherProvider, SocialChannel } from "@/core/ports/publisher-provider"
import type { FetchLike } from "./http-call"
import { createFacebookPublisher, createInstagramPublisher } from "./meta-graph-publisher"
import { createTikTokPublisher } from "./tiktok-publisher"
import { createZaloOaPublisher } from "./zalo-oa-publisher"

export function publisherFor(channel: SocialChannel, fetchImpl?: FetchLike): PublisherProvider {
  switch (channel) {
    case "facebook": return createFacebookPublisher(fetchImpl)
    case "instagram": return createInstagramPublisher(fetchImpl)
    case "zalo": return createZaloOaPublisher(fetchImpl)
    case "tiktok": return createTikTokPublisher(fetchImpl)
  }
}
