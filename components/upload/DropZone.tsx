/**
 * CloudSave AI — DropZone Component
 * Drag-and-drop file upload area with multi-format support.
 */

'use client';

import React, { useCallback, useRef, useState } from 'react';
import { Upload, FileCode, FileArchive, Image, Zap } from 'lucide-react';
import { APP_CONFIG } from '../../lib/utils/constants';
import { formatFileSize } from '../../lib/utils/format';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

const ACCEPTED_EXTENSIONS = '.ts,.js,.py,.tf,.yaml,.yml,.json,.zip,.png,.jpg,.svg';

const FILE_TYPE_ICONS: Record<string, React.ReactNode> = {
  cdk: <FileCode size={20} className="text-violet-400" />,
  terraform: <FileCode size={20} className="text-orange-400" />,
  cloudformation: <FileCode size={20} className="text-yellow-400" />,
  ecs: <Zap size={20} className="text-blue-400" />,
  zip: <FileArchive size={20} className="text-green-400" />,
  image: <Image size={20} className="text-pink-400" />,
};

/** Drag-and-drop file upload zone */
export function DropZone({ onFilesSelected, disabled = false }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (file.size > APP_CONFIG.maxFileSize) {
      return `"${file.name}" exceeds the 10MB size limit (${formatFileSize(file.size)})`;
    }
    return null;
  };

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const errors = fileArray.map(validateFile).filter(Boolean);
      if (errors.length > 0) {
        setDragError(errors[0]!);
        return;
      }
      setDragError(null);
      onFilesSelected(fileArray);
    },
    [onFilesSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      handleFiles(e.dataTransfer.files);
    },
    [disabled, handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
  };

  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload infrastructure file"
        onClick={handleClick}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-200
          ${disabled ? 'cursor-not-allowed opacity-50' : ''}
          ${isDragging
            ? 'border-violet-500 bg-violet-500/10 scale-[1.01]'
            : 'border-white/20 bg-white/5 hover:border-violet-500/50 hover:bg-violet-500/5'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          onChange={handleInputChange}
          className="hidden"
          multiple
          disabled={disabled}
          aria-hidden="true"
        />

        {/* Upload icon */}
        <div
          className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl transition-colors ${
            isDragging ? 'bg-violet-500/20' : 'bg-white/10'
          }`}
        >
          <Upload
            size={28}
            className={`transition-colors ${isDragging ? 'text-violet-400' : 'text-slate-400'}`}
          />
        </div>

        <h3 className="mb-2 text-lg font-semibold text-white">
          {isDragging ? 'Drop your file here' : 'Upload Infrastructure File'}
        </h3>
        <p className="mb-4 text-sm text-slate-400">
          Drag and drop or click to browse
        </p>

        {/* Supported formats */}
        <div className="flex flex-wrap justify-center gap-2">
          {[
            { label: 'CDK (.ts/.py)', icon: FILE_TYPE_ICONS.cdk },
            { label: 'Terraform (.tf)', icon: FILE_TYPE_ICONS.terraform },
            { label: 'CloudFormation (.yaml)', icon: FILE_TYPE_ICONS.cloudformation },
            { label: 'ECS Task (.json)', icon: FILE_TYPE_ICONS.ecs },
            // { label: 'ZIP Archive', icon: FILE_TYPE_ICONS.zip },
            { label: 'Architecture Image', icon: FILE_TYPE_ICONS.image },
          ].map(({ label, icon }) => (
            <span
              key={label}
              className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs text-slate-400 border border-white/10"
            >
              {icon}
              {label}
            </span>
          ))}
        </div>

        <p className="mt-4 text-xs text-slate-600">Max file size: 10MB</p>
      </div>

      {dragError && (
        <div className="mt-3 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {dragError}
        </div>
      )}
    </div>
  );
}
