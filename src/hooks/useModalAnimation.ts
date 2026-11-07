import { useState, useEffect } from 'react';

export type AnimationPhase = 'unmounted' | 'entering' | 'entered' | 'exiting';

/**
 * Custom hook to coordinate smooth open/close entry and exit transitions for modals and popovers.
 * Keeps the component mounted in the DOM while the exit animation is playing.
 */
export function useModalAnimation(isOpen: boolean, exitDurationMs = 200) {
  const [phase, setPhase] = useState<AnimationPhase>(isOpen ? 'entered' : 'unmounted');

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (isOpen) {
      setPhase('entering');
      // Two rAF ticks ensure DOM has painted the initial entering state before transitioning to entered
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setPhase('entered');
        });
      });
      return () => cancelAnimationFrame(frame);
    } else {
      setPhase((prev) => {
        if (prev === 'unmounted') return 'unmounted';
        return 'exiting';
      });
      timer = setTimeout(() => {
        setPhase('unmounted');
      }, exitDurationMs);
      return () => {
        if (timer) clearTimeout(timer);
      };
    }
  }, [isOpen, exitDurationMs]);

  return {
    isMounted: phase !== 'unmounted',
    phase
  };
}
