// Service worker nhận Web Push của smeOS (checklist 4.30). Chỉ hiện thông báo và mở trang khi bấm; không lưu đệm trang.
self.addEventListener("push", (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: "Thông báo mới", message: event.data ? event.data.text() : "" }
  }
  const url = typeof data.url === "string" && data.url.startsWith("/") && !data.url.startsWith("//") ? data.url : "/"
  event.waitUntil(
    self.registration.showNotification(data.title || "Thông báo mới", {
      body: data.message || "",
      tag: data.tag || undefined,
      data: { url },
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || "/", self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url === target && "focus" in client) return client.focus()
      }
      return self.clients.openWindow(target)
    })
  )
})
