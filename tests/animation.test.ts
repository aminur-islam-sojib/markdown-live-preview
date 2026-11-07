import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { useModalAnimation } from '../src/hooks/useModalAnimation';

// Configure React act environment for Vitest/JSDOM
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('useModalAnimation hook', () => {
  let container: HTMLDivElement | null = null;
  let root: any = null;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    vi.useRealTimers();
  });

  it('starts unmounted when isOpen is false', () => {
    let hookResult: any = null;

    function TestComponent({ isOpen }: { isOpen: boolean }) {
      hookResult = useModalAnimation(isOpen, 200);
      return React.createElement('div', null, hookResult.isMounted ? 'mounted' : 'unmounted');
    }

    act(() => {
      root.render(React.createElement(TestComponent, { isOpen: false }));
    });

    expect(hookResult.isMounted).toBe(false);
    expect(hookResult.phase).toBe('unmounted');
    expect(container?.textContent).toBe('unmounted');
  });

  it('transitions to entering and entered when isOpen becomes true', () => {
    let hookResult: any = null;

    function TestComponent({ isOpen }: { isOpen: boolean }) {
      hookResult = useModalAnimation(isOpen, 200);
      return React.createElement('div', null, hookResult.isMounted ? 'mounted' : 'unmounted');
    }

    act(() => {
      root.render(React.createElement(TestComponent, { isOpen: true }));
    });

    expect(hookResult.isMounted).toBe(true);
    expect(hookResult.phase).toBe('entering');

    // Fast-forward animation frames
    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(hookResult.isMounted).toBe(true);
    expect(hookResult.phase).toBe('entered');
  });

  it('smoothly plays exit animation before unmounting when isOpen becomes false', () => {
    let hookResult: any = null;

    function TestComponent({ isOpen }: { isOpen: boolean }) {
      hookResult = useModalAnimation(isOpen, 200);
      return React.createElement('div', null, hookResult.isMounted ? 'mounted' : 'unmounted');
    }

    act(() => {
      root.render(React.createElement(TestComponent, { isOpen: true }));
    });

    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(hookResult.phase).toBe('entered');

    // Trigger close
    act(() => {
      root.render(React.createElement(TestComponent, { isOpen: false }));
    });

    // Should be in exiting phase, still mounted so exit transition can play
    expect(hookResult.phase).toBe('exiting');
    expect(hookResult.isMounted).toBe(true);

    // After duration (200ms), it should unmount
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(hookResult.phase).toBe('unmounted');
    expect(hookResult.isMounted).toBe(false);
  });
});
