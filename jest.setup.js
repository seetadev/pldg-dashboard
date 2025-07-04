<<<<<<< HEAD
import '@testing-library/jest-dom';
import jest from 'next/jest';

// Mock the fetch function
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
);

// Mock pointer capture API
Element.prototype.setPointerCapture = jest.fn();
Element.prototype.releasePointerCapture = jest.fn();
Element.prototype.hasPointerCapture = jest.fn();

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

// Mock ResizeObserver
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserver;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
class IntersectionObserver {
  constructor() {
    this.observe = jest.fn();
    this.unobserve = jest.fn();
    this.disconnect = jest.fn();
  }
}

global.IntersectionObserver = IntersectionObserver;
=======
import '@testing-library/jest-dom'
>>>>>>> feature/Implement_Interactive_Timeline_for_Engagement_Events
