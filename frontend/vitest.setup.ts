import '@testing-library/jest-dom'

// Global test types for Vitest
declare global {
  const describe: typeof import('vitest').describe
  const it: typeof import('vitest').it
  const expect: typeof import('vitest').expect
}