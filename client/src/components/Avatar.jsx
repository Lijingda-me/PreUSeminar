import React from 'react';
import { useState } from 'react';

function initialsFor(name = '') {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
  return `${words[0].slice(0, 1)}${words[words.length - 1].slice(0, 1)}`.toUpperCase();
}

export default function Avatar({ name, src, className = 'h-12 w-12', rounded = 'rounded-full' }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return <img src={src} alt="" onError={() => setFailed(true)} className={`${className} ${rounded} object-cover`} />;
  }
  return (
    <div className={`${className} ${rounded} grid place-items-center bg-gradient-to-br from-brand-blue via-brand-sky to-brand-green font-black text-white shadow-soft`}>
      <span>{initialsFor(name)}</span>
    </div>
  );
}
