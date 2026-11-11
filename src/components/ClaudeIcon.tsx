import React from 'react';

export function ClaudeSunburstIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <g stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <line x1="16" y1="3" x2="16" y2="29" />
        <line x1="3" y1="16" x2="29" y2="16" />
        <line x1="6.8" y1="6.8" x2="25.2" y2="25.2" />
        <line x1="25.2" y1="6.8" x2="6.8" y2="25.2" />
        <line x1="11" y1="4.1" x2="21" y2="27.9" />
        <line x1="21" y1="4.1" x2="11" y2="27.9" />
        <line x1="4.1" y1="11" x2="27.9" y2="21" />
        <line x1="4.1" y1="21" x2="27.9" y2="11" />
      </g>
      <circle cx="16" cy="16" r="3.2" fill="currentColor" />
    </svg>
  );
}
