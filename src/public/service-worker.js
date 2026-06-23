const unregister = async () => {
  await self.registration.unregister();
};

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(unregister());
});
