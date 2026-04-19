import { createContext, useContext, useEffect, useCallback } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
}

interface KeyboardShortcutsContextType {
  registerShortcut: (id: string, shortcut: KeyboardShortcut) => void;
  unregisterShortcut: (id: string) => void;
  getShortcuts: () => Record<string, KeyboardShortcut>;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | undefined>(undefined);

export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const shortcuts = new Map<string, KeyboardShortcut>();

  const registerShortcut = useCallback((id: string, shortcut: KeyboardShortcut) => {
    shortcuts.set(id, shortcut);
  }, []);

  const unregisterShortcut = useCallback((id: string) => {
    shortcuts.delete(id);
  }, []);

  const getShortcuts = useCallback(() => {
    return Object.fromEntries(shortcuts);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if user is typing in an input field
      if (event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLElement && event.target.contentEditable === 'true') {
        return;
      }

      for (const [id, shortcut] of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = !!event.ctrlKey === !!shortcut.ctrlKey;
        const shiftMatch = !!event.shiftKey === !!shortcut.shiftKey;
        const altMatch = !!event.altKey === !!shortcut.altKey;
        const metaMatch = !!event.metaKey === !!shortcut.metaKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch) {
          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);

  return (
    <KeyboardShortcutsContext.Provider value={{ registerShortcut, unregisterShortcut, getShortcuts }}>
      {children}
    </KeyboardShortcutsContext.Provider>
  );
}

export function useKeyboardShortcuts() {
  const context = useContext(KeyboardShortcutsContext);
  if (context === undefined) {
    throw new Error('useKeyboardShortcuts must be used within a KeyboardShortcutsProvider');
  }
  return context;
}

export function useShortcut(shortcut: KeyboardShortcut, deps: React.DependencyList = []) {
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts();

  useEffect(() => {
    const id = Math.random().toString(36).substr(2, 9);
    registerShortcut(id, shortcut);
    return () => unregisterShortcut(id);
  }, deps);
}