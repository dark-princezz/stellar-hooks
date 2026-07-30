---
title: useIntersectionObserver
description: React hook for observing element visibility in the viewport
---

# useIntersectionObserver

A React hook that uses the Intersection Observer API to detect when an element enters or exits the viewport.

## Installation

```bash
npm install @stellar/hooks
# or
yarn add @stellar/hooks
```

## API

```typescript
function useIntersectionObserver(
  options?: UseIntersectionObserverOptions
): UseIntersectionObserverReturn
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `threshold` | `number \| number[]` | `0` | The threshold(s) at which to trigger the callback |
| `rootMargin` | `string` | `'0px'` | Margin around the root element |
| `root` | `Element \| null` | `null` | The element used as the viewport for checking visibility |
| `triggerOnce` | `boolean` | `false` | Whether to stop observing after the first intersection |

### Return Value

| Property | Type | Description |
|----------|------|-------------|
| `ref` | `(node: Element \| null) => void` | Ref to attach to the element you want to observe |
| `isIntersecting` | `boolean` | Whether the element is currently intersecting |
| `entry` | `IntersectionObserverEntry \| null` | The raw IntersectionObserverEntry for advanced use cases |

## Usage Examples

### Basic Usage

Detect when an element becomes visible:

```tsx
import { useIntersectionObserver } from '@stellar/hooks';

function BasicExample() {
  const { ref, isIntersecting } = useIntersectionObserver();

  return (
    <div>
      <div style={{ height: '100vh' }}>Scroll down to see the element</div>
      <div ref={ref} style={{ padding: '20px', background: isIntersecting ? 'green' : 'red' }}>
        {isIntersecting ? 'Element is visible! 🎉' : 'Element is hidden'}
      </div>
    </div>
  );
}
```

### Lazy Loading Components

Load heavy components only when they scroll into view:

```tsx
import { useIntersectionObserver } from '@stellar/hooks';
import { useState } from 'react';

function LazyLoadedComponent() {
  const [shouldLoad, setShouldLoad] = useState(false);
  const { ref, isIntersecting } = useIntersectionObserver({
    triggerOnce: true,
    threshold: 0.1,
    rootMargin: '0px 0px 100px 0px',
  });

  if (isIntersecting && !shouldLoad) {
    setShouldLoad(true);
  }

  return (
    <div ref={ref} style={{ minHeight: '400px' }}>
      {shouldLoad ? (
        <div style={{ padding: '20px', background: '#4CAF50', color: 'white' }}>
          Heavy Component Loaded!
        </div>
      ) : (
        <div style={{ 
          height: '400px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: '#f0f0f0'
        }}>
          Loading component when scrolled into view...
        </div>
      )}
    </div>
  );
}
```

### Scroll Spy for Table of Contents

Highlight navigation items based on scroll position:

```tsx
import { useIntersectionObserver } from '@stellar/hooks';
import { useEffect, useState } from 'react';

function TableOfContents() {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sections = [
    { id: 'introduction', title: 'Introduction' },
    { id: 'installation', title: 'Installation' },
    { id: 'usage', title: 'Usage' },
  ];

  const Section = ({ id, children }: { id: string; children: React.ReactNode }) => {
    const { ref, isIntersecting } = useIntersectionObserver({
      rootMargin: '0px 0px -80% 0px',
    });

    useEffect(() => {
      if (isIntersecting) {
        setActiveId(id);
      }
    }, [isIntersecting, id]);

    return <section ref={ref} id={id}>{children}</section>;
  };

  return (
    <div>
      <nav>
        <ul>
          {sections.map((section) => (
            <li key={section.id} style={{ 
              fontWeight: activeId === section.id ? 'bold' : 'normal',
              color: activeId === section.id ? 'blue' : 'black'
            }}>
              <a href={`#${section.id}`}>{section.title}</a>
            </li>
          ))}
        </ul>
      </nav>
      
      <div style={{ height: '100vh' }}>Scroll to see the spy in action</div>
      
      <Section id="introduction">
        <h2>Introduction</h2>
        <p>Introduction content here...</p>
        <div style={{ height: '100vh' }}>More content to scroll</div>
      </Section>
      
      <Section id="installation">
        <h2>Installation</h2>
        <p>Installation content here...</p>
        <div style={{ height: '100vh' }}>More content to scroll</div>
      </Section>
      
      <Section id="usage">
        <h2>Usage</h2>
        <p>Usage content here...</p>
      </Section>
    </div>
  );
}
```

### Infinite Scroll

Load more items as the user scrolls:

```tsx
import { useIntersectionObserver } from '@stellar/hooks';
import { useState, useEffect } from 'react';

function InfiniteScrollList() {
  const [items, setItems] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const { ref, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '0px 0px 200px 0px',
  });

  const loadMore = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const newItems = Array.from({ length: 10 }, (_, i) => `Item ${(page - 1) * 10 + i + 1}`);
    setItems(prev => [...prev, ...newItems]);
    setPage(prev => prev + 1);
    setLoading(false);
  };

  useEffect(() => {
    if (isIntersecting && !loading) {
      loadMore();
    }
  }, [isIntersecting, loading]);

  return (
    <div style={{ maxHeight: '500px', overflow: 'auto' }}>
      {items.map((item, index) => (
        <div key={index} style={{ padding: '20px', borderBottom: '1px solid #ccc' }}>
          {item}
        </div>
      ))}
      <div ref={ref} style={{ padding: '20px', textAlign: 'center' }}>
        {loading ? 'Loading more...' : 'Scroll for more'}
      </div>
    </div>
  );
}
```

## Common Use Cases

- **Lazy loading**: Load images, components, or data when they scroll into view
- **Scroll spy**: Highlight active sections in navigation
- **Infinite scrolling**: Load more content when reaching the bottom
- **Animation triggering**: Trigger animations when elements appear
- **Ad visibility tracking**: Track when ads become visible to users
- **Performance optimization**: Defer rendering of off-screen content

## Performance Considerations

- The hook automatically cleans up the IntersectionObserver on unmount
- Use `triggerOnce: true` for one-time operations to improve performance
- Consider using `rootMargin` to start loading before the element is visible
- For lists with many items, consider virtual scrolling in addition to intersection observation

## Browser Support

This hook uses the [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API), which is supported in all modern browsers:

- Chrome 51+
- Firefox 55+
- Safari 12.1+
- Edge 15+
- Opera 38+

For older browsers, you may need to include a polyfill.

## Related Hooks

- `useStellarAccount` - Fetch Stellar account data
- `useStellarBalance` - Fetch Stellar balances
- `useTransaction` - Manage Stellar transactions

## See Also

- [MDN Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- [React useRef Hook](https://reactjs.org/docs/hooks-reference.html#useref)