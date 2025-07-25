import api from './api';
import { CalendarEvent } from '../types/calendar';

// Check if the browser supports service workers and push notifications
const isSupported = (): boolean => {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

// Default notification preferences
const DEFAULT_PREFERENCES = {
  email: '',
  notifyEmail: true,
  notifyBrowser: true,
  notifyAllEvents: true,
  email1hBefore: true,
  email10mBefore: true,
  browser1hBefore: true,
  browser10mBefore: true,
  notifyNewEvents: true
};

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
  // New event notification setting
  notifyNewEvents: boolean;
}

export interface EventPreference {
  event_type: string;
  is_enabled: boolean;
}

const notificationService = {
  // Get user notification preferences
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
          email1hBefore: oldPrefs.email1hBefore !== false,
          email10mBefore: oldPrefs.email10mBefore !== false,
          browser1hBefore: oldPrefs.browser1hBefore !== false,
          browser10mBefore: oldPrefs.browser10mBefore !== false,
          notifyNewEvents: oldPrefs.notifyNewEvents !== false
        };
      }
      
      // Merge with default preferences to ensure all fields are present
      return { ...DEFAULT_PREFERENCES, ...(response || {}) };
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
        browser10mBefore: true,
        notifyNewEvents: true
      };
    }
  },
  
  // Update notification preferences
  async updatePreferences(updates: Partial<UserPreferences>): Promise<UserPreferences> {
    try {
      // Get current preferences first to ensure we don't lose any settings
      const currentPrefs = await this.getPreferences();
      
      // Merge updates with current preferences
      const mergedPrefs = { ...currentPrefs, ...updates };
      
      // Prepare the data to send to the server with snake_case field names
      const data = {
        email: mergedPrefs.email,
        notify_email: mergedPrefs.notifyEmail,
        notify_browser: mergedPrefs.notifyBrowser,
        notify_all_events: mergedPrefs.notifyAllEvents,
        email_1h_before: mergedPrefs.email1hBefore,
        email_10m_before: mergedPrefs.email10mBefore,
        browser_1h_before: mergedPrefs.browser1hBefore,
        browser_10m_before: mergedPrefs.browser10mBefore,
        notify_new_events: mergedPrefs.notifyNewEvents
      };
      
      // Remove undefined values to avoid overriding existing values
      Object.keys(data).forEach((key: string) => {
        if (data[key as keyof typeof data] === undefined) {
          delete (data as any)[key];
        }
      });
      
      // Save to the server
      const result = await api.put('/api/users/me/preferences', data);
      
      // If email notifications are enabled, ensure we have an email address
      if (result.notifyEmail && !result.email) {
        throw new Error('Email address is required when email notifications are enabled');
      }
      
      // Convert snake_case response back to camelCase for the frontend
      return {
        email: result.email || '',
        notifyEmail: result.notify_email !== false,
        notifyBrowser: result.notify_browser !== false,
        notifyAllEvents: result.notify_all_events !== false,
        email1hBefore: result.email_1h_before !== false,
        email10mBefore: result.email_10m_before !== false,
        browser1hBefore: result.browser_1h_before !== false,
        browser10mBefore: result.browser_10m_before !== false,
        notifyNewEvents: result.notify_new_events !== false
      };
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
      
      // If there are no available event types, return an empty array
      if (!availableEventTypes || availableEventTypes.length === 0) {
        return [];
      }
      
      // Get the user's existing event type preferences
      const response = await api.get('/api/users/me/event-preferences');
      const existingPrefs = Array.isArray(response) ? response : [];
      
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
          ? prefs.notifyAllEvents  // For new users, use the global notifyAllEvents setting
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
    if (!eventType) {
      throw new Error('Event type is required');
    }
    
    try {
      // Get current preferences to check notifyAllEvents setting
      const prefs = await this.getPreferences();
      
      // If this is a new event type and notifyAllEvents is enabled, auto-enable it
      if (isNewType && prefs.notifyAllEvents) {
        isEnabled = true;
      }
      
      // Update the preference on the server
      await api.post('/api/users/me/event-preferences', {
        eventType,
        isEnabled
      });
      
      // If we're enabling this event type, ensure notifications are enabled
      if (isEnabled) {
        await this.ensureNotificationsEnabled();
      }
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
    // Use the same base URL as other API calls
    const baseUrl = import.meta.env.VITE_API_URL || '';
    const url = `${baseUrl}/api/notifications/vapid-public-key`;
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
      }
      return null;
    }
  },
  
  // Check if the browser is Brave
  isBraveBrowser(): boolean {
    if (typeof navigator === 'undefined') return false;
    // @ts-ignore - navigator.brave is specific to Brave browser
    return (navigator.brave && typeof navigator.brave.isBrave === 'function') || false;
  },

  // Subscribe to push notifications with enhanced error handling for Brave
  async subscribeToPushNotifications(userId: string, userEmail: string): Promise<PushSubscription | null> {
    console.log('[NotificationService] Starting push notification subscription...');
    
    const isBrave = await this.isBraveBrowser();
    if (isBrave) {
      console.log('[NotificationService] Detected Brave browser, applying compatibility workarounds');
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

      console.log('[NotificationService] Getting service worker registration...');
      
      // Get the service worker registration with error handling
      let registration;
      try {
        registration = await navigator.serviceWorker.ready;
        console.log('[NotificationService] Service worker registration:', registration);
      } catch (error) {
        console.error('[NotificationService] Error getting service worker registration:', error);
        if (isBrave) {
          console.warn('[NotificationService] Brave may have blocked service worker registration. ' +
                     'Please check brave://settings/shields and ensure this site is not blocked.');
        }
        throw new Error('Failed to initialize service worker');
      }
      
      if (!registration.pushManager) {
        const errorMsg = 'PushManager not available in service worker';
        console.error('[NotificationService]', errorMsg);
        if (isBrave) {
          console.warn('[NotificationService] In Brave, ensure you have disabled the Brave Shields for this site');
        }
        throw new Error(errorMsg);
      }
      
      // Check for existing subscription first
      let subscription: PushSubscription | null = null;
      try {
        subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          console.log('[NotificationService] Found existing push subscription:', subscription);
          return subscription;
        }
      } catch (error) {
        console.warn('[NotificationService] Error checking for existing subscription:', error);
        // Continue to try creating a new subscription
      }
      
      // Get the VAPID public key
      console.log('[NotificationService] Getting VAPID public key...');
      const vapidPublicKey = await this.getVapidPublicKey();
      
      if (!vapidPublicKey) {
        const errorMsg = 'Failed to get VAPID public key';
        console.error('[NotificationService]', errorMsg);
        throw new Error(errorMsg);
      }

      console.log('[NotificationService] Converting VAPID key...');
      
      // Convert VAPID key to Uint8Array
      let convertedVapidKey: Uint8Array;
      try {
        convertedVapidKey = this.urlBase64ToUint8Array(vapidPublicKey);
        console.log('[NotificationService] VAPID key converted successfully');
      } catch (error) {
        console.error('[NotificationService] Error converting VAPID key:', error);
        throw new Error('Invalid VAPID public key format');
      }

      console.log('[NotificationService] Subscribing to push notifications...');
      
      try {
        // For Brave, we might need to try a different approach
        if (isBrave) {
          console.log('[NotificationService] Using Brave-specific subscription approach');
          // Try with a small timeout to ensure everything is ready
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Subscribe to push notifications with error handling for different browsers
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });

        console.log('[NotificationService] Successfully subscribed to push notifications:', subscription);
      } catch (subscribeError) {
        console.error('[NotificationService] Error during push subscription:', subscribeError);
        
        // Provide specific guidance for Brave
        if (isBrave) {
          console.warn('[NotificationService] Brave-specific push notification issue detected.');
          console.warn('Please ensure the following Brave settings are configured:');
          console.warn('1. Open brave://settings/shields and disable Shields for this site');
          console.warn('2. Go to brave://settings/content/notifications and ensure this site is allowed');
          console.warn('3. Restart the browser and try again');
        } else if (navigator.userAgent.indexOf('Firefox') !== -1) {
          console.warn('[NotificationService] Firefox may require additional configuration for push notifications');
        } else if (navigator.userAgent.indexOf('Safari') !== -1) {
          console.warn('[NotificationService] Safari has limited support for push notifications');
        }
        
        throw new Error('Failed to subscribe to push notifications. ' + 
          (isBrave ? 'Please check Brave browser settings and try again.' : 'Please check browser permissions.'));
      }
      
      try {
        console.log('[NotificationService] Sending subscription to server...');
        
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
        
        if (!userEmail) {
          console.warn('[NotificationService] No user email provided for push subscription');
          throw new Error('User email is required for push notifications');
        }
        
        console.log('[NotificationService] Using email for push subscription:', userEmail);
        
        // Send the subscription data in the format expected by the backend
        await api.post('/api/users/me/push-subscriptions', {
          endpoint: subscriptionData.endpoint,
          keys: subscriptionData.keys,
          email: userEmail
        });
        
        console.log('[NotificationService] Subscription saved to server successfully');
        return subscription;
        
      } catch (apiError) {
        console.error('[NotificationService] Failed to save subscription to server:', apiError);
        // Don't throw here, we still have a valid subscription locally
        return subscription;
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[NotificationService] Error in subscribeToPushNotifications:', errorMsg, error);
      
      // Provide more user-friendly error messages
      if (isBrave && errorMsg.includes('push service error')) {
        throw new Error('Brave blocked push notification subscription. Please disable Shields for this site and try again.');
      }
      
      throw error; // Re-throw to allow handling in the UI
    }
  },
  
  // Convert a base64 string to Uint8Array for use with the Push API
  urlBase64ToUint8Array(base64String: string): Uint8Array {
    console.log('[NotificationService] Converting base64 string to Uint8Array:', base64String);
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    console.log('[NotificationService] Successfully converted VAPID key to Uint8Array');
    return outputArray;
  },
  
  // Unsubscribe from push notifications
  async unsubscribeFromPushNotifications(_userId: string): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        
        // Notify the server about the unsubscription
        try {
          // Use fetch directly to send DELETE with body
          console.log('Unsubscribing push subscription from server...');
          await fetch('/api/users/me/push-subscriptions', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });
          console.log('Successfully unsubscribed from push notifications');
        } catch (apiError) {
          console.error('Failed to notify server about unsubscription:', apiError);
          // Continue with local unsubscription even if server notification fails
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      throw error;
    }
  },
  
  // Check if the user is subscribed to push notifications
  async isSubscribed(): Promise<boolean> {
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
    const types = new Set<string>();
    
    if (!events || !Array.isArray(events)) {
      return [];
    }
    
    events.forEach(event => {
      if (event?.extendedProperties?.eventType) {
        types.add(event.extendedProperties.eventType);
      } else if (event?.title) {
        // Fallback to using the title if no event type is specified
        types.add(event.title);
      }
    });
    
    return Array.from(types).sort((a, b) => a.localeCompare(b));
  },
  
  // Ensure notifications are enabled for the user
  async ensureNotificationsEnabled(): Promise<void> {
    try {
      const prefs = await this.getPreferences();
      
      // If no preferences are set yet, initialize with defaults
      if (!prefs) {
        await this.updatePreferences(DEFAULT_PREFERENCES);
      }
    } catch (error) {
      console.error('Error ensuring notifications are enabled:', error);
      throw error;
    }
  },
  
  // Validate email address
  isValidEmail(email: string): boolean {
    if (!email) return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  },
  
  // Get default notification preferences
  getDefaultPreferences(): UserPreferences {
    return { ...DEFAULT_PREFERENCES };
  },
  
  // Save all preferences in one request
  async saveAllPreferences(preferences: any): Promise<{ success: boolean }> {
    try {
      // First, save the main preferences with camelCase field names
      const { eventPreferences, ...mainPreferences } = preferences;
      
      // Save main preferences - use the same property names as the UserPreferences interface
      await this.updatePreferences({
        email: mainPreferences.email,
        notifyEmail: mainPreferences.notifyEmail,
        notifyBrowser: mainPreferences.notifyBrowser,
        notifyAllEvents: mainPreferences.notifyAllEvents,
        email1hBefore: mainPreferences.email1hBefore,
        email10mBefore: mainPreferences.email10mBefore,
        browser1hBefore: mainPreferences.browser1hBefore,
        browser10mBefore: mainPreferences.browser10mBefore,
        notifyNewEvents: mainPreferences.notifyNewEvents
      });
      
      // Then save event type preferences
      if (eventPreferences && Array.isArray(eventPreferences)) {
        // Process each event preference
        for (const pref of eventPreferences) {
          if (pref && typeof pref.eventType !== 'undefined' && typeof pref.isEnabled !== 'undefined') {
            try {
              // Send each update individually to ensure they're processed
              await api.post('/api/users/me/event-preferences', {
                eventType: pref.eventType,
                isEnabled: pref.isEnabled,
                email: mainPreferences.email // Include email in the request
              });
            } catch (error) {
              console.error(`Error updating event preference for ${pref.eventType}:`, error);
              // Continue with other preferences even if one fails
            }
          }
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error saving all preferences:', error);
      throw new Error('Failed to save preferences');
    }
  },
  
  // Initialize push notifications
  async initializePushNotifications(userId: string, userEmail: string): Promise<boolean> {
    try {
      // Check if notifications are supported and permission is granted
      if (!this.isSupported() || !this.hasNotificationPermission()) {
        console.log('Notifications not supported or permission not granted');
        return false;
      }

      if (!userEmail) {
        console.error('User email is required for push notifications');
        return false;
      }

      // Check if already subscribed
      const isSubscribed = await this.isSubscribed();
      if (isSubscribed) {
        console.log('Already subscribed to push notifications');
        return true;
      }

      console.log('Initializing push notifications for email:', userEmail);
      
      // Try to subscribe with the user's email
      const subscription = await this.subscribeToPushNotifications(userId, userEmail);
      return subscription !== null;
    } catch (error) {
      console.error('Error initializing push notifications:', error);
      return false;
    }
  }
};

// Export the notification service as default
export default notificationService;
