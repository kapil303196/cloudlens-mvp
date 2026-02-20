/**
 * CloudSave AI — Logo Component
 * Brand logo with optional size variants.
 */

import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

/** CloudSave AI branded logo */
export function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const sizeMap = {
    sm: { icon: 24, text: 'text-lg' },
    md: { icon: 32, text: 'text-xl' },
    lg: { icon: 48, text: 'text-3xl' },
  };

  const { icon, text } = sizeMap[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Cloud icon with lightning bolt */}
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6C3CE1" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
        {/* Cloud shape */}
        <path
          d="M32 26H10C6.7 26 4 23.3 4 20C4 17.1 6.1 14.7 8.9 14.1C8.3 13.1 8 11.9 8 10.6C8 6.9 11 4 14.8 4C16.4 4 17.9 4.6 19.1 5.6C20.1 4 21.9 3 24 3C27.3 3 30 5.7 30 9C30 9.3 29.9 9.6 29.9 9.9C32.9 10.9 35 13.7 35 17C35 21.9 31.9 26 32 26Z"
          fill="url(#logoGradient)"
          opacity="0.9"
        />
        {/* Lightning bolt */}
        <path
          d="M21 16L17 22H20L19 28L23 22H20L21 16Z"
          fill="#10B981"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showText && (
        <span className={`font-bold tracking-tight ${text} bg-gradient-to-r from-violet-500 to-purple-400 bg-clip-text text-transparent`}>
          CloudSave AI
        </span>
      )}
    </div>
  );
}
