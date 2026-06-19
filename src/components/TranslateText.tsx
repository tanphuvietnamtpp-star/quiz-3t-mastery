import React from 'react';

interface TranslateTextProps {
  children: React.ReactNode;
  className?: string;
}

export function T({ children, className }: TranslateTextProps) {
  // If the children is already a string or number, wrap it in the required span.
  // This satisfies the requirement that 100% of headers and texts are wrapped in `<span translate="no" class="notranslate">`.
  return (
    <span translate="no" className={`notranslate ${className || ''}`}>
      {children}
    </span>
  );
}
