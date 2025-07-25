// This file handles the registration and management of the service worker

// Check if the browser is Brave
const isBrave = async () => {
  // @ts-ignore - navigator.brave is specific to Brave browser
  return (navigator.brave && await navigator.brave.isBrave()) || false;
};

export const register = async () => {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers are not supported in this browser.');
    return null;
  }

  try {
    // Only unregister service workers in development
    if (import.meta.env.DEV) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        console.log('Development: Unregistering existing service worker:', registration.scope);
        await registration.unregister();
      }

      // Clear all caches in development
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('Development: Cleared caches');
      }
    }

    // Check if we're in Brave and log it
    const brave = await isBrave();
    console.log(`Registering service worker in ${brave ? 'Brave' : 'non-Brave'} browser`);
    
    // Register the service worker
    const swUrl = new URL('/service-worker.js', window.location.origin);
    
    // Only add cache-busting query parameter in development
    if (import.meta.env.DEV) {
      swUrl.searchParams.set('v', Date.now().toString());
    }
    
    const registration = await navigator.serviceWorker.register(swUrl, {
      scope: '/',
      // @ts-ignore - type definition might not include this
      updateViaCache: import.meta.env.DEV ? 'none' : 'all'
    });
    
    // Log successful registration
    console.log('ServiceWorker registration successful with scope: ', registration.scope);
    
    // Force the waiting service worker to become active
    if (registration.waiting) {
      console.log('Found waiting service worker, skipping waiting...');
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Don't reload here - let the controllerchange handler handle it
      // This prevents multiple reloads
      return registration;
    }

    // Listen for controller change to detect when the new service worker takes over
    // Only add this listener if we're not already refreshing
    if (!window.location.hash.includes('#sw-updated')) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Controller changed, reloading...');
        // Add a hash to prevent multiple reloads
        window.location.hash = 'sw-updated';
        window.location.reload();
      });
    }

    console.log('Service Worker registered with scope:', registration.scope);
    
    // Ensure the service worker is controlling the page
    if (navigator.serviceWorker.controller) {
      console.log('Service worker is controlling the page');
    } else {
      console.log('Service worker is not yet controlling the page');
      // Force the service worker to take control
      await navigator.serviceWorker.ready;
      window.location.reload();
    }
    
    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        console.log('New service worker found, installing...');
        
        newWorker.addEventListener('statechange', () => {
          console.log('Service worker state changed:', newWorker.state);
          
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('New content is available; please refresh.');
            // Optional: Show a notification to the user
          }
        });
      }
    });

    // Check for updates every hour
    setInterval(() => {
      if (registration) {
        registration.update().catch(err => 
          console.log('Service worker update check failed:', err)
        );
      }
    }, 60 * 60 * 1000);

    return registration;
  } catch (error) {
    console.error('Service worker registration failed:', error);
    
    // Additional error handling for Brave
    if (await isBrave()) {
      console.warn('Brave-specific service worker registration issue detected.');
      console.warn('Please ensure the following Brave settings are configured:');
      console.warn('1. brave://settings/shields - Check if Shields are not blocking service workers');
      console.warn('2. brave://settings/content/notifications - Ensure notifications are allowed for this site');
    }
    
    return null;
  }
};

export const unregister = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      const result = await registration.unregister();
      if (result) {
        console.log('Service worker unregistered');
      } else {
        console.warn('Service worker could not be unregistered');
      }
      return result;
    } catch (error) {
      console.error('Error unregistering service worker:', error);
      return false;
    }
  }
  return false;
};

// Check if the browser supports service workers
export const isSupported = 'serviceWorker' in navigator;

// Check if the page is being served over HTTPS or localhost
const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

// Register the service worker with appropriate configuration
export const registerServiceWorker = async () => {
  console.log('[ServiceWorker] Starting service worker registration...');
  
  if (process.env.NODE_ENV !== 'production' && !isLocalhost) {
    console.log('[ServiceWorker] Skipping service worker registration in development mode');
    return;
  }

  if (!isSupported) {
    console.warn('[ServiceWorker] Service workers are not supported in this browser');
    return;
  }

  try {
    console.log('[ServiceWorker] Registering service worker...');
    const registration = await register();
    console.log('[ServiceWorker] Service worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('[ServiceWorker] Error during service worker registration:', error);
    throw error;
  }
};
