/* LoveBel push service worker */
self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = { title: "LoveBel", body: "", url: "/", tag: "lovebel" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (_) {}

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      if (clients.some((client) => client.visibilityState === "visible")) return;
      return self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag,
      icon: "/favicon.png",
      badge: "/favicon.png",
      data: { url: data.url },
      renotify: true,
      });
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  // Older like notifications use the previous route name.
  const url = target === "/likes-me" ? "/likes" : target;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
