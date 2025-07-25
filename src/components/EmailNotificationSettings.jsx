import React, { useState, useEffect, useCallback } from 'react';
import { Input, Switch, Button, Divider, Checkbox, Input as AntInput, message, Spin } from 'antd';
import { SearchOutlined, CheckOutlined, CloseOutlined, SaveOutlined } from '@ant-design/icons';
import notificationService from '../services/notificationService';

const { Search } = AntInput;

const EmailNotificationSettings = ({ userId, onSave }) => {
  const [formData, setFormData] = useState({
    email: '',
    notifyEmail: true,
    email1hBefore: true,
    email10mBefore: true,
    notifyBrowser: true,
    browser1hBefore: true,
    browser10mBefore: true,
    notifyAllEvents: true,
    eventPreferences: {}
  });
  
  const [eventTypes, setEventTypes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load user preferences and event types
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Load user preferences
      const prefs = await notificationService.getPreferences();
      
      // Load event types
      const events = []; // TODO: Load actual events from your calendar
      const uniqueEventTypes = notificationService.getUniqueEventTypes(events);
      setEventTypes(uniqueEventTypes);
      
      // Load event type preferences
      const eventPrefs = await notificationService.getEventPreferences(uniqueEventTypes);
      const eventPreferences = {};
      
      eventPrefs.forEach(pref => {
        eventPreferences[pref.event_type] = pref.is_enabled;
      });
      
      // Update form data with all preferences
      setFormData({
        email: prefs.email || '',
        notifyEmail: prefs.notifyEmail !== false,
        email1hBefore: prefs.email1hBefore !== false,
        email10mBefore: prefs.email10mBefore !== false,
        notifyBrowser: prefs.notifyBrowser !== false,
        browser1hBefore: prefs.browser1hBefore !== false,
        browser10mBefore: prefs.browser10mBefore !== false,
        notifyAllEvents: prefs.notifyAllEvents !== false,
        eventPreferences
      });
      
    } catch (error) {
      console.error('Error loading notification settings:', error);
      message.error('Failed to load notification settings');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);
  
  // Initial data load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle form field changes
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle event preference changes
  const handleEventPreferenceChange = (eventType, isEnabled) => {
    setFormData(prev => ({
      ...prev,
      eventPreferences: {
        ...prev.eventPreferences,
        [eventType]: isEnabled
      }
    }));
  };

  // Handle select/deselect all event types
  const toggleAllEventTypes = (checked) => {
    const updatedEventPreferences = {};
    eventTypes.forEach(type => {
      updatedEventPreferences[type] = checked;
    });
    
    setFormData(prev => ({
      ...prev,
      eventPreferences: {
        ...prev.eventPreferences,
        ...updatedEventPreferences
      },
      notifyAllEvents: checked
    }));
  };

  // Filter event types based on search term
  const filteredEventTypes = eventTypes.filter(type => 
    type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if all event types are selected
  const allEventTypesSelected = eventTypes.length > 0 && 
    eventTypes.every(type => formData.eventPreferences[type]);

  // Save all preferences in one request
  const savePreferences = async () => {
    try {
      setIsSaving(true);
      
      // Validate email if notifications are enabled
      if (formData.notifyEmail && (!formData.email || !notificationService.isValidEmail(formData.email))) {
        message.error('Please enter a valid email address');
        return;
      }
      
      // Prepare the data to save
      const dataToSave = {
        // Main preferences
        email: formData.notifyEmail ? formData.email : '',
        notifyEmail: formData.notifyEmail,
        email1hBefore: formData.notifyEmail ? formData.email1hBefore : false,
        email10mBefore: formData.notifyEmail ? formData.email10mBefore : false,
        notifyBrowser: formData.notifyBrowser,
        browser1hBefore: formData.notifyBrowser ? formData.browser1hBefore : false,
        browser10mBefore: formData.notifyBrowser ? formData.browser10mBefore : false,
        notifyAllEvents: formData.notifyAllEvents,
        
        // Event type preferences
        eventPreferences: formData.eventPreferences
      };
      
      // Call the parent's onSave if provided, otherwise use the service directly
      if (onSave) {
        await onSave(dataToSave);
      } else {
        await notificationService.saveAllPreferences(dataToSave);
      }
      
      message.success('Notification preferences saved successfully');
    } catch (error) {
      console.error('Error saving preferences:', error);
      message.error(error.message || 'Failed to save notification preferences');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle reset to defaults
  const resetToDefaults = () => {
    const defaultPrefs = notificationService.getDefaultPreferences();
    setFormData({
      ...defaultPrefs,
      eventPreferences: {}
    });
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="flex items-center justify-center py-8">
          <Spin size="large" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Settings</h3>
      
      <div className="space-y-6">
        {/* Email Notifications Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-md font-medium text-gray-800">Email Notifications</h4>
            <Switch
              checked={formData.notifyEmail}
              onChange={(checked) => handleChange('notifyEmail', checked)}
              checkedChildren="On"
              unCheckedChildren="Off"
            />
          </div>
          
          {formData.notifyEmail && (
            <div className="pl-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-64"
                />
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Send email reminders:</p>
                <div className="space-y-2 pl-4">
                  <div className="flex items-center">
                    <Checkbox 
                      checked={formData.email1hBefore}
                      onChange={(e) => handleChange('email1hBefore', e.target.checked)}
                      className="mr-2"
                    >
                      1 hour before event
                    </Checkbox>
                  </div>
                  <div className="flex items-center">
                    <Checkbox 
                      checked={formData.email10mBefore}
                      onChange={(e) => handleChange('email10mBefore', e.target.checked)}
                      className="mr-2"
                    >
                      10 minutes before event
                    </Checkbox>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <Divider />
        
        {/* Browser Notifications Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-md font-medium text-gray-800">Browser Notifications</h4>
            <Switch
              checked={formData.notifyBrowser}
              onChange={(checked) => handleChange('notifyBrowser', checked)}
              checkedChildren="On"
              unCheckedChildren="Off"
            />
          </div>
          
          {formData.notifyBrowser && (
            <div className="pl-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Show browser notifications:</p>
              <div className="space-y-2 pl-4">
                <div className="flex items-center">
                  <Checkbox 
                    checked={formData.browser1hBefore}
                    onChange={(e) => handleChange('browser1hBefore', e.target.checked)}
                    className="mr-2"
                  >
                    1 hour before event
                  </Checkbox>
                </div>
                <div className="flex items-center">
                  <Checkbox 
                    checked={formData.browser10mBefore}
                    onChange={(e) => handleChange('browser10mBefore', e.target.checked)}
                    className="mr-2"
                  >
                    10 minutes before event
                  </Checkbox>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <Divider />
        
        {/* Event Type Preferences */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-md font-medium text-gray-800">Event Type Preferences</h4>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={formData.notifyAllEvents}
                onChange={(e) => {
                  const checked = e.target.checked;
                  handleChange('notifyAllEvents', checked);
                  toggleAllEventTypes(checked);
                }}
                className="mr-2"
              >
                Notify for all event types
              </Checkbox>
            </div>
          </div>
          
          <div className="mb-4">
            <Search
              placeholder="Filter event types"
              prefix={<SearchOutlined />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              allowClear
              className="w-full max-w-md"
            />
          </div>
          
          <div className="max-h-60 overflow-y-auto border rounded-md p-2">
            {filteredEventTypes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {filteredEventTypes.map((eventType) => (
                  <div key={eventType} className="flex items-center">
                    <Checkbox
                      checked={!!formData.eventPreferences[eventType]}
                      onChange={(e) => handleEventPreferenceChange(eventType, e.target.checked)}
                      className="w-full py-1"
                    >
                      {eventType || 'Untitled Event'}
                    </Checkbox>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                {searchTerm ? 'No matching event types found' : 'No event types available'}
              </div>
            )}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t border-gray-200">
          <Button 
            onClick={resetToDefaults}
            disabled={isSaving}
          >
            Reset to Defaults
          </Button>
          
          <div className="space-x-2">
            <Button 
              onClick={loadData}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button 
              type="primary" 
              icon={<SaveOutlined />}
              onClick={savePreferences}
              loading={isSaving}
              disabled={formData.notifyEmail && !notificationService.isValidEmail(formData.email)}
            >
              Save All Preferences
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailNotificationSettings;
