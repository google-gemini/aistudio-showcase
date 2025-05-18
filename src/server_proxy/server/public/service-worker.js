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

      // Simplify request options for the fetch to the proxy
      const newHeaders = new Headers();
      if (event.request.headers.has('Content-Type')) {
        newHeaders.set('Content-Type', event.request.headers.get('Content-Type'));
      }
      // Add other essential headers like Authorization if your proxy specifically needs them,
      // but for now, Content-Type is the most likely important one.

      const requestOptions = {
        method: event.request.method,
        headers: newHeaders, // Use simplified headers
        body: event.request.body, // Still use the original body stream
        mode: 'cors', // Explicitly set mode for the request to the proxy
        // Omitting credentials, cache, redirect, referrer, integrity for simplicity,
        // as they might not be appropriate to pass from a cross-origin request
        // to a same-origin proxy without careful consideration.
      };

      // Only set duplex if there's a body and it's a relevant method
      if (event.request.method !== 'GET' && event.request.method !== 'HEAD' && event.request.body) {
        requestOptions.duplex = 'half';
      }

      const promise = fetch(new Request(proxyUrl, requestOptions))
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

