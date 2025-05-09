/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
// service-worker.js

// Define the target URL that we want to intercept and proxy.
const TARGET_URL_PREFIX = 'https://generativelanguage.googleapis.com';

// Installation event:
self.addEventListener('install', (event) => {
  try {
    console.log('Service Worker: Installing...');
    event.waitUntil(self.skipWaiting());
  } catch (error) {
    console.error('Service Worker: Error during install event:', error);
    // If skipWaiting fails, the new SW might get stuck in a waiting state.
  }
});

// Activation event:
self.addEventListener('activate', (event) => {
  try {
    console.log('Service Worker: Activating...');
    event.waitUntil(self.clients.claim());
  } catch (error) {
    console.error('Service Worker: Error during activate event:', error);
    // If clients.claim() fails, the SW might not control existing pages until next navigation.
  }
});

// Fetch event:
self.addEventListener('fetch', (event) => {
  try {
    const requestUrl = event.request.url;

    if (requestUrl.startsWith(TARGET_URL_PREFIX)) {
      console.log(`Service Worker: Intercepting request to ${requestUrl}`);

      const remainingPathAndQuery = requestUrl.substring(TARGET_URL_PREFIX.length);
      const proxyUrl = `${self.location.origin}/api-proxy${remainingPathAndQuery}`;

      console.log(`Service Worker: Proxying to ${proxyUrl}`);

      const requestOptions = {
        method: event.request.method,
        headers: event.request.headers,
        body: event.request.body,
        mode: event.request.mode,
        credentials: event.request.credentials,
        cache: event.request.cache,
        redirect: event.request.redirect,
        referrer: event.request.referrer,
        integrity: event.request.integrity,
      };

      if (event.request.method !== 'GET' && event.request.method !== 'HEAD') {
        requestOptions.duplex = 'half';
      }

      const promise = fetch(new Request(proxyUrl, requestOptions))
        .then((response) => {
          console.log(`Service Worker: Successfully proxied request to ${proxyUrl}, Status: ${response.status}`);
          return response;
        })
        .catch((error) => {
          console.error(`Service Worker: Error proxying request to ${proxyUrl}:`, error);
          // This ensures the client's fetch doesn't just hang or receive a generic network error.
          return new Response(
            JSON.stringify({ error: 'Proxying failed', details: error.message, proxiedUrl: proxyUrl }),
            {
              status: 502, // Bad Gateway is appropriate for proxy errors
              headers: { 'Content-Type': 'application/json' }
            }
          );
        });

      event.respondWith(promise);

    } else {
      // If the request URL doesn't match our target, let it proceed as normal.
      event.respondWith(fetch(event.request));
    }
  } catch (error) {
    console.error('Service Worker: Unhandled error in fetch event handler:', error);
    event.respondWith(
      new Response(
        JSON.stringify({ error: 'Service worker fetch handler failed', details: error.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    );
  }
});

