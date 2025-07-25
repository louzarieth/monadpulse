import React, { useState, useEffect, useRef } from 'react';
import { X, AlertCircle, Search } from 'lucide-react';
import { useClickOutside } from '../hooks/useClickOutside';
import { CalendarEvent } from '../types/calendar';
import notificationService from '../services/notificationService';
import type { UserPreferences } from '../services/notificationService';

type ExtendedCalendarEvent = CalendarEvent & {
  extendedProps?: {
    eventType?: string;
  };
};

interface BulkSettingsModalProps {
  onClose: () => void;
  events: CalendarEvent[];
  isFirstTime: boolean;
}

interface BulkSettingsState {
  preferences: UserPreferences;
  eventPreferences: { [key: string]: boolean };
}

const BulkSettingsModal: React.FC<BulkSettingsModalProps> = ({ onClose, events }) => {
  // Generate unique IDs for form elements
  const modalId = React.useId();
  const emailId = `email-${modalId}`;
  const notifyEmailId = `notify-email-${modalId}`;
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [emailError, setEmailError] = useState('');
  const [browserReminderError, setBrowserReminderError] = useState('');
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [state, setState] = useState<BulkSettingsState>({
    preferences: {
      email: '',
      notifyEmail: true,
      notifyBrowser: false, // Default to false, will be updated after loading settings
      notifyAllEvents: true,
      email1hBefore: true,
      email10mBefore: true,
      browser1hBefore: true,
      browser10mBefore: true,
      notifyNewEvents: true,
    },
    eventPreferences: {}
  });
  
  const modalRef = useRef<HTMLDivElement>(null);
  useClickOutside(modalRef, onClose);

  // Check notification permission on component mount
  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Load settings when component mounts
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        
        // Load user preferences
        const prefs = await notificationService.getPreferences();
        
        // Update notifyBrowser based on current permission status
        if (typeof Notification !== 'undefined') {
          // Only enable browser notifications if permission was previously granted
          // and the user had it enabled in their preferences
          prefs.notifyBrowser = prefs.notifyBrowser && Notification.permission === 'granted';
        } else {
          // If notifications aren't supported, make sure it's off
          prefs.notifyBrowser = false;
        }

        // Extract unique event types from events
        const types = new Set<string>();
        events.forEach((event: ExtendedCalendarEvent) => {
          if (event.extendedProps?.eventType) {
            types.add(event.extendedProps.eventType);
          } else if (event.title) {
            types.add(event.title);
          }
        });

        // If no event types found, use some default ones
        if (types.size === 0) {
          types.add('Meeting');
          types.add('Appointment');
          types.add('Deadline');
        }

        // Load user's event type preferences
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

        // Update state with loaded data
        setState({
          preferences: prefs,
          eventPreferences: eventTypesMap
        });
      } catch (error) {
        console.error('Error loading settings:', error);
        alert('Failed to load notification settings. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [events]);

  // Show welcome notification
  const showWelcomeNotification = () => {
    try {
      if (typeof Notification === 'undefined') {
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

      // Try to show the notification using the service worker if available
      if ('serviceWorker' in navigator && 'showNotification' in ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification('Browser Notifications Enabled', options);
        });
      }
      // Fallback to regular notification API
      else if (Notification.permission === 'granted') {
        new Notification('Browser Notifications Enabled', options);
      }
      
      return true;
    } catch (error) {
      console.error('Error showing welcome notification:', error);
      return false;
    }
  };

  // Request browser notification permission
  const requestNotificationPermission = async (): Promise<boolean> => {
    try {
      if (typeof Notification === 'undefined') {
        console.warn('This browser does not support notifications');
        setNotificationPermission('denied');
        return false;
      }

      // If already granted, return true
      if (Notification.permission === 'granted') {
        setNotificationPermission('granted');
        showWelcomeNotification(); // Show welcome notification if already granted
        return true;
      }

      // If previously denied, don't show the permission prompt again
      if (Notification.permission === 'denied') {
        setNotificationPermission('denied');
        return false;
      }

      // Request permission
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      // If permission is denied, update the state to reflect that
      if (permission === 'denied') {
        return false;
      }
      
      // Show welcome notification when permission is granted
      if (permission === 'granted') {
        showWelcomeNotification();
      }
      
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      setNotificationPermission('denied');
      return false;
    }
  };

  // Validate browser reminder toggles
  const validateBrowserReminderToggles = (prefs: UserPreferences): boolean => {
    if (!prefs.notifyBrowser) {
      setBrowserReminderError('');
      return true; // Skip validation if browser notifications are off
    }
    
    const hasReminderEnabled = prefs.browser1hBefore || prefs.browser10mBefore;
    if (!hasReminderEnabled) {
      setBrowserReminderError('Please enable at least one reminder time');
      return false;
    }
    
    setBrowserReminderError('');
    return true;
  };
  
  // Validate all preferences
  const validateAllPreferences = (prefs: UserPreferences): boolean => {
    // Only validate email format if notifications are enabled
    let isEmailValid = true;
    if (prefs.notifyEmail) {
      isEmailValid = !!prefs.email && validateEmail(prefs.email, true);
    }
    
    // Only validate email reminders if email notifications are enabled
    const isEmailRemindersValid = !prefs.notifyEmail || 
      (prefs.email1hBefore || prefs.email10mBefore);
    
    // Validate browser reminders if browser notifications are enabled
    const isBrowserRemindersValid = !prefs.notifyBrowser || 
      (prefs.browser1hBefore || prefs.browser10mBefore);
    
    // Update browser reminder error message if needed
    if (prefs.notifyBrowser && !isBrowserRemindersValid) {
      setBrowserReminderError('Please enable at least one reminder time');
    } else {
      setBrowserReminderError('');
    }
    
    return isEmailValid && isEmailRemindersValid && isBrowserRemindersValid;
  };

  // Handle preference changes
  const handlePreferenceChange = async (key: keyof UserPreferences, value: boolean | string) => {
    // Prevent disabling browser notifications when permission is granted
    if (key === 'notifyBrowser' && value === false && notificationPermission === 'granted') {
      setBrowserReminderError('To disable browser notifications, please update your browser settings.');
      return;
    }
    
    const newPreferences = { ...state.preferences, [key]: value };
    
    // Special handling for notification permission
    if (key === 'notifyBrowser' && value === true) {
      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) {
        // If permission was denied, keep the toggle off
        return; // Don't update the state if permission was denied
      }
      // Only update the state if permission was granted
      setState(prev => ({
        ...prev,
        preferences: {
          ...prev.preferences,
          notifyBrowser: true
        }
      }));
      return;
    }
    
    // Handle email validation
    if (key === 'email' && typeof value === 'string') {
      if (state.preferences.notifyEmail) {
        validateEmail(value, false);
      }
    }
    // Handle email preference changes
    else if (key === 'notifyEmail' && typeof value === 'boolean') {
      // If enabling email notifications, validate the email
      if (value && state.preferences.email) {
        validateEmail(state.preferences.email, true);
      }
    }
    
    // Validate browser reminders if toggling browser notifications or reminder times
    if (key === 'notifyBrowser' || key === 'browser1hBefore' || key === 'browser10mBefore') {
      validateBrowserReminderToggles(newPreferences);
    }
    
    setState(prev => ({
      ...prev,
      preferences: newPreferences as UserPreferences
    }));
  };

  // Handle event preference changes
  const handleEventPreferenceChange = (eventType: string, isEnabled: boolean) => {
    setState(prev => ({
      ...prev,
      eventPreferences: {
        ...prev.eventPreferences,
        [eventType]: isEnabled
      }
    }));
  };

  // Toggle all event types
  const toggleAllEventTypes = (enabled: boolean) => {
    const updatedEventPrefs = { ...state.eventPreferences };
    
    // Update all event types
    Object.keys(updatedEventPrefs).forEach(type => {
      updatedEventPrefs[type] = enabled;
    });
    
    setState(prev => ({
      ...prev,
      eventPreferences: updatedEventPrefs,
      preferences: {
        ...prev.preferences,
        notifyAllEvents: enabled
      }
    }));
  };

  // Handle email toggle
  const handleEmailToggle = (isEnabled: boolean) => {
    // If enabling, validate the email first
    if (isEnabled && !validateEmail(state.preferences.email, true)) {
      return; // Don't enable if email is invalid
    }
    
    // Clear any email error when toggling
    setEmailError('');
    
    setState(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        notifyEmail: isEnabled
      }
    }));
  };

  // Validate email format
  const validateEmail = (email: string, showError: boolean = false): boolean => {
    if (!email) {
      if (showError) setEmailError('Email is required');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      if (showError) setEmailError('Please enter a valid email address');
      return false;
    }
    
    setEmailError('');
    return true;
  };


  // Save all settings
  const handleSave = async () => {
    // Always validate email, regardless of notification toggle state
    if (!validateEmail(state.preferences.email, true)) {
      return; // Don't proceed if email is invalid
    }
    
    // Validate other preferences
    if (!validateAllPreferences(state.preferences)) {
      return; // Don't proceed if other validations fail
    }
    
    try {
      setIsSaving(true);
      
      // Create a copy of preferences to avoid mutating state directly
      const preferencesToSave = { ...state.preferences };
      
      // Always include the email in the saved preferences
      if (state.preferences.email) {
        preferencesToSave.email = state.preferences.email;
      }
      
      // Handle browser notifications if enabled
      if (state.preferences.notifyBrowser) {
        try {
          // Request notification permission if not already granted
          const permission = await notificationService.requestNotificationPermission();
          
          if (permission === 'granted') {
            // Initialize push notifications with the user's email
            await notificationService.initializePushNotifications(state.preferences.email, state.preferences.email);
          } else {
            // If permission was denied, disable browser notifications
            preferencesToSave.notifyBrowser = false;
            console.warn('Browser notification permission was not granted');
          }
        } catch (error) {
          console.error('Error initializing push notifications:', error);
          preferencesToSave.notifyBrowser = false;
        }
      }
      
      // Save preferences
      await notificationService.updatePreferences(preferencesToSave);
      
      // Save event preferences
      const eventPrefs = Object.entries(state.eventPreferences).map(([eventType, isEnabled]) => ({
        eventType,
        isEnabled
      }));
      
      // Send all event preferences in one request
      await notificationService.saveAllPreferences({
        ...preferencesToSave,
        eventPreferences: eventPrefs
      });
      
      // Update local state with any changes (like if notifyBrowser was disabled due to permission issues)
      setState(prev => ({
        ...prev,
        preferences: {
          ...prev.preferences,
          ...preferencesToSave
        }
      }));
      
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter event types based on search
  const filteredEventTypes = Object.entries(state.eventPreferences)
    .filter(([eventType]) => 
      eventType.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort(([a], [b]) => a.localeCompare(b));

  const allEventsSelected = Object.values(state.eventPreferences).every(Boolean);
  const someEventsSelected = !allEventsSelected && 
    Object.values(state.eventPreferences).some(Boolean);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-[#1a1a2e] p-6 rounded-lg">
          <p className="text-white">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div 
        ref={modalRef}
        className="bg-[#1a1a2e] bg-opacity-90 backdrop-blur-lg border border-white border-opacity-12 rounded-2xl max-w-2xl w-full max-h-[90vh] shadow-2xl shadow-[#886FFF]/30 flex flex-col"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 pb-4 border-b border-white border-opacity-10">
          <h2 className="text-2xl font-bold text-white">Notification Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#886FFF] hover:bg-opacity-20 rounded-lg transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Email Notifications */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Email Notifications</h3>
            
            <div className="space-y-4 pl-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label htmlFor={notifyEmailId} className="text-white font-medium cursor-pointer">
                      Enable Email Notifications
                    </label>
                    <p id={`${notifyEmailId}-help`} className="text-sm text-gray-400">Receive notifications via email</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      id={notifyEmailId}
                      name="notify-email"
                      className="sr-only peer"
                      checked={state.preferences.notifyEmail}
                      onChange={(e) => handleEmailToggle(e.target.checked)}
                      aria-describedby={`${notifyEmailId}-help`}
                    />
                    <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#886FFF]"></div>
                  </label>
                </div>

                <div className="space-y-4 pl-4 border-l-2 border-[#886FFF] border-opacity-30">
                  {/* Email Input - Always Visible */}
                  <div>
                    <label htmlFor={emailId} className="block text-sm font-medium text-white mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-1">
                      <input
                        type="email"
                        id={emailId}
                        name="email"
                        autoComplete="email"
                        className={`w-full px-4 py-2 bg-[#0f0f1a] border ${emailError ? 'border-red-500' : 'border-gray-600'} rounded-lg text-white focus:ring-2 focus:ring-[#886FFF] focus:border-transparent`}
                        placeholder="your@email.com"
                        value={state.preferences.email.toLowerCase()}
                        onChange={(e) => {
                          const email = e.target.value.toLowerCase();
                          setState(prev => ({
                            ...prev,
                            preferences: {
                              ...prev.preferences,
                              email
                            }
                          }));
                          // Clear error when user starts typing
                          if (emailError) setEmailError('');
                        }}
                        onBlur={() => {
                          // Always validate email, regardless of notification toggle state
                          validateEmail(state.preferences.email, true);
                        }}
                        aria-required={state.preferences.notifyEmail}
                        aria-invalid={!!emailError}
                        aria-describedby={emailError ? `${emailId}-error` : undefined}
                      />
                      {emailError && (
                        <p id={`${emailId}-error`} className="mt-1 text-sm text-red-400" role="alert">
                          {emailError}
                        </p>
                      )}
                    </div>
                  </div>

                  {state.preferences.notifyEmail && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">1 Hour Before</p>
                          <p className="text-sm text-gray-400">Get notified 1 hour before events</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={state.preferences.email1hBefore}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePreferenceChange('email1hBefore', e.target.checked)}
                          />
                          <div className={`w-11 h-6 rounded-full peer ${!state.preferences.email10mBefore && !state.preferences.email1hBefore && state.preferences.notifyEmail ? 'bg-red-900' : 'bg-gray-700'} peer-checked:bg-[#886FFF]`}>
                            <div className={`absolute top-0.5 left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-transform ${state.preferences.email1hBefore ? 'translate-x-5' : ''} ${!state.preferences.email10mBefore && !state.preferences.email1hBefore && state.preferences.notifyEmail ? 'border-red-500' : ''}`}></div>
                          </div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">10 Minutes Before</p>
                          <p className="text-sm text-gray-400">Get notified 10 minutes before events</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={state.preferences.email10mBefore}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePreferenceChange('email10mBefore', e.target.checked)}
                          />
                        <div className={`w-11 h-6 rounded-full peer ${!state.preferences.email1hBefore && !state.preferences.email10mBefore && state.preferences.notifyEmail ? 'bg-red-900' : 'bg-gray-700'} peer-checked:bg-[#886FFF]`}>
                          <div className={`absolute top-0.5 left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-transform ${state.preferences.email10mBefore ? 'translate-x-5' : ''} ${!state.preferences.email1hBefore && !state.preferences.email10mBefore && state.preferences.notifyEmail ? 'border-red-500' : ''}`}></div>
                        </div>
                      </label>
                    </div>
                    
                    {!state.preferences.email1hBefore && !state.preferences.email10mBefore && state.preferences.notifyEmail && (
                      <p className="text-red-400 text-sm mt-1">Please enable at least one reminder time</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Browser Notifications */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Browser Notifications</h3>
            
            <div className="space-y-3 pl-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Enable Browser Notifications</p>
                  <p className="text-sm text-gray-400">
                    {notificationPermission === 'denied' 
                      ? 'Notifications are blocked in your browser settings' 
                      : notificationPermission === 'granted'
                        ? 'Browser notifications are enabled'
                        : 'Click to enable browser notifications'}
                  </p>
                </div>
                <div className="relative">
                  <label 
                    className={`relative inline-flex items-center ${notificationPermission === 'denied' || notificationPermission === 'granted' ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    title={notificationPermission === 'denied' 
                      ? 'Notifications are blocked in browser settings' 
                      : notificationPermission === 'granted'
                        ? 'To disable notifications, please update your browser settings'
                        : 'Enable browser notifications'}
                  >
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={state.preferences.notifyBrowser && notificationPermission === 'granted'}
                      onChange={(e) => {
                        if (notificationPermission === 'denied' || notificationPermission === 'granted') return;
                        handlePreferenceChange('notifyBrowser', e.target.checked);
                      }}
                      disabled={notificationPermission === 'denied' || notificationPermission === 'granted'}
                    />
                    <div className={`w-11 h-6 rounded-full ${notificationPermission === 'denied' || notificationPermission === 'granted' ? 'bg-gray-800' : 'bg-gray-700 peer-checked:bg-[#886FFF]'}`}>
                      <div className={`absolute top-0.5 left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-transform ${state.preferences.notifyBrowser && notificationPermission === 'granted' ? 'translate-x-5' : ''} ${notificationPermission === 'denied' || notificationPermission === 'granted' ? 'opacity-50' : ''}`}></div>
                    </div>
                  </label>
                  {browserReminderError && notificationPermission === 'granted' && (
                    <div className="absolute top-full left-0 mt-1 w-64 p-2 bg-gray-800 text-red-300 text-xs rounded shadow-lg z-10">
                      {browserReminderError}
                    </div>
                  )}
                </div>
              </div>

              {(notificationPermission === 'denied' || notificationPermission === 'granted') && (
                <div className="p-3 bg-yellow-900 bg-opacity-30 rounded-lg text-yellow-100 text-sm flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">
                      {notificationPermission === 'denied' 
                        ? 'Browser notifications are blocked' 
                        : 'Browser notifications are enabled'}
                    </p>
                    <p>
                      {notificationPermission === 'denied'
                        ? 'Please enable notifications in your browser settings to receive alerts.'
                        : 'To disable notifications, please update your browser settings.'}
                    </p>
                  </div>
                </div>
              )}

              {state.preferences.notifyBrowser && notificationPermission !== 'denied' && (
                <div className="space-y-3 pl-4 border-l-2 border-[#886FFF] border-opacity-30 ml-2 pl-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">1 Hour Before</p>
                      <p className="text-sm text-gray-400">Get notified 1 hour before events</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={state.preferences.browser1hBefore}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePreferenceChange('browser1hBefore', e.target.checked)}
                        disabled={!state.preferences.notifyBrowser}
                      />
                      <div className={`w-11 h-6 rounded-full peer ${!state.preferences.notifyBrowser ? 'bg-gray-800' : (browserReminderError && !state.preferences.browser1hBefore && !state.preferences.browser10mBefore) ? 'bg-red-900' : 'bg-gray-700'} peer-checked:bg-[#886FFF]`}>
                        <div className={`absolute top-0.5 left-[2px] bg-white border ${(browserReminderError && !state.preferences.browser1hBefore && !state.preferences.browser10mBefore) ? 'border-red-500' : 'border-gray-300'} rounded-full h-5 w-5 transition-transform ${state.preferences.browser1hBefore ? 'translate-x-5' : ''} ${!state.preferences.notifyBrowser ? 'opacity-50' : ''}`}></div>
                      </div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">10 Minutes Before</p>
                      <p className="text-sm text-gray-400">Get notified 10 minutes before events</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={state.preferences.browser10mBefore}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePreferenceChange('browser10mBefore', e.target.checked)}
                        disabled={!state.preferences.notifyBrowser}
                      />
                      <div className={`w-11 h-6 rounded-full peer ${!state.preferences.notifyBrowser ? 'bg-gray-800' : (browserReminderError && !state.preferences.browser1hBefore && !state.preferences.browser10mBefore) ? 'bg-red-900' : 'bg-gray-700'} peer-checked:bg-[#886FFF]`}>
                        <div className={`absolute top-0.5 left-[2px] bg-white border ${(browserReminderError && !state.preferences.browser1hBefore && !state.preferences.browser10mBefore) ? 'border-red-500' : 'border-gray-300'} rounded-full h-5 w-5 transition-transform ${state.preferences.browser10mBefore ? 'translate-x-5' : ''} ${!state.preferences.notifyBrowser ? 'opacity-50' : ''}`}></div>
                      </div>
                    </label>
                  </div>
                  
                  {browserReminderError && state.preferences.notifyBrowser && (
                    <p className="text-red-400 text-sm mt-1">{browserReminderError}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Event Type Notifications */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">Event Type Notifications</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search event types..."
                  className="bg-[#2a2a3a] text-white text-sm rounded-lg pl-10 pr-4 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-[#886FFF] focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="bg-[#1f1f2d] rounded-lg overflow-hidden border border-white border-opacity-10">
              <div className="p-4 border-b border-white border-opacity-10 flex items-center justify-between bg-[#2a2a3a] bg-opacity-50">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="select-all-events"
                    className="w-4 h-4 text-[#886FFF] rounded focus:ring-[#886FFF] border-gray-600"
                    checked={allEventsSelected}
                    ref={(el) => {
                      if (el) {
                        el.indeterminate = someEventsSelected;
                      }
                    }}
                    onChange={(e) => toggleAllEventTypes(e.target.checked)}
                  />
                  <label htmlFor="select-all-events" className="text-white font-medium">
                    {allEventsSelected ? 'Deselect All' : 'Select All'}
                  </label>
                </div>
                <span className="text-sm text-gray-400">
                  {Object.values(state.eventPreferences).filter(Boolean).length} of {Object.keys(state.eventPreferences).length} selected
                </span>
              </div>

              <div className="max-h-60 overflow-y-auto">
                {filteredEventTypes.length > 0 ? (
                  <ul className="divide-y divide-white divide-opacity-10">
                    {filteredEventTypes.map(([eventType, isEnabled]) => (
                      <li key={eventType} className="px-4 py-3 hover:bg-[#2a2a3a] transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="text-white">{eventType}</span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={isEnabled}
                              onChange={(e) => handleEventPreferenceChange(eventType, e.target.checked)}
                            />
                            <div className="w-9 h-5 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#886FFF]"></div>
                          </label>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-4 text-center text-gray-400">
                    No event types found matching "{searchTerm}"
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* New Event Alerts Section */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-white mb-3">New Event Alerts</h3>
            <div className="bg-[#2a2a3a] p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Notify for New Events</p>
                  <p className="text-sm text-gray-400">Get notified when new events are added to the calendar via email and browser notifications</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={state.preferences.notifyNewEvents}
                    onChange={(e) => handlePreferenceChange('notifyNewEvents', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#886FFF]"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 pt-4 border-t border-white border-opacity-10 flex-shrink-0 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-white bg-transparent hover:bg-white hover:bg-opacity-10 rounded-lg transition-colors"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={
                isSaving || 
                (state.preferences.notifyEmail && (!state.preferences.email.trim() || !!emailError)) ||
                (state.preferences.notifyBrowser && !state.preferences.browser1hBefore && !state.preferences.browser10mBefore)
              }
              className={`px-6 py-2 text-white rounded-lg transition-colors flex items-center gap-2 ${
                isSaving || (state.preferences.notifyEmail && !state.preferences.email.trim() || !!emailError)
                  ? 'bg-[#886FFF] bg-opacity-50 cursor-not-allowed'
                  : 'bg-[#886FFF] hover:bg-[#ae7aff]'
              }`}
              title={state.preferences.notifyEmail && !state.preferences.email.trim() ? 'Please enter a valid email address' : ''}
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Saving...
                </>
              ) : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default BulkSettingsModal;
