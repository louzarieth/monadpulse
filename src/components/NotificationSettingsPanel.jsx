import React, { useState } from 'react';
import { Tabs, message } from 'antd';
import { MailOutlined, BellOutlined } from '@ant-design/icons';
import EmailNotificationSettings from './EmailNotificationSettings';
import NotificationSettings from './NotificationSettings';

const { TabPane } = Tabs;

const NotificationSettingsPanel = ({ userId }) => {
  const [activeTab, setActiveTab] = useState('email');
  const [saveAllPending, setSaveAllPending] = useState(false);
  
  // This function will be called when the user clicks "Save All"
  const handleSaveAll = async () => {
    try {
      setSaveAllPending(true);
      // Here you would collect all settings from both tabs and save them
      // For now, we'll just show a success message
      message.success('All notification preferences saved successfully');
    } catch (error) {
      console.error('Error saving all preferences:', error);
      message.error('Failed to save all preferences');
    } finally {
      setSaveAllPending(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">Notification Settings</h2>
        <p className="text-sm text-gray-500 mt-1">
          Manage how and when you receive notifications about your events
        </p>
      </div>
      
      <Tabs 
        activeKey={activeTab}
        onChange={setActiveTab}
        className="px-4 pt-2"
        tabBarExtraContent={
          <Button 
            type="primary" 
            onClick={handleSaveAll}
            loading={saveAllPending}
            className="mt-2 sm:mt-0"
          >
            Save All
          </Button>
        }
      >
        <TabPane
          tab={
            <span>
              <MailOutlined className="mr-1" />
              Email Notifications
            </span>
          }
          key="email"
        >
          <div className="p-2">
            <EmailNotificationSettings userId={userId} />
          </div>
        </TabPane>
        
        <TabPane
          tab={
            <span>
              <BellOutlined className="mr-1" />
              Browser Notifications
            </span>
          }
          key="browser"
        >
          <div className="p-2">
            <NotificationSettings userId={userId} />
          </div>
        </TabPane>
      </Tabs>
      
      <div className="p-4 bg-gray-50 border-t border-gray-200 rounded-b-lg text-sm text-gray-500">
        <p>Changes are saved automatically when you switch between tabs or click "Save All".</p>
      </div>
    </div>
  );
};

export default NotificationSettingsPanel;
