(function() {
  const TARGET_WS_HOST = 'generativelanguage.googleapis.com'; // Host to intercept
  const originalWebSocket = window.WebSocket;

  if (!originalWebSocket) {
    console.error('[WebSocketInterceptor] Original window.WebSocket not found. Cannot apply interceptor.');
    return;
  }

  const handler = {
    construct(target, args) {
      let [url, protocols] = args;
      let newUrlString = typeof url === 'string' ? url : (url && typeof url.toString === 'function' ? url.toString() : null);
      let isTarget = false;

      if (newUrlString) {
        try {
          // For full URLs, parse and check the host
          if (newUrlString.startsWith('ws://') || newUrlString.startsWith('wss://')) {
            const parsedUrl = new URL(newUrlString);
            if (parsedUrl.host === TARGET_WS_HOST) {
              isTarget = true;
              const proxyScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
              const proxyHost = window.location.host;
              newUrlString = `${proxyScheme}://${proxyHost}/api-proxy${parsedUrl.pathname}${parsedUrl.search}`;
            }
          }
        } catch (e) {
          console.warn('[WebSocketInterceptor-Proxy] Error parsing WebSocket URL, using original:', url, e);
        }
      } else {
          console.warn('[WebSocketInterceptor-Proxy] WebSocket URL is not a string or stringifiable. Using original.');
      }

      if (isTarget) {
        console.log('[WebSocketInterceptor-Proxy] Original WebSocket URL:', url);
        console.log('[WebSocketInterceptor-Proxy] Redirecting to proxy URL:', newUrlString);
      }

      // Call the original constructor with potentially modified arguments
      // Reflect.construct ensures 'new target(...)' behavior and correct prototype chain
      if (protocols) {
        return Reflect.construct(target, [newUrlString, protocols]);
      } else {
        return Reflect.construct(target, [newUrlString]);
      }
    },
    get(target, prop, receiver) {
      // Forward static property access (e.g., WebSocket.OPEN, WebSocket.CONNECTING)
      // and prototype access to the original WebSocket constructor/prototype
      if (prop === 'prototype') {
        return target.prototype; // Or Reflect.get(target, prop, receiver) if preferred for consistency
      }
      return Reflect.get(target, prop, receiver);
    }
  };

  window.WebSocket = new Proxy(originalWebSocket, handler);

  console.log('[WebSocketInterceptor-Proxy] Global WebSocket constructor has been wrapped using Proxy.');
})();
