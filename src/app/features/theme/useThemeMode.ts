import { useEffect, useSyncExternalStore } from 'react';

export type ThemeMode = 'light' | 'dark';

const themeStorageKey = 'wellnessconnect-theme-mode';
const themeChangeEvent = 'wellnessconnect-theme-change';
const themeTransitionClass = 'theme-transitioning';
const themeTransitionDurationMs = 280;

let themeTransitionTimer: number | undefined;

function getSystemTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readStoredTheme(): ThemeMode | null {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(themeStorageKey);
  return value === 'dark' || value === 'light' ? value : null;
}

function getThemeSnapshot(): ThemeMode {
  return readStoredTheme() ?? getSystemTheme();
}

function commitTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', mode === 'dark');
  document.documentElement.dataset.theme = mode;
  document.documentElement.style.colorScheme = mode;
}

function shouldAnimateThemeChange(): boolean {
  if (typeof window === 'undefined') return false;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function finishThemeTransition() {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.remove(themeTransitionClass);
  if (themeTransitionTimer) {
    window.clearTimeout(themeTransitionTimer);
    themeTransitionTimer = undefined;
  }
}

function applyTheme(mode: ThemeMode, animate = false) {
  if (typeof document === 'undefined') return;
  if (!animate || !shouldAnimateThemeChange()) {
    commitTheme(mode);
    return;
  }

  if (themeTransitionTimer) window.clearTimeout(themeTransitionTimer);
  document.documentElement.classList.add(themeTransitionClass);
  void document.documentElement.offsetWidth;
  commitTheme(mode);
  themeTransitionTimer = window.setTimeout(finishThemeTransition, themeTransitionDurationMs);
}

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === themeStorageKey) callback();
  };
  const handleThemeChange = () => callback();
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const handleSystemTheme = () => {
    if (!readStoredTheme()) callback();
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener(themeChangeEvent, handleThemeChange);
  media.addEventListener('change', handleSystemTheme);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(themeChangeEvent, handleThemeChange);
    media.removeEventListener('change', handleSystemTheme);
  };
}

export function initializeThemeMode() {
  applyTheme(getThemeSnapshot());
}

export function useThemeMode() {
  const mode = useSyncExternalStore<ThemeMode>(subscribe, getThemeSnapshot, () => 'light');

  useEffect(() => {
    applyTheme(mode);
  }, [mode]);

  function setMode(nextMode: ThemeMode) {
    window.localStorage.setItem(themeStorageKey, nextMode);
    applyTheme(nextMode, true);
    window.dispatchEvent(new CustomEvent(themeChangeEvent, { detail: nextMode }));
  }

  function toggleMode() {
    setMode(mode === 'dark' ? 'light' : 'dark');
  }

  return { mode, setMode, toggleMode };
}
