/**
 * Unregisters any registered service workers and clears all caches
 */
export const unregisterServiceWorker = async (): Promise<boolean> => {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers are not supported in this browser.');
    return false;
  }

  try {
    // Unregister all service workers
    const registrations = await navigator.serviceWorker.getRegistrations();
    
    for (const registration of registrations) {
      console.log('Unregistering service worker:', registration.scope);
      await registration.unregister();
    }

    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('Cleared caches:', cacheNames);
    }

    // Force refresh the page to ensure the latest service worker is used
    window.location.reload();
    return true;
  } catch (error) {
    console.error('Error unregistering service workers:', error);
    return false;
  }
};

// Add to window for easy access in development
if (process.env.NODE_ENV === 'development') {
  // @ts-ignore
  window.unregisterServiceWorker = unregisterServiceWorker;
}
