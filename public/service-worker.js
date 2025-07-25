/* eslint-disable no-restricted-globals */

// Service Worker for handling push notifications and offline functionality

const CACHE_NAME = 'calendar-app-v1';
const CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/public/icons/calendar-192x192.png',
  '/public/icons/calendar-512x512.png',
  '/public/icons/icon-192x192.png',
  '/public/icons/icon-512x512.png'
];

// Debug logging
const DEBUG = true; // Log helper function
function log(...args) {
  console.log('[Service Worker]', ...args);
}

// Install event - cache static assets
self.addEventListener('install', (event) => {
  log('Service worker installed');
  self.skipWaiting(); // Activate the service worker immediately
  
  // Log the current scope
  log('Service worker scope:', self.registration.scope);
  
  // Cache all static assets
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        log('Caching app shell');
        return cache.addAll(CACHE_URLS);
      })
      .then(() => {
        log('App shell cached');
      })
      .catch(error => {
        log('Cache addAll error:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  log('Service worker activated');
  
  // Take control of all clients immediately
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Claim all clients
      self.clients.claim().then(() => {
        log('Service worker now controlling all clients');
        
        // Send a message to all clients to inform them the service worker is ready
        return self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(client => {
            client.postMessage({ type: 'SERVICE_WORKER_READY' });
          });
        });
      })
    ]).then(() => {
      log('Service worker activated and ready to handle fetch events');
    })
  );
});

// Fetch event - serve from cache, falling back to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and chrome-extension requests
  if (event.request.method !== 'GET' || 
      event.request.url.startsWith('chrome-extension://')) {
    return;
  }
  
  // Handle API requests with network-first strategy
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If the request was successful, return it
          if (response && response.status === 200) {
            return response;
          }
          // If the request failed, try to get it from cache
          return caches.match(event.request);
        })
        .catch(() => {
          // If both network and cache fail, show a fallback
          return caches.match('/offline.html');
        })
    );
  } else {
    // For all other requests, try cache first, then network
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          // Return cached response if found
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Otherwise fetch from network
          return fetch(event.request)
            .then((response) => {
              // Don't cache responses with error status codes
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              
              // Clone the response
              const responseToCache = response.clone();
              
              // Cache the response for future use
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
              
              return response;
            });
        })
    );
  }
});

// Listen for messages from the client
self.addEventListener('message', (event) => {
  log('Message received from client:', event.data);
  
  if (event.data && event.data.type === 'SHOW_NOTIFICATION' && event.data.notification) {
    log('Received SHOW_NOTIFICATION message, showing notification...');
    showNotification(event.data.notification)
      .then(() => {
        // Send success response back to client
        event.ports && event.ports[0] && event.ports[0].postMessage({ 
          success: true, 
          message: 'Notification shown successfully' 
        });
      })
      .catch(error => {
        log('Failed to show notification from message:', error);
        // Send error response back to client
        event.ports && event.ports[0] && event.ports[0].postMessage({ 
          success: false, 
          error: error.message || 'Failed to show notification' 
        });
      });
  }
});

// Show a notification
function showNotification(notificationData) {
  if (!self.registration) {
    log('Error: No service worker registration found');
    return Promise.reject('No service worker registration');
  }

  if (!self.registration.showNotification) {
    log('Error: showNotification not available in service worker registration');
    return Promise.reject('showNotification not available');
  }

  const { title, ...options } = notificationData;
  log('Attempting to show notification with title:', title);
  
  try {
    const promise = self.registration.showNotification(title, {
      ...options,
      // Ensure required fields are set
      icon: options.icon || '/icons/icon-192x192.png',
      badge: options.badge || '/icons/calendar-192x192.png',
      vibrate: [200, 100, 200],
      data: {
        ...(options.data || {}),
        timestamp: Date.now()
      }
    });
    
    return promise
      .then(() => {
        log('Notification shown successfully');
        return true;
      })
      .catch(error => {
        log('Error showing notification:', error);
        throw error;
      });
  } catch (error) {
    log('Exception in showNotification:', error);
    return Promise.reject(error);
  }
}

// Push event - handle incoming push notifications
self.addEventListener('push', async (event) => {
  log('Push event received:', event);
  
  // Ensure the event has data
  if (!event.data) {
    log('Push event has no data');
    return;
  }
  
  if (!event.data) {
    log('No data in push event');
    return;
  }
  
  try {
    // Try to parse the push message data
    let notificationData;
    
    if (event.data.json) {
      // Standard web push notification
      notificationData = event.data.json();
      log('Parsed push notification data:', notificationData);
      
      // Show the notification
      showNotification(notificationData);
      
    } else if (event.data.text) {
      // Fallback for text data
      const text = event.data.text();
      log('Received text push data:', text);
      
      // Try to parse as JSON, fallback to plain text
      try {
        notificationData = JSON.parse(text);
        log('Parsed text data as JSON:', notificationData);
        showNotification(notificationData);
      } catch (e) {
        log('Could not parse push data as JSON, using as plain text');
        showNotification({
          title: 'New Notification',
          body: text || 'You have a new notification',
          icon: '/icons/icon-192x192.png',
          badge: '/icons/calendar-192x192.png',
          data: {
            url: '/',
            timestamp: Date.now(),
            source: 'push-event'
          }
        });
      }
    } else {
      log('No usable data in push event, showing fallback notification');
      showNotification({
        title: 'New Notification',
        body: 'You have a new notification',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/calendar-192x192.png',
        data: {
          url: '/',
          timestamp: Date.now(),
          source: 'push-event-fallback'
        }
      });
    }
  } catch (error) {
    log('Error handling push event:', error);
    
    // Show an error notification
    showNotification({
      title: 'Notification Error',
      body: 'There was an error showing this notification',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/calendar-192x192.png',
      data: {
        url: '/',
        timestamp: Date.now(),
        error: true
      }
    });
  }
});

// Notification click event - handle user interaction with notifications
self.addEventListener('notificationclick', (event) => {
  // Close the notification
  event.notification.close();

  // Handle the click action
  const { action, notification } = event;
  const { data } = notification;

  // Default action is to open the event URL
  let url = '/';
  if (data && data.url) {
    url = data.url;
  } else if (data && data.eventId) {
    url = `/event/${data.eventId}`;
  }

  // Handle different actions
  if (action === 'view' || action === '') {
    // Open or focus the app
    event.waitUntil(
      clients.matchAll({ type: 'window' })
        .then((clientList) => {
          // Check if there's already a window/tab open with the app
          for (const client of clientList) {
            if (client.url.includes(url) && 'focus' in client) {
              return client.focus();
            }
          }
          // If no matching client is found, open a new window
          if (clients.openWindow) {
            return clients.openWindow(url);
          }
          return null;
        })
    );
  }
  // For 'dismiss' or other actions, just close the notification
});

// Notification close event (optional)
self.addEventListener('notificationclose', (event) => {
  // You could add analytics here to track notification dismissals
  console.log('Notification closed:', event);
});

// Push subscription change event
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    Promise.resolve().then(() => {
      // Handle subscription change (e.g., when push subscription expires)
      console.log('Push subscription changed:', event);
      // You would typically re-subscribe here and update the server
    })
  );
});
