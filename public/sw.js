// Fleet Daily service worker.
// Only here so the app is installable as a PWA. No offline caching (not needed for the demo):
// every request goes straight to the network.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  /* network only */
});
