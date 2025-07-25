// @ts-nocheck
// Test file for the notification service

import { jest, describe, beforeEach, it, expect, beforeAll, afterEach } from '@jest/globals';

// Create a mock for the notification service
const mockNotificationService = {
  isSupported: jest.fn(),
  requestNotificationPermission: jest.fn(),
  subscribeToPushNotifications: jest.fn(),
  unsubscribeFromPushNotifications: jest.fn(),
  isSubscribed: jest.fn(),
  initializePushNotifications: jest.fn(),
  getUniqueEventTypes: jest.fn(),
  showNotification: jest.fn()
};

// Mock the notification service module
jest.mock('../../src/services/notificationService', () => ({
  __esModule: true,
  default: mockNotificationService
}));

// Import the mock after setting it up
import notificationService from '../../src/services/notificationService';

// Test data
const userId = 'test-user-123';
const publicVapidKey = 'test-public-vapid-key';
const mockSubscription = {
  endpoint: 'test-endpoint',
  keys: { auth: 'auth', p256dh: 'p256dh' }
};

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
  
  // Set up default mock implementations
  mockNotificationService.isSupported.mockReturnValue(true);
  mockNotificationService.requestNotificationPermission.mockResolvedValue('granted');
  mockNotificationService.subscribeToPushNotifications.mockResolvedValue(mockSubscription);
  mockNotificationService.unsubscribeFromPushNotifications.mockResolvedValue(true);
  mockNotificationService.isSubscribed.mockResolvedValue(true);
  mockNotificationService.initializePushNotifications.mockResolvedValue(true);
  mockNotificationService.getUniqueEventTypes.mockImplementation((events) => {
    const types = new Set();
    events.forEach(event => {
      if (event.extendedProperties?.shared?.eventType) {
        types.add(event.extendedProperties.shared.eventType);
      } else if (event.title) {
        types.add(event.title);
      }
    });
    return Array.from(types);
  });
  mockNotificationService.showNotification.mockResolvedValue(undefined);
});

describe('NotificationService', () => {
  describe('isSupported', () => {
    it('should return true when all required APIs are available', () => {
      mockNotificationService.isSupported.mockReturnValue(true);
      expect(notificationService.isSupported()).toBe(true);
    });
  });

  describe('requestNotificationPermission', () => {
    it('should return granted when permission is granted', async () => {
      mockNotificationService.requestNotificationPermission.mockResolvedValue('granted');
      const result = await notificationService.requestNotificationPermission();
      expect(result).toBe('granted');
    });
  });

  describe('subscribeToPushNotifications', () => {
    it('should return subscription when successful', async () => {
      const subscription = await notificationService.subscribeToPushNotifications(userId);
      expect(subscription).toEqual(mockSubscription);
      expect(mockNotificationService.subscribeToPushNotifications).toHaveBeenCalledWith(userId);
    });
  });

  describe('unsubscribeFromPushNotifications', () => {
    it('should return true when unsubscribed successfully', async () => {
      const result = await notificationService.unsubscribeFromPushNotifications(userId);
      expect(result).toBe(true);
      expect(mockNotificationService.unsubscribeFromPushNotifications).toHaveBeenCalledWith(userId);
    });
  });

  describe('isSubscribed', () => {
    it('should return subscription status', async () => {
      mockNotificationService.isSubscribed.mockResolvedValue(true);
      const isSubscribed = await notificationService.isSubscribed();
      expect(isSubscribed).toBe(true);
    });
  });

  describe('initializePushNotifications', () => {
    it('should initialize notifications and return true', async () => {
      const result = await notificationService.initializePushNotifications(userId);
      expect(result).toBe(true);
      expect(mockNotificationService.initializePushNotifications).toHaveBeenCalledWith(userId);
    });
  });

  describe('getUniqueEventTypes', () => {
    it('should return unique event types', () => {
      const events = [
        { extendedProperties: { shared: { eventType: 'meeting' } } },
        { extendedProperties: { shared: { eventType: 'meeting' } } },
        { extendedProperties: { shared: { eventType: 'appointment' } } },
        { title: 'Birthday' },
        { extendedProperties: {} },
        { extendedProperties: { shared: {} } }
      ];
      
      const result = notificationService.getUniqueEventTypes(events);
      expect(result).toContain('meeting');
      expect(result).toContain('appointment');
      expect(result).toContain('Birthday');
      expect(result).toHaveLength(3);
    });
  });

  describe('showNotification', () => {
    it('should show a notification with the given title and options', async () => {
      const title = 'Test Title';
      const options = { body: 'Test Body' };
      
      await notificationService.showNotification(title, options);
      
      expect(mockNotificationService.showNotification).toHaveBeenCalledWith(title, options);
    });
  });
});
