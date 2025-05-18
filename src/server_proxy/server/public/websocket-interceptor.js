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
      //stringify url's if necessary for parsing
      let newUrlString = typeof url === 'string' ? url : (url && typeof url.toString === 'function' ? url.toString() : null);
      //get ready to check for host to proxy
      let isTarget = false;

      if (newUrlString) {
        try {
          // For full URLs, parse string and check the host
          if (newUrlString.startsWith('ws://') || newUrlString.startsWith('wss://')) {
            //URL object again
            const parsedUrl = new URL(newUrlString);
            if (parsedUrl.host === TARGET_WS_HOST) {
              isTarget = true;
              //use wss if https, else ws
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
        return target.prototype; 
      }
      return Reflect.get(target, prop, receiver);
    }
  };

  window.WebSocket = new Proxy(originalWebSocket, handler);

  console.log('[WebSocketInterceptor-Proxy] Global WebSocket constructor has been wrapped using Proxy.');
})();
