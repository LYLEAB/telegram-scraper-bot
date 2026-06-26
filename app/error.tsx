'use client';

import React, { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled Next.js App Router Error:', error);
  }, [error]);

  return (
    <div className="container" style={{ marginTop: '2rem' }}>
      <div className="card">
        <h2 style={{ color: 'var(--kb-red)' }}>Something went wrong!</h2>
        <p style={{ margin: '1rem 0' }}>An unexpected error occurred while rendering the page.</p>
        <pre style={{
          backgroundColor: 'rgba(0,0,0,0.5)',
          padding: '1rem',
          borderRadius: '8px',
          overflowX: 'auto',
          fontSize: '0.85rem',
          color: '#ff8a8a'
        }}>
          {error.message}
          {'\n'}
          {error.stack}
        </pre>
        <button className="btn-submit" onClick={() => reset()} style={{ marginTop: '1rem', maxWidth: '200px' }}>
          Try again
        </button>
      </div>
    </div>
  );
}
