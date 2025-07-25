// Add jest-dom's custom assertions
import '@testing-library/jest-dom';

// Mock the Notification API
Object.defineProperty(window, 'Notification', {
  value: jest.fn().mockImplementation((title, options) => ({
    title,
    ...options,
    close: jest.fn(),
  })),
  writable: true,
});

// Mock the service worker
Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    register: jest.fn().mockResolvedValue({
      pushManager: {
        getSubscription: jest.fn().mockResolvedValue(null),
        subscribe: jest.fn().mockResolvedValue({ endpoint: 'test-endpoint' }),
      },
    }),
    ready: Promise.resolve({
      pushManager: {
        getSubscription: jest.fn().mockResolvedValue(null),
        subscribe: jest.fn().mockResolvedValue({ endpoint: 'test-endpoint' }),
      },
    }),
  },
  configurable: true,
});

// Mock the fetch API
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ success: true }),
});
