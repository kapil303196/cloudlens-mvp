/**
 * CloudSave AI — File Preview Component
 * Displays info about an uploaded file before analysis.
 */

'use client';

import React from 'react';
import { FileCode, FileArchive, Image, X, CheckCircle2 } from 'lucide-react';
import type { UploadedFile } from '../../lib/types';
import { formatFileSize } from '../../lib/utils/format';

interface FilePreviewProps {
  file: UploadedFile;
  onRemove?: () => void;
}

const TYPE_CONFIG = {
  cdk: { label: 'AWS CDK', color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20', icon: FileCode },
  terraform: { label: 'Terraform', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: FileCode },
  cloudformation: { label: 'CloudFormation', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: FileCode },
  'ecs-task': { label: 'ECS Task Definition', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: FileCode },
  zip: { label: 'ZIP Archive', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', icon: FileArchive },
  image: { label: 'Architecture Diagram', color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20', icon: Image },
  unknown: { label: 'Unknown', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', icon: FileCode },
};

/** Shows a single uploaded file with type badge and remove option */
export function FilePreview({ file, onRemove }: FilePreviewProps) {
  const config = TYPE_CONFIG[file.type] ?? TYPE_CONFIG.unknown;
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-3 rounded-xl border p-4 ${config.bg} ${config.border}`}>
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-white/10`}>
        <Icon size={20} className={config.color} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-white">{file.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
          <span className="text-slate-600">·</span>
          <span className="text-xs text-slate-500">{formatFileSize(file.size)}</span>
        </div>
      </div>

      <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />

      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 rounded-lg p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          aria-label="Remove file"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
