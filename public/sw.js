// ResuFit service worker: offline support for pages whose data lives in the browser.
// AI requests (/api/*) are never cached or intercepted.
const CACHE_VERSION = "resufit-v4";
const PAGES_CACHE = `${CACHE_VERSION}-pages`;
const ASSETS_CACHE = `${CACHE_VERSION}-assets`;
const OFFLINE_URL = "/offline";
// Pages that are useful offline because their data is stored in this browser.
const PRECACHE_PAGES = ["/", "/tracker", "/history", "/data", "/learn", OFFLINE_URL];
const PRECACHE_ASSETS = [
  "/logo.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
];

function isCacheableAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/logo.svg" ||
    url.pathname.startsWith("/icon.svg")
  );
}

async function precache() {
  const pages = await caches.open(PAGES_CACHE);
  const assets = await caches.open(ASSETS_CACHE);
  const assetUrls = new Set(PRECACHE_ASSETS);

  for (const path of PRECACHE_PAGES) {
    try {
      const response = await fetch(path, { cache: "no-store" });
      if (!response.ok) continue;
      await pages.put(path, response.clone());
      // Also cache the scripts and styles each page needs, so it works offline.
      const html = await response.text();
      for (const match of html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)) {
        assetUrls.add(match[1]);
      }
    } catch {
      // Precaching is best-effort; the app still works online.
    }
  }

  await Promise.all(
    [...assetUrls].map(async (url) => {
      try {
        const response = await fetch(url);
        if (response.ok) await assets.put(url, response);
      } catch {
        // Ignore individual asset failures.
      }
    }),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("resufit-") && !key.startsWith(CACHE_VERSION))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function handleNavigation(request) {
  const url = new URL(request.url);
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      const pages = await caches.open(PAGES_CACHE);
      await pages.put(url.pathname, response.clone());
    }
    return response;
  } catch {
    const pages = await caches.open(PAGES_CACHE);
    return (
      (await pages.match(url.pathname)) ||
      (await pages.match(OFFLINE_URL)) ||
      new Response("You're offline.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    );
  }
}

async function handleAsset(request) {
  const assets = await caches.open(ASSETS_CACHE);
  const cached = await assets.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    await assets.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (isCacheableAsset(url)) {
    event.respondWith(handleAsset(request));
  }
});
