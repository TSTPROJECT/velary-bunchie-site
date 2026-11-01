// The installed web app's service worker (D-039). It keeps the site fresh rather than fast:
// pages always come from the network when there is one, so a new deploy shows straight away.
// Built files are kept for this version only, so the app still opens without a connection.
// The owner's content and pictures come from the API's own address and are never touched here.

const VERSION = '2026-11-01T14:31:54.978Z' // replaced with the build time (vite.config.ts → pwa())
const FILES = `vb-files-${VERSION}`
const START = self.registration.scope // the site's home page, e.g. …/velary-bunchie-site/

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(FILES)
      .then((cache) => cache.add(START))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith('vb-files-') && k !== FILES).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    // every address is the same app page; offline, the copy kept at install opens instead
    event.respondWith(fetch(request).catch(() => caches.match(START)))
    return
  }

  // scripts, styles, fonts and the site's own artwork: the kept copy at once, refreshed behind
  event.respondWith(
    caches.open(FILES).then(async (cache) => {
      const kept = await cache.match(request)
      const fresh = fetch(request).then((response) => {
        if (response.ok) void cache.put(request, response.clone())
        return response
      })
      if (!kept) return fresh
      event.waitUntil(fresh.catch(() => undefined))
      return kept
    }),
  )
})
