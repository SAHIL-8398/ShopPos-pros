/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface AppLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  rounded?: string;
  glow?: boolean;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  className = '',
  size = 'md',
  rounded = 'rounded-xl',
  glow = true,
}) => {
  const sizeClasses = {
    xs: 'w-5 h-5',
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  }[size];

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 overflow-hidden ${sizeClasses} ${rounded} ${className} ${
        glow ? 'shadow-[0_0_12px_rgba(236,72,153,0.3)] border border-pink-500/30' : ''
      }`}
    >
      <img
        src="/app-icon.svg"
        alt="ShopPOS App Icon"
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover select-none pointer-events-none"
      />
    </div>
  );
};
