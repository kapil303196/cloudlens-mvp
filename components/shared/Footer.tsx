/**
 * CloudSave AI — Footer Component
 */

import React from 'react';
import { Logo } from './Logo';

/** Application footer with branding and disclaimer */
export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-slate-900/50 py-8 mt-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <Logo size="sm" showText={true} />
          <p className="text-center text-xs text-slate-500">
            Estimates based on static analysis. Actual savings may vary. Review with your team.
          </p>
          <p className="text-xs text-slate-600">
            © 2026 Prod Bois
          </p>
        </div>
      </div>
    </footer>
  );
}
