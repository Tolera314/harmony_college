'use client';

import React, { useId } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
  hint?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  icon,
  error,
  hint,
  id: idProp,
  className = '',
  required,
  ...props
}) => {
  const generated = useId();
  const inputId   = idProp ?? `input-${generated}`;
  const errorId   = `${inputId}-error`;
  const hintId    = `${inputId}-hint`;

  const describedBy = [
    error ? errorId : null,
    hint  ? hintId  : null,
  ].filter(Boolean).join(' ') || undefined;

  return (
    <div className="space-y-1.5 w-full font-sans text-xs sm:text-sm">
      {label && (
        <label
          htmlFor={inputId}
          className="block font-semibold ds-input-label"
        >
          {label}
          {required && (
            <span
              className="ml-1 text-[--status-danger]"
              aria-hidden="true"
              title="Required"
            >
              *
            </span>
          )}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div
            className="absolute left-3.5 top-1/2 -translate-y-1/2 ds-input-icon pointer-events-none"
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
        <input
          id={inputId}
          aria-describedby={describedBy}
          aria-invalid={error ? 'true' : undefined}
          aria-required={required}
          className={`ds-input w-full py-3 rounded-xl border focus:outline-none transition-colors ${
            icon ? 'pl-10 pr-4' : 'px-4'
          } ${error ? 'border-[--status-danger]' : ''} ${className}`}
          required={required}
          {...props}
        />
      </div>
      {hint && !error && (
        <p id={hintId} className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-xs font-mono"
          style={{ color: 'var(--status-danger)' }}
        >
          {error}
        </p>
      )}
    </div>
  );
};
