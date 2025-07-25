import React, { useState, useEffect, useRef } from 'react';
import { X, Bell, Check, AlertCircle, Search, Clock } from 'lucide-react';
import { useClickOutside } from '../hooks/useClickOutside';
import { CalendarEvent } from '../types/calendar';
// Import the notification service
import notificationService from '../services/notificationService';
import type { UserPreferences, EventPreference } from '../services/notificationService';

// Extend the CalendarEvent type to include extendedProps if needed
type ExtendedCalendarEvent = CalendarEvent & {
  extendedProps?: {
    eventType?: string;
  };
};

interface SettingsModalProps {
  onClose: () => void;
  events: CalendarEvent[];
  isFirstTime: boolean;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, events, isFirstTime }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [searchTerm, setSearchTerm] = useState('');
  const [preferences, setPreferences] = useState<UserPreferences>({
    email: '',
    notifyEmail: true,
    notifyBrowser: true,
    notifyAllEvents: true,
    email1hBefore: true,
    email10mBefore: true,
    browser1hBefore: true,
    browser10mBefore: true,
  });
  const [eventTypes, setEventTypes] = useState<{ [key: string]: boolean }>({});
  const modalRef = useRef<HTMLDivElement>(null);
  const emailUpdateTimer = useRef<NodeJS.Timeout | null>(null);

  // Close the modal when clicking outside
  useClickOutside(modalRef, onClose);

  // Load user preferences and event types when the modal opens
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);

        // Load user preferences first
        const prefs = await notificationService.getPreferences();
        setPreferences(prefs);

        // Extract unique event types from the events
        const types = new Set<string>();
        events.forEach((event: ExtendedCalendarEvent) => {
          if (event.extendedProps?.eventType) {
            types.add(event.extendedProps.eventType);
          } else if (event.title) {
            // Fallback to using the first word of the title as event type if no type is specified
            const typeFromTitle = event.title.split(' ')[0];
            if (typeFromTitle) types.add(typeFromTitle);
          }
        });

        // If no event types found, use some default ones
        if (types.size === 0) {
          types.add('Meeting');
          types.add('Appointment');
          types.add('Deadline');
        }

        // Load user's event type preferences and merge with available types
        const eventPrefs = await notificationService.getEventPreferences(Array.from(types));
        const eventTypesMap: { [key: string]: boolean } = {};

        // Initialize with default values first (enabled for new types if notifyAllEvents is true)
        types.forEach((type) => {
          eventTypesMap[type] = prefs.notifyAllEvents;
        });

        // Override with user's saved preferences
        eventPrefs.forEach((pref) => {
          if (eventTypesMap.hasOwnProperty(pref.event_type)) {
            eventTypesMap[pref.event_type] = pref.is_enabled;
          }
        });

        setEventTypes(eventTypesMap);

        // Set current notification permission state
        if (typeof Notification !== 'undefined') {
          setNotificationPermission(Notification.permission);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        alert('Failed to load notification settings. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    
    loadSettings();
  }, [events]);

  // Effect to check notification permission on mount and when it changes
  useEffect(() => {
    const checkNotificationPermission = async () => {
      const permission = await Notification.permission;
      setNotificationPermission(permission);
      
      // Update preferences to match the actual permission state
      if (permission === 'granted' && !preferences.notifyBrowser) {
        setPreferences(prev => ({ ...prev, notifyBrowser: true }));
      } else if (permission !== 'granted' && preferences.notifyBrowser) {
        setPreferences(prev => ({ ...prev, notifyBrowser: false }));
      }
    };
    
    checkNotificationPermission();
    
    // Listen for permission changes
    const handlePermissionChange = () => {
      checkNotificationPermission();
    };
    
    // Some browsers support permission change events
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'notifications' })
        .then(permissionStatus => {
          permissionStatus.addEventListener('change', handlePermissionChange);
          return () => permissionStatus.removeEventListener('change', handlePermissionChange);
        });
    }
  }, [preferences.notifyBrowser]);

  const showWelcomeNotification = () => {
    console.log('Attempting to show welcome notification...');
    
    // Check if the browser supports notifications
    if (!('Notification' in window)) {
      console.log('This browser does not support desktop notifications');
      return false;
    }

    // Create notification options
    const options = {
      body: 'You will now receive notifications in your browser for upcoming events.',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/calendar-192x192.png',
      vibrate: [200, 100, 200],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 'welcome-notification'
      }
    };

    try {
      // Check if we can use the service worker for notifications
      if ('serviceWorker' in navigator && 'showNotification' in ServiceWorkerRegistration.prototype) {
        console.log('Using service worker for notification');
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification('Browser Notifications Enabled', options);
        }).catch(err => {
          console.error('Service Worker notification error:', err);
          // Fallback to regular notifications if service worker fails
          if (Notification.permission === 'granted') {
            new Notification('Browser Notifications Enabled', options);
          }
        });
      } 
      // Fallback to regular notifications if service worker isn't available
      else if (Notification.permission === 'granted') {
        console.log('Using regular notification API');
        new Notification('Browser Notifications Enabled', options);
      } else {
        console.log('Notification permission not granted, requesting...');
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification('Browser Notifications Enabled', options);
          }
        });
      }
      return true;
    } catch (error) {
      console.error('Error showing welcome notification:', error);
      return false;
    }
  };

  const handleNotificationToggle = async (enabled: boolean) => {
    try {
      // If trying to enable notifications
      if (enabled) {
        // Check if already granted
        if (Notification.permission === 'granted') {
          return; // Already enabled, do nothing
        }
        
        // If previously denied, show message and don't proceed
        if (Notification.permission === 'denied') {
          setNotificationPermission('denied');
          alert('Notifications are blocked. Please enable them in your browser settings and try again.');
          return;
        }
        
        // Request permission
        const permission = await notificationService.requestNotificationPermission();
        setNotificationPermission(permission);
        
        if (permission === 'granted') {
          try {
            // Subscribe to push notifications
            await notificationService.subscribeToPushNotifications('current-user-id');
            // Show welcome notification
            showWelcomeNotification();
          } catch (error) {
            console.error('Error subscribing to push notifications:', error);
            setNotificationPermission('denied');
            alert('Failed to enable notifications. Please try again.');
          }
        } else {
          // If permission was denied
          setNotificationPermission('denied');
          alert('Notifications are blocked. Please enable them in your browser settings and try again.');
        }
      } else {
        // Disable notifications
        try {
          await notificationService.unsubscribeFromPushNotifications('current-user-id');
          // Don't update preferences.notifyBrowser here as it's controlled by the email toggle
        } catch (error) {
          console.error('Error unsubscribing from push notifications:', error);
          alert('Failed to disable notifications. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      setNotificationPermission(Notification.permission);
      alert('An error occurred. Please try again.');
    }
  };

  const toggleEventType = async (eventType: string) => {
    const newValue = !eventTypes[eventType];
    
    // Update local state immediately for better UX
    setEventTypes(prev => ({
      ...prev,
      [eventType]: newValue,
    }));
    
    try {
      // Update on the server
      await notificationService.updateEventPreference(eventType, newValue);
    } catch (error) {
      console.error('Error updating event preference:', error);
      // Revert on error
      setEventTypes(prev => ({
        ...prev,
        [eventType]: !newValue,
      }));
    }
  };

  const toggleAllEventTypes = async (enabled: boolean) => {
    const updatedEventTypes: { [key: string]: boolean } = {};
    
    // Update local state
    Object.keys(eventTypes).forEach(type => {
      updatedEventTypes[type] = enabled;
    });
    
    setEventTypes(updatedEventTypes);
    
    try {
      // Update all event types on the server
      await Promise.all(
        Object.keys(updatedEventTypes).map(type =>
          notificationService.updateEventPreference(type, enabled)
        )
      );
      
      // Update the global preference
      const updatedPrefs = { ...preferences, notifyAllEvents: enabled };
      await notificationService.updatePreferences(updatedPrefs);
      setPreferences(updatedPrefs);
    } catch (error) {
      console.error('Error updating all event types:', error);
      // Revert on error
      setEventTypes({...eventTypes});
    }
  };

  // Save all settings to the server
  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      // 1. Save all preferences
      await notificationService.updatePreferences(preferences);
      
      // 2. Save all event type preferences
      await Promise.all(
        Object.entries(eventTypes).map(([eventType, isEnabled]) =>
          notificationService.updateEventPreference(eventType, isEnabled)
        )
      );
      
      // 3. If browser notifications are enabled, ensure we're subscribed
      if (preferences.notifyBrowser && notificationPermission === 'granted') {
        await notificationService.subscribeToPushNotifications('current-user-id');
      }
      
      // Close the modal on success
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreferenceChange = async (key: keyof UserPreferences, value: boolean | string) => {
    // For email updates, handle it with debouncing
    if (key === 'email') {
      const newEmail = String(value);
      
      // Update the UI optimistically
      setPreferences(prev => ({
        ...prev,
        email: newEmail
      }));

      // Debounce the server update to avoid too many requests while typing
      const updateEmail = async () => {
        try {
          // Get current preferences from server to ensure we have the latest
          const currentPrefs = await notificationService.getPreferences();
          
          // Update only the email field, preserving other preferences
          await notificationService.updatePreferences({
            ...currentPrefs,
            email: newEmail
          });
          
          console.log('Email updated successfully to:', newEmail);
        } catch (error) {
          console.error('Error updating email:', error);
          // Revert on error using the last known good state from the server
          const currentPrefs = await notificationService.getPreferences();
          setPreferences(currentPrefs);
        }
      };

      // Clear any pending email updates and set a new one
      if (emailUpdateTimer.current) {
        clearTimeout(emailUpdateTimer.current);
      }
      emailUpdateTimer.current = setTimeout(updateEmail, 1000);
      return;
    }
    
    // For toggle preferences (notifyEmail, notifyBrowser, etc.)
    const previousState = { ...preferences };
    
    // Update the UI optimistically
    const updatedPrefs = {
      ...preferences,
      [key]: Boolean(value)
    };
    
    setPreferences(updatedPrefs);
    
    try {
      // Send the update to the server
      await notificationService.updatePreferences(updatedPrefs);
      
      // If toggling notifyAllEvents, update all event types
      if (key === 'notifyAllEvents') {
        const newValue = Boolean(value);
        const updatedEventTypes = { ...eventTypes };
        
        // Update all event types to match the new notifyAllEvents setting
        Object.keys(updatedEventTypes).forEach(type => {
          updatedEventTypes[type] = newValue;
        });
        
        setEventTypes(updatedEventTypes);
        
        // Update all event type preferences on the server
        await Promise.all(
          Object.entries(updatedEventTypes).map(([eventType, isEnabled]) =>
            notificationService.updateEventPreference(eventType, isEnabled)
          )
        );
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
      // Revert on error
      setPreferences(previousState);
      
      // Show error to user
      alert('Failed to update preferences. Please try again.');
    }
  };

  // Filter event types based on search term
  const filteredEventTypes = Object.entries(eventTypes).filter(([eventType]) =>
    eventType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const allSelected = Object.values(eventTypes).every(Boolean);
  const someSelected = Object.values(eventTypes).some(Boolean) && !allSelected;

  const getNotificationStatus = () => {
    if (notificationPermission === 'granted' && preferences.notifyBrowser) {
      return { text: 'Enabled', color: 'text-[#66ffcc]', icon: Check };
    } else if (notificationPermission === 'denied') {
      return { text: 'Blocked', color: 'text-red-400', icon: AlertCircle };
    } else {
      return { text: 'Click to enable', color: 'text-[#c9c9d1]', icon: Bell };
    }
  };

  const status = getNotificationStatus();
  const StatusIcon = status.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div 
        ref={modalRef}
        className="bg-[#1a1a2e] bg-opacity-90 backdrop-blur-lg border border-white border-opacity-12 rounded-2xl max-w-2xl w-full max-h-[90vh] shadow-2xl shadow-[#886FFF]/30 flex flex-col overflow-hidden"
      >
        {/* Fixed Header */}
        <div className="flex justify-between items-start p-6 pb-4 border-b border-white border-opacity-10 flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-white">Settings</h2>
            {isFirstTime && (
              <p className="text-[#c9c9d1] text-sm mt-2">Welcome! Let's set up your preferences.</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#886FFF] hover:bg-opacity-20 rounded-lg transition-colors duration-200 flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 pt-4">
          <div className="space-y-6">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#886FFF]"></div>
              </div>
            ) : (
              <>
                {/* Email Notifications Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Email Notifications</h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={preferences.notifyEmail}
                        onChange={(e) => handlePreferenceChange('notifyEmail', e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#886FFF]"></div>
                    </label>
                  </div>

                  {preferences.notifyEmail && (
                    <div className="pl-2 space-y-4 mt-4">
                      <div className="space-y-2">
                        <label htmlFor="email" className="text-sm text-[#c9c9d1] block">
                          Email Address
                        </label>
                        <input
                          id="email"
                          type="email"
                          value={preferences.email || ''}
                          onChange={(e) => handlePreferenceChange('email', e.target.value)}
                          className="w-full px-4 py-2 bg-[#0e0e10] border border-white border-opacity-20 rounded-lg text-white placeholder-[#c9c9d1] focus:border-[#4fc3f7] focus:ring-2 focus:ring-[#4fc3f7] focus:ring-opacity-20 transition-colors duration-200"
                          placeholder="your.email@example.com"
                        />
                      </div>
                      
                      <div className="pt-2">
                        <div className="flex items-center mb-2">
                          <Clock className="w-4 h-4 mr-2 text-[#c9c9d1]" />
                          <span className="text-sm text-[#c9c9d1]">Remind me before events:</span>
                        </div>

                        <div className="flex flex-wrap gap-4">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              className="w-4 h-4 text-[#886FFF] bg-[#0e0e10] border-white border-opacity-20 rounded focus:ring-[#886FFF] focus:ring-2"
                              checked={preferences.email1hBefore}
                              onChange={(e) => handlePreferenceChange('email1hBefore', e.target.checked)}
                            />
                            <span className="text-sm text-[#c9c9d1]">1 hour before</span>
                          </label>

                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              className="w-4 h-4 text-[#886FFF] bg-[#0e0e10] border-white border-opacity-20 rounded focus:ring-[#886FFF] focus:ring-2"
                              checked={preferences.email10mBefore}
                              onChange={(e) => handlePreferenceChange('email10mBefore', e.target.checked)}
                            />
                            <span className="text-sm text-[#c9c9d1]">10 minutes before</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <hr className="border-white border-opacity-10 my-4" />

                {/* Browser Notifications Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Browser Notifications</h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={notificationPermission === 'granted'}
                        onChange={(e) => handleNotificationToggle(e.target.checked)}
                        disabled={notificationPermission === 'denied'}
                      />
                      <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${notificationPermission === 'granted' ? 'bg-[#886FFF]' : 'bg-gray-700'} ${notificationPermission === 'denied' ? 'opacity-50' : ''}`}></div>
                    </label>
                  </div>

                  <div className={`flex items-center gap-2 ${status.color} text-sm mt-2`}>
                    <StatusIcon className="w-4 h-4 flex-shrink-0" />
                    <span>{status.text}</span>
                  </div>

                  {notificationPermission === 'denied' ? (
                    <div className="mt-2 text-sm text-red-400">
                      Notifications are blocked. Please update your browser settings.
                    </div>
                  ) : notificationPermission === 'granted' ? (
                    <div className="pl-2 space-y-4 mt-4">
                      <div className="space-y-2">
                        <div className="text-sm text-[#c9c9d1] mb-2">Remind me before events:</div>
                        <div className="flex flex-wrap gap-4">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              className="w-4 h-4 text-[#886FFF] bg-[#0e0e10] border-white border-opacity-20 rounded focus:ring-[#886FFF] focus:ring-2"
                              checked={preferences.browser1hBefore}
                              onChange={(e) => handlePreferenceChange('browser1hBefore', e.target.checked)}
                            />
                            <span className="text-sm text-[#c9c9d1]">1 hour before</span>
                          </label>

                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              className="w-4 h-4 text-[#886FFF] bg-[#0e0e10] border-white border-opacity-20 rounded focus:ring-[#886FFF] focus:ring-2"
                              checked={preferences.browser10mBefore}
                              onChange={(e) => handlePreferenceChange('browser10mBefore', e.target.checked)}
                            />
                            <span className="text-sm text-[#c9c9d1]">10 minutes before</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <hr className="border-white border-opacity-10 my-4" />

                {/* Event Types Section */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-white">Notify me for these event types:</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleAllEventTypes(true)}
                        className="text-xs px-3 py-1 bg-[#886FFF] hover:bg-[#ae7aff] rounded transition-colors duration-200 flex items-center gap-1"
                        disabled={allSelected}
                      >
                        <Check className="w-3 h-3" />
                        <span>All</span>
                      </button>
                      <button
                        onClick={() => toggleAllEventTypes(false)}
                        className="text-xs px-3 py-1 bg-[#33334d] hover:bg-[#44445d] rounded transition-colors duration-200 flex items-center gap-1"
                        disabled={!someSelected && !allSelected}
                      >
                        <X className="w-3 h-3" />
                        <span>None</span>
                      </button>
                    </div>
                  </div>

                  <div className="mb-3 text-sm text-[#c9c9d1]">
                    {someSelected
                      ? `${Object.values(eventTypes).filter(Boolean).length} of ${Object.keys(eventTypes).length} selected`
                      : allSelected
                      ? 'All event types selected'
                      : 'No event types selected'}
                  </div>

                  {/* Search Bar */}
                  <div className="relative mb-3">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-[#c9c9d1]" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search event types..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-[#0e0e10] border border-white border-opacity-20 rounded-lg text-white placeholder-[#c9c9d1] focus:border-[#4fc3f7] focus:ring-2 focus:ring-[#4fc3f7] focus:ring-opacity-20 transition-colors duration-200"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-3">
                    {filteredEventTypes.length > 0 ? (
                      filteredEventTypes.map(([eventType, enabled]) => (
                        <label key={eventType} className="flex items-center gap-3 cursor-pointer group p-2 rounded-lg hover:bg-white/5 transition-colors">
                          <div
                            className={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${
                              enabled ? 'bg-[#886FFF] border-[#886FFF]' : 'border-white/30'
                            }`}
                          >
                            {enabled && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className="text-sm text-[#c9c9d1] group-hover:text-white transition-colors">
                            {eventType}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleEventType(eventType);
                            }}
                            className="ml-auto opacity-0 group-hover:opacity-100 text-[#c9c9d1] hover:text-white transition-opacity"
                          >
                            {enabled ? 'Disable' : 'Enable'}
                          </button>
                        </label>
                      ))
                    ) : (
                      <div className="text-center py-6 text-[#c9c9d1] text-sm bg-white/5 rounded-lg">
                        {searchTerm ? 'No matching event types found' : 'No event types available'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Global Notification Settings */}
                <div className="pt-4 border-t border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-4">Global Notification Settings</h3>

                  <div className="space-y-4">
                    <div className="relative">
                      <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-white/5 transition-colors">
                        <div className="mt-0.5 flex-shrink-0">
                          <div
                            className={`w-5 h-5 border rounded flex items-center justify-center transition-colors ${
                              preferences.notifyAllEvents ? 'bg-[#886FFF] border-[#886FFF]' : 'border-white/30'
                            }`}
                          >
                            {preferences.notifyAllEvents && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white">Auto-enable new event types</div>
                          <div className="text-sm text-gray-400">
                            When enabled, new event types will be automatically enabled for notifications. Your existing selections remain unchanged.
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          checked={preferences.notifyAllEvents}
                          onChange={(e) => {
                            e.stopPropagation();
                            handlePreferenceChange('notifyAllEvents', e.target.checked);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="p-6 pt-4 border-t border-white border-opacity-10 flex-shrink-0">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-transparent border border-white/20 hover:bg-white/5 rounded-lg font-medium transition-colors duration-200"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="flex-1 py-3 bg-[#886FFF] hover:bg-[#ae7aff] rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : 'Done'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;