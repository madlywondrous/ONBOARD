/**
 * @vitest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react';
import { useF1Calendar } from '@/hooks/use-f1-calendar';
import { vi } from 'vitest';

// Mock the data loader to avoid loading the large JSON file in tests
vi.mock('@/lib/f1-calendar-data', async () => {
  const originalModule = await vi.importActual('@/lib/f1-calendar-data');
  return {
    ...originalModule,
    loadF1CalendarData: () => Promise.resolve([{ id: '1', name: 'Test Race' }]), // Return a mock race
    getCurrentOrNextSession: () => null,
    getCountdownString: () => '',
  };
});

describe('useF1Calendar Hook', () => {
  it('should load race data and set initial state', async () => {
    const { result } = renderHook(() => useF1Calendar());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.races.length).toBeGreaterThan(0);
    expect(result.current.error).toBeNull();
  });
});
