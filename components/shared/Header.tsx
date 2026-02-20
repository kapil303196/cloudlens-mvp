/**
 * CloudSave AI — Header Component
 * Top navigation bar with logo, theme toggle, and GitHub link.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { Moon, Sun, Github, ExternalLink } from 'lucide-react';
import { Logo } from './Logo';

interface HeaderProps {
  isDark?: boolean;
  onToggleTheme?: () => void;
}

/** Application header with navigation and theme controls */
export function Header({ isDark = true, onToggleTheme }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-900/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Logo size="sm" showText={true} />
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-slate-400 sm:flex">
          <span className="text-slate-500">Powered by</span>
          <span className="flex items-center gap-1.5 rounded-full bg-violet-500/10 px-3 py-1 text-violet-400 text-xs font-medium border border-violet-500/20">
            Claude AI
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-500 text-xs">Prod Bois</span>
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Github size={16} />
            <span className="text-xs">GitHub</span>
          </a>
          <button
            onClick={onToggleTheme}
            className="rounded-lg p-2 text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
    </header>
  );
}
