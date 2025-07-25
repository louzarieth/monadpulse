import React, { useState, useEffect } from 'react';
import { 
  isSupported, 
  hasPermission, 
  isSubscribed, 
  enableNotifications, 
  disableNotifications,
  sendTestNotification
} from '../services/notificationService';

const NotificationSettings = ({ userId }) => {
  const [browserSupported, setBrowserSupported] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState('Checking browser support...');
  const [error, setError] = useState(null);

  useEffect(() => {
    checkNotificationStatus();
  }, []);

  const checkNotificationStatus = async () => {
    try {
      setBrowserSupported(isSupported());
      
      if (!isSupported()) {
        setStatus('Push notifications are not supported in your browser.');
        setIsLoading(false);
        return;
      }

      setPermissionGranted(hasPermission());
      const subscribed = await isSubscribed();
      setIsPushEnabled(subscribed);
      
      if (subscribed) {
        setStatus('Push notifications are enabled for this browser.');
      } else if (hasPermission()) {
        setStatus('Push notifications are supported but not enabled.');
      } else {
        setStatus('Please enable notifications to receive browser alerts.');
      }
    } catch (err) {
      console.error('Error checking notification status:', err);
      setError('Failed to check notification status. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleNotifications = async () => {
    if (isPushEnabled) {
      await disableNotifications(userId);
      setIsPushEnabled(false);
      setStatus('Push notifications have been disabled.');
    } else {
      setIsLoading(true);
      setError(null);
      
      try {
        const result = await enableNotifications(userId);
        if (result.success) {
          setIsPushEnabled(true);
          setStatus('Push notifications have been enabled!');
        } else {
          setError(result.error || 'Failed to enable notifications.');
        }
      } catch (err) {
        console.error('Error toggling notifications:', err);
        setError('Failed to update notification settings.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleTestNotification = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await sendTestNotification();
      if (!result.success) {
        setError(result.error || 'Failed to send test notification.');
      }
    } catch (err) {
      console.error('Error sending test notification:', err);
      setError('Failed to send test notification.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Browser Notifications</h3>
            <p className="text-sm text-gray-500">Loading notification settings...</p>
          </div>
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Browser Notifications</h3>
          <p className="text-sm text-gray-500">{status}</p>
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
        </div>
        
        {browserSupported ? (
          <div className="flex items-center space-x-4">
            <button
              onClick={handleTestNotification}
              disabled={!isPushEnabled || !permissionGranted}
              className={`px-3 py-1.5 text-sm rounded-md ${
                isPushEnabled && permissionGranted
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              Test Notification
            </button>
            
            <button
              type="button"
              onClick={handleToggleNotifications}
              disabled={!permissionGranted && hasPermission() === 'denied'}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                isPushEnabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
              role="switch"
              aria-checked={isPushEnabled}
            >
              <span className="sr-only">Enable notifications</span>
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isPushEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        ) : (
          <span className="text-sm text-gray-500">Not supported</span>
        )}
      </div>
      
      {!browserSupported && (
        <div className="mt-4 p-3 bg-yellow-50 text-yellow-700 rounded-md text-sm">
          <p>Your browser doesn't support push notifications. Please use a modern browser like Chrome, Firefox, or Edge.</p>
        </div>
      )}
      
      {browserSupported && !permissionGranted && hasPermission() === 'denied' && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
          <p>Notifications are blocked. Please update your browser settings to allow notifications.</p>
        </div>
      )}
    </div>
  );
};

export default NotificationSettings;
