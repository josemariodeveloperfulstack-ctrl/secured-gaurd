import { create } from 'zustand';

interface BackendStatusState {
  isUnavailable: boolean;
  message: string | null;
  lastFailureAt: number | null;
  markUnavailable: (message?: string) => void;
  markAvailable: () => void;
}

const DEFAULT_MESSAGE =
  'O servidor está reiniciando ou temporariamente indisponível. Aguarde alguns instantes e tente novamente.';

export const useBackendStatusStore = create<BackendStatusState>((set) => ({
  isUnavailable: false,
  message: null,
  lastFailureAt: null,
  markUnavailable: (message) =>
    set({
      isUnavailable: true,
      message: message || DEFAULT_MESSAGE,
      lastFailureAt: Date.now(),
    }),
  markAvailable: () =>
    set({
      isUnavailable: false,
      message: null,
    }),
}));

export { DEFAULT_MESSAGE as BACKEND_UNAVAILABLE_MESSAGE };
