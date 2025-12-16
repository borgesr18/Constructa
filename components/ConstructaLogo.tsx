import React from 'react';

export const ConstructaLogo = ({ className = "w-8 h-8", color = "text-accent" }: { className?: string; color?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M3 21V8L12 2L21 8V21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={color} />
    <path d="M9 10L12 8L15 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white opacity-80" />
    <path d="M9 21V14H15V21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={color} />
  </svg>
);