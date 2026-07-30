import React from 'react';
import { useIntersectionObserver } from '../src/hooks/useIntersectionObserver';

export const IntersectionObserverExample = () => {
  const { ref, isIntersecting, entry } = useIntersectionObserver({
    threshold: 0.5,
    triggerOnce: false,
  });

  return (
    <div style={{ padding: '20px' }}>
      <h1>useIntersectionObserver Example</h1>
      <div style={{ height: '100vh', background: '#f0f0f0', padding: '20px' }}>
        Scroll down to see the observer in action
      </div>
      
      <div
        ref={ref}
        style={{
          height: '300px',
          background: isIntersecting ? '#4CAF50' : '#f44336',
          color: 'white',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          transition: 'background 0.3s ease',
          borderRadius: '8px',
          margin: '20px 0',
        }}
      >
        {isIntersecting ? '👀 Element is visible!' : '🔍 Scroll down to see me'}
      </div>
      
      <div style={{ padding: '20px', background: '#e0e0e0', borderRadius: '8px' }}>
        <h3>Observer State</h3>
        <pre style={{ background: '#fff', padding: '10px', borderRadius: '4px' }}>
          {JSON.stringify({
            isIntersecting,
            intersectionRatio: entry?.intersectionRatio || 0,
            boundingClientRect: entry?.boundingClientRect,
          }, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default IntersectionObserverExample;