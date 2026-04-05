import '@testing-library/jest-dom'

// jsdom doesn't implement these browser APIs
Object.defineProperty(URL, 'createObjectURL', {
  value: vi.fn(),
  writable: true,
  configurable: true,
})
Object.defineProperty(URL, 'revokeObjectURL', {
  value: vi.fn(),
  writable: true,
  configurable: true,
})
