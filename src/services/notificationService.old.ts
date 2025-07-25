import api from './api';
import { CalendarEvent } from '../types/calendar';

// Extend Navigator to include Brave-specific properties
declare global {
  interface Navigator {
    brave?: {
      isBrave: () => Promise<boolean>;
    };
  }
}

// Extend Navigator to include Brave-specific properties
declare global {
  interface Navigator {
    brave?: {
      isBrave: () => Promise<boolean>;
    };
  }
}

// Helper function to convert base64 URL to Uint8Array
const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

// Check if the browser supports service workers and push notifications
const isSupported = (): boolean => {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export interface UserPreferences {
  email: string;
  notifyEmail: boolean;
  notifyBrowser: boolean;
  notifyAllEvents: boolean;
  // Email notification settings
  email1hBefore: boolean;
  email10mBefore: boolean;
  // Browser notification settings
  browser1hBefore: boolean;
  browser10mBefore: boolean;
}

export interface EventPreference {
  event_type: string;
  is_enabled: boolean;
}

// Helper function to convert base64 URL to Uint8Array
const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const notificationService = {
  // Check if the browser is Brave
  async isBraveBrowser(): Promise<boolean> {
    if (typeof navigator === 'undefined') return false;
    
    try {
      const isBrave = 
        (navigator.brave && 
         typeof navigator.brave.isBrave === 'function' && 
         await navigator.brave.isBrave()) || 
        (navigator.userAgent.includes('Brave') && 
         navigator.userAgent.includes('Chrome'));
      
      console.log('[NotificationService] Brave browser detected:', isBrave);
      return isBrave;
    } catch (error) {
      console.warn('[NotificationService] Error detecting Brave browser:', error);
      return false;
    }
  },

  // Helper method to attempt push subscription with retries
  async attemptPushSubscription(
    registration: ServiceWorkerRegistration,
    options: PushSubscriptionOptionsInit,
    maxAttempts = 3,
    delay = 500
  ): Promise<PushSubscription> {
    let attempts = 0;
    let lastError: Error | null = null;
    
    while (attempts < maxAttempts) {
      attempts++;
      try {
        const subscription = await registration.pushManager.subscribe(options);
        console.log(`[NotificationService] Push subscription successful on attempt ${attempts}`);
        return subscription;
      } catch (error) {
        lastError = error as Error;
        console.warn(`[NotificationService] Attempt ${attempts} failed:`, error);
        if (attempts < maxAttempts) {
          console.log(`[NotificationService] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error('Failed to subscribe to push notifications after multiple attempts');
  },
  // Check if the browser is Brave
  async isBraveBrowser(): Promise<boolean> {
    if (typeof navigator === 'undefined') return false;
    
    try {
      // @ts-ignore - navigator.brave is specific to Brave browser
      const isBrave = (navigator.brave && 
                     typeof navigator.brave.isBrave === 'function' && 
                     await navigator.brave.isBrave()) || 
                     (navigator.userAgent.includes('Brave') && 
                     navigator.userAgent.includes('Chrome'));
      console.log('[NotificationService] Brave browser detected:', isBrave);
      return isBrave;
    } catch (error) {
      console.warn('[NotificationService] Error detecting Brave browser:', error);
      return false;
    }
  },

  // Helper method to attempt push subscription with retries
  private async attemptPushSubscription(
    registration: ServiceWorkerRegistration,
    options: PushSubscriptionOptionsInit,
    maxAttempts = 3,
    delay = 500
  ): Promise<PushSubscription> {
    let attempts = 0;
    let lastError: Error | null = null;
    
    while (attempts < maxAttempts) {
      attempts++;
      try {
        const subscription = await registration.pushManager.subscribe(options);
        console.log(`[NotificationService] Push subscription successful on attempt ${attempts}`);
        return subscription;
      } catch (error) {
        lastError = error as Error;
        console.warn(`[NotificationService] Attempt ${attempts} failed:`, error);
        if (attempts < maxAttempts) {
          console.log(`[NotificationService] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error('Failed to subscribe to push notifications after multiple attempts');
  },

  // Get notification preferences
  async getPreferences(): Promise<UserPreferences> {
    try {
      const response = await api.get('/api/users/me/preferences');
      // Handle migration from old format to new format
      if (response && 'notify1hBefore' in response) {
        const oldPrefs = response as any;
        return {
          email: oldPrefs.email || '',
          notifyEmail: oldPrefs.notifyEmail !== false,
          notifyBrowser: oldPrefs.notifyBrowser !== false,
          notifyAllEvents: oldPrefs.notifyAllEvents !== false,
          email1hBefore: oldPrefs.notify1hBefore !== false,
          email10mBefore: oldPrefs.notify10mBefore !== false,
          browser1hBefore: oldPrefs.notify1hBefore !== false,
          browser10mBefore: oldPrefs.notify10mBefore !== false
        };
      }
      
      // Return default preferences if no response or already in new format
      return response || {
        email: '',
        notifyEmail: true,
        notifyBrowser: true,
        notifyAllEvents: true,
        email1hBefore: true,
        email10mBefore: true,
        browser1hBefore: true,
        browser10mBefore: true
      };
    } catch (error) {
      console.error('Error getting preferences:', error);
      // Return default preferences if there's an error
      return {
        email: '',
        notifyEmail: true,
        notifyBrowser: true,
        notifyAllEvents: true,
        email1hBefore: true,
        email10mBefore: true,
        browser1hBefore: true,
        browser10mBefore: true
      };
    }
  },
  
  // Update notification preferences
  async updatePreferences(updates: Partial<UserPreferences>): Promise<UserPreferences> {
    try {
      const data = {
        ...updates,
        // For backward compatibility, include the old field names
        notify1hBefore: updates.email1hBefore,
        notify10mBefore: updates.email10mBefore
      };
      
      // Remove undefined values to avoid overriding existing values
      Object.keys(data).forEach((key: string) => {
        if (data[key as keyof typeof data] === undefined) {
          delete (data as any)[key];
        }
      });
      
      // Use the API service's put function which handles errors and response parsing
      const result = await api.put('/api/users/me/preferences', data);
      return result;
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error; // Re-throw to be handled by the component
    }
  },
  
  // Get user's event type preferences
  async getEventPreferences(availableEventTypes: string[] = []): Promise<EventPreference[]> {
    try {
      // Get the current user's preferences
      const prefs = await this.getPreferences();
      
      // Get the user's existing event type preferences
      const response = await api.get('/api/users/me/event-preferences');
      const existingPrefs = Array.isArray(response.data) ? response.data : [];
      
      // Create a map of existing preferences for quick lookup
      const prefMap = new Map<string, boolean>();
      existingPrefs.forEach((pref: any) => {
        if (pref && typeof pref.event_type === 'string' && typeof pref.is_enabled === 'boolean') {
          prefMap.set(pref.event_type, pref.is_enabled);
        }
      });
      
      // Check if this is a new user (no preferences set yet)
      const isNewUser = existingPrefs.length === 0;
      
      // Merge available event types with existing preferences
      const allPrefs: EventPreference[] = availableEventTypes.map(eventType => ({
        event_type: eventType,
        is_enabled: isNewUser 
          ? true  // For new users, enable all event types by default
          : prefMap.has(eventType) 
            ? prefMap.get(eventType) as boolean
            : prefs.notifyAllEvents // For existing users, use notifyAllEvents setting for new types
      }));
      
      return allPrefs;
    } catch (error) {
      console.error('Error getting event preferences:', error);
      // Return default prefs for available event types
      return availableEventTypes.map(eventType => ({
        event_type: eventType,
        is_enabled: false
      }));
    }
  },
  
  // Update event type preference
  async updateEventPreference(eventType: string, isEnabled: boolean, isNewType: boolean = false): Promise<void> {
    try {
      // Get current preferences to check notifyAllEvents setting
      const prefs = await this.getPreferences();
      
      // If this is a new event type and notifyAllEvents is enabled, auto-enable it
      if (isNewType && prefs.notifyAllEvents) {
        isEnabled = true;
      }
      
      await api.post('/api/users/me/event-preferences', {
        eventType,
        isEnabled
      });
    } catch (error) {
      console.error('Error updating event preference:', error);
      throw error;
    }
  },
  
  // Request permission for notifications
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!isSupported()) {
      console.warn('Push notifications are not supported in this browser');
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  },
  
  // Check if the browser supports service workers and push notifications
  isSupported,
  
  // Check if notifications are enabled
  hasNotificationPermission(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  },
  
  // Get the VAPID public key from the server
  async getVapidPublicKey(): Promise<string | null> {
    const url = '/api/notifications/vapid-public-key';
    console.log(`[NotificationService] Fetching VAPID public key from ${url}`);
    
    try {
      // Log the full URL being requested (for debugging CORS or path issues)
      const fullUrl = new URL(url, window.location.origin).toString();
      console.log('[NotificationService] Full request URL:', fullUrl);
      
      // Make a direct fetch call with detailed logging
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        mode: 'cors',
      });
      
      console.log('[NotificationService] Response status:', response.status, response.statusText);
      
      // Check for HTTP errors
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[NotificationService] HTTP error! status: ${response.status}, body:`, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Try to parse response as JSON
      let responseData;
      try {
        responseData = await response.json();
        console.log('[NotificationService] VAPID key response data:', responseData);
      } catch (jsonError) {
        const text = await response.text();
        console.error('[NotificationService] Failed to parse JSON response:', jsonError, 'Response text:', text);
        throw new Error('Invalid JSON response from server');
      }
      
      // The backend returns { success: true, publicKey: '...' }
      if (responseData?.success && responseData.publicKey) {
        console.log('[NotificationService] Successfully retrieved VAPID public key');
        return responseData.publicKey;
      }
      
      console.error('[NotificationService] Invalid VAPID key response format. Expected {success: true, publicKey: string}, got:', responseData);
      return null;
    } catch (error) {
      console.error('[NotificationService] Error getting VAPID public key:', error);
      if (error instanceof Error) {
        console.error('[NotificationService] Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
    
    // Additional Brave-specific setup if needed
    if (navigator.serviceWorker) {
      try {
        // Ensure the service worker is ready
        const registration = await navigator.serviceWorker.ready;
        console.log('[NotificationService] Service worker ready in Brave');
      } catch (error) {
        console.warn('[NotificationService] Error getting service worker registration in Brave:', error);
      }
    }
  }
  
  try {
    // Check for basic push notification support
    if (!('serviceWorker' in navigator)) {
      const errorMsg = 'Service workers are not supported in this browser';
      console.warn('[NotificationService]', errorMsg);
      throw new Error(errorMsg);
    }

    if (!('PushManager' in window)) {
      const errorMsg = 'Push notifications are not supported in this browser';
      console.warn('[NotificationService]', errorMsg);
      throw new Error(errorMsg);
    }

    console.log('[NotificationService] Requesting notification permission...');
    
    // Request notification permission if not already granted
    const permission = await this.requestNotificationPermission();
    console.log('[NotificationService] Notification permission status:', permission);
    
    if (permission !== 'granted') {
      const errorMsg = 'Notification permission not granted';
      console.warn('[NotificationService]', errorMsg);
      throw new Error(errorMsg);
    }

    // Get the service worker registration
    const registration = await navigator.serviceWorker.ready;
    
    // For Brave, wait a bit longer to ensure everything is ready
    if (isBrave) {
      console.log('[NotificationService] Waiting for Brave to be ready...');
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    // Get the VAPID public key
    const vapidPublicKey = await this.getVapidPublicKey();
    if (!vapidPublicKey) {
      const errorMsg = 'Failed to get VAPID public key';
      console.error('[NotificationService]', errorMsg);
      throw new Error(errorMsg);
    }

    console.log('[NotificationService] Converting VAPID key...');
    
    // Convert VAPID key to Uint8Array
    const convertedVapidKey = this.urlBase64ToUint8Array(vapidPublicKey);
    console.log('[NotificationService] VAPID key converted successfully');
    
    console.log('[NotificationService] Subscribing to push notifications...');
    
    // Prepare subscription options
    const options: PushSubscriptionOptionsInit = {
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey
    };
    
    console.log('[NotificationService] Subscribing with options:', options);
    
    // For Brave, add additional logging and error handling
    if (isBrave) {
      console.log('[NotificationService] Using Brave-specific subscription approach');
      console.warn('[NotificationService] If push subscription fails in Brave, please ensure:');
      console.warn('1. Brave Shields are disabled for this site');
      console.warn('2. Notifications are allowed in site settings');
      console.warn('3. The site is served over HTTPS');
    }
    
    // Try to subscribe with retries
    const subscription = await this.attemptPushSubscription(
      registration,
      options,
      isBrave ? 5 : 3,  // More retries for Brave
      isBrave ? 1000 : 500  // Longer delay for Brave
    );
    
    if (!subscription) {
      throw new Error('Failed to subscribe to push notifications');
    }
    
    console.log('[NotificationService] Successfully subscribed to push notifications:', subscription);
    
    try {
      // Prepare subscription data for the server
      let subscriptionData: any;
      if (typeof subscription.toJSON === 'function') {
        subscriptionData = subscription.toJSON();
      } else {
        // Fallback for browsers that don't support toJSON()
        const keyAuth = subscription.getKey('auth');
        const keyP256dh = subscription.getKey('p256dh');
        
        subscriptionData = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: keyP256dh ? btoa(String.fromCharCode(...new Uint8Array(keyP256dh))) : '',
            auth: keyAuth ? btoa(String.fromCharCode(...new Uint8Array(keyAuth))) : ''
          }
        };
      }
      
      console.log('Registering push subscription with server...');
      console.log('Subscription data:', subscriptionData);
      
      // Save the push subscription to the server
      await api.post('/api/users/me/push-subscription', {
        subscription,
        userId
      });
      console.log('[NotificationService] Push subscription saved to server');
      return subscription;
    } catch (error) {
      console.error('[NotificationService] Error saving push subscription:', error);
      // Don't throw the error here, as the subscription was successful locally
      // The server sync can be retried later
      return subscription;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[NotificationService] Error subscribing to push notifications:', errorMessage);
    
    // Provide more detailed error information for Brave
    if (isBrave) {
      console.warn('[NotificationService] Common Brave issues and solutions:');
      console.warn('1. Open brave://settings/content/notifications and ensure this site is allowed');
      console.warn('2. Try disabling Brave Shields for this site');
      console.warn('3. Restart Brave and try again');
    }
    
    throw error;
    if (!this.isSupported()) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      return subscription !== null;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  },
  
  // Send a test notification
  async sendTestNotification(userId: string): Promise<boolean> {
    try {
      await api.post('/api/notifications/test', { userId });
      return true;
    } catch (error) {
      console.error('Error sending test notification:', error);
      return false;
    }
  },
  
  // Get unique event types from events
  getUniqueEventTypes(events: CalendarEvent[]): string[] {
    const eventTypes = new Set<string>();
    
    events.forEach(event => {
      if (event.extendedProperties?.eventType) {
        eventTypes.add(event.extendedProperties.eventType);
      } else if (event.title) {
        // Fallback to using the title if no event type is specified
        eventTypes.add(event.title);
      }
    });
    
    return Array.from(eventTypes);
  },
  
  // Initialize push notifications
  async initializePushNotifications(userId: string): Promise<boolean> {
    try {
      // Check if notifications are supported and permission is granted
      if (!this.isSupported() || !this.hasNotificationPermission()) {
        console.log('Notifications not supported or permission not granted');
        return false;
      }

      // Check if already subscribed
      const isSubscribed = await this.isSubscribed();
      if (isSubscribed) {
        console.log('Already subscribed to push notifications');
        return true;
      }

      // Try to subscribe
      const subscription = await this.subscribeToPushNotifications(userId);
      return subscription !== null;
    } catch (error) {
      console.error('Error initializing push notifications:', error);
      return false;
    }
  }
};

// Export the notification service as default
export default notificationService;
