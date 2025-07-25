/**
 * Debug utility for service worker and push notification issues
 */

/**
 * Logs information about the current service worker registration
 */
export const debugServiceWorker = async (): Promise<void> => {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers are not supported in this browser.');
    return;
  }

  try {
    console.group('Service Worker Debug Information');
    
    // Check current registrations
    const registrations = await navigator.serviceWorker.getRegistrations();
    console.log('Current Service Worker Registrations:', registrations);
    
    if (registrations.length > 0) {
      const mainRegistration = registrations[0];
      console.log('Main Registration Scope:', mainRegistration.scope);
      console.log('Active Worker:', mainRegistration.active);
      console.log('Waiting Worker:', mainRegistration.waiting);
      console.log('Installing Worker:', mainRegistration.installing);
      
      // Check if the service worker is controlling the page
      console.log('Is controlled:', navigator.serviceWorker.controller !== null);
      
      // Check push manager subscription
      if ('pushManager' in mainRegistration) {
        const subscription = await mainRegistration.pushManager.getSubscription();
        console.log('Push Subscription:', subscription);
        
        if (subscription) {
          console.log('Subscription Endpoint:', subscription.endpoint);
          console.log('Subscription Options:', {
            userVisibleOnly: subscription.options.userVisibleOnly,
            applicationServerKey: subscription.options.applicationServerKey
          });
        }
      }
    } else {
      console.log('No service workers are currently registered.');
    }
    
    // Check cache API
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      console.log('Available Caches:', cacheNames);
      
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        console.log(`Cache "${cacheName}" contains ${requests.length} items`);
      }
    }
    
    console.groupEnd();
  } catch (error) {
    console.error('Error debugging service worker:', error);
  }
};

/**
 * Force updates the service worker by unregistering and re-registering
 */
export const forceUpdateServiceWorker = async (): Promise<boolean> => {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers are not supported in this browser.');
    return false;
  }

  try {
    // First unregister all service workers
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
      console.log('Unregistered service worker:', registration.scope);
    }

    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('Cleared caches:', cacheNames);
    }

    // Force reload to ensure the latest service worker is registered
    window.location.reload();
    return true;
  } catch (error) {
    console.error('Error forcing service worker update:', error);
    return false;
  }
};

// Add to window for easy access in development
if (process.env.NODE_ENV === 'development') {
  // @ts-ignore
  window.debugServiceWorker = debugServiceWorker;
  // @ts-ignore
  window.forceUpdateServiceWorker = forceUpdateServiceWorker;
}
