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
    // If clients.claim() fails, the SW might not control existing pages until next nav.
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

      // Construct headers for the request to the proxy
      const newHeaders = new Headers();
      // Copy essential headers from the original request
      // For OPTIONS (preflight) requests, Access-Control-Request-*  are critical.
      // For actual requests (POST, GET), Content-Type, Accept etc.
      const headersToCopy = [
        'Content-Type', 
        'Accept', 
        'Access-Control-Request-Method', 
        'Access-Control-Request-Headers',
      ];

      for (const headerName of headersToCopy) {
        if (event.request.headers.has(headerName)) {
          newHeaders.set(headerName, event.request.headers.get(headerName));
        }
      }

      if (event.request.method === 'POST') {

        // Ensure Content-Type is set for POST requests to the proxy, defaulting to application/json
        if (!newHeaders.has('Content-Type')) {
          console.warn("Service Worker: POST request to proxy was missing Content-Type in newHeaders. Defaulting to application/json.");
          newHeaders.set('Content-Type', 'application/json');
        } else {
          console.log(`Service Worker: POST request to proxy has Content-Type: ${newHeaders.get('Content-Type')}`);
        }
      }

      const createProxyRequest = async () => {
        const body = event.request.method !== 'GET' && event.request.method !== 'HEAD' ? await event.request.arrayBuffer() : undefined;

        const requestOptions = {
          method: event.request.method,
          headers: newHeaders,
          body: body,
          mode: event.request.mode,
          credentials: event.request.credentials,
          cache: event.request.cache,
          redirect: event.request.redirect,
          referrer: event.request.referrer,
          integrity: event.request.integrity,
        };

        // Only set duplex if there's a body and it's a relevant method
        if (body) {
          requestOptions.duplex = 'half';
        }

        return new Request(proxyUrl, requestOptions);
      };

      const promise = createProxyRequest().then(proxyRequest => fetch(proxyRequest))
        .then((response) => {
          console.log(`Service Worker: Successfully proxied request to ${proxyUrl}, Status: ${response.status}`);
          return response;
        })
        .catch((error) => {
          // Log more error details
          console.error(`Service Worker: Error proxying request to ${proxyUrl}. Message: ${error.message}, Name: ${error.name}, Stack: ${error.stack}`);
          return new Response(
            JSON.stringify({ error: 'Proxying failed', details: error.message, name: error.name, proxiedUrl: proxyUrl }),
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
    // Log more error details for unhandled errors too
    console.error('Service Worker: Unhandled error in fetch event handler. Message:', error.message, 'Name:', error.name, 'Stack:', error.stack);
    event.respondWith(
      new Response(
        JSON.stringify({ error: 'Service worker fetch handler failed', details: error.message, name: error.name }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    );
  }
});

