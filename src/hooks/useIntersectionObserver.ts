import { useEffect, useRef, useState, useCallback } from 'react';

export interface UseIntersectionObserverOptions {
  /**
   * The threshold(s) at which to trigger the callback.
   * A number between 0 and 1, or an array of numbers.
   * @default 0
   */
  threshold?: number | number[];
  
  /**
   * Margin around the root element. Can be specified in pixels or percentages.
   * @default '0px'
   */
  rootMargin?: string;
  
  /**
   * The element used as the viewport for checking visibility.
   * @default null (browser viewport)
   */
  root?: Element | null;
  
  /**
   * Whether to stop observing after the first intersection.
   * @default false
   */
  triggerOnce?: boolean;
}

export interface UseIntersectionObserverReturn {
  /**
   * Ref to attach to the element you want to observe
   */
  ref: (node: Element | null) => void;
  
  /**
   * Whether the element is currently intersecting
   */
  isIntersecting: boolean;
  
  /**
   * The raw IntersectionObserverEntry for advanced use cases
   */
  entry: IntersectionObserverEntry | null;
}

/**
 * A hook that observes when an element enters or exits the viewport.
 * 
 * @example
 * ```tsx
 * // Lazy load a component when it scrolls into view
 * const { ref, isIntersecting } = useIntersectionObserver({
 *   triggerOnce: true,
 *   threshold: 0.1,
 * });
 * 
 * return (
 *   <div ref={ref}>
 *     {isIntersecting ? <HeavyComponent /> : <LoadingSkeleton />}
 *   </div>
 * );
 * ```
 * 
 * @example
 * ```tsx
 * // Scroll spy for table of contents
 * const { ref, isIntersecting } = useIntersectionObserver({
 *   rootMargin: '0px 0px -80% 0px',
 * });
 * 
 * useEffect(() => {
 *   if (isIntersecting) {
 *     setActiveSection(sectionId);
 *   }
 * }, [isIntersecting]);
 * ```
 * 
 * @param options - Configuration options for the intersection observer
 * @returns An object containing ref, isIntersecting, and entry
 */
export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
): UseIntersectionObserverReturn {
  const {
    threshold = 0,
    rootMargin = '0px',
    root = null,
    triggerOnce = false,
  } = options;

  const [isIntersecting, setIsIntersecting] = useState(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const [element, setElement] = useState<Element | null>(null);
  const hasTriggered = useRef(false);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (triggerOnce && hasTriggered.current) return;

      const targetEntry = entries[0];
      if (!targetEntry) return;

      const intersecting = targetEntry.isIntersecting;
      setEntry(targetEntry);
      setIsIntersecting(intersecting);

      if (triggerOnce && intersecting) {
        hasTriggered.current = true;
      }
    },
    [triggerOnce]
  );

  const ref = useCallback((node: Element | null) => {
    setElement(node);
  }, []);

  useEffect(() => {
    if (!element) return;

    // If triggerOnce is enabled and already triggered, don't observe again
    if (triggerOnce && hasTriggered.current) {
      return;
    }

    const observer = new IntersectionObserver(handleIntersect, {
      threshold,
      rootMargin,
      root,
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [element, handleIntersect, threshold, rootMargin, root, triggerOnce]);

  return {
    ref,
    isIntersecting,
    entry,
  };
}

export default useIntersectionObserver;