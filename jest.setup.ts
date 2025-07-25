// Mock the Notification API
class MockNotification {
  static permission: NotificationPermission = 'default';
  
  constructor(public title: string, public options?: NotificationOptions) {}
  
  static requestPermission = jest.fn().mockResolvedValue('granted');
  
  close() {}
}

// Mock the PushSubscription
class MockPushSubscription {
  constructor(public endpoint: string) {}
  
  unsubscribe() {
    return Promise.resolve(true);
  }
}

// Mock the service worker registration
const mockServiceWorkerRegistration = {
  pushManager: {
    getSubscription: jest.fn().mockResolvedValue(null),
    subscribe: jest.fn().mockResolvedValue(new MockPushSubscription('test-endpoint')),
  },
};

// Mock the global objects
global.Notification = MockNotification as unknown as typeof Notification;

global.navigator = {
  ...global.navigator,
  serviceWorker: {
    register: jest.fn().mockResolvedValue(mockServiceWorkerRegistration),
    ready: Promise.resolve(mockServiceWorkerRegistration),
  },
} as unknown as Navigator;

// Mock the fetch API
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ success: true }),
});

// Mock the window object
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost',
    origin: 'http://localhost',
  },
  writable: true,
});

// Add jest-dom's custom assertions
import '@testing-library/jest-dom';
