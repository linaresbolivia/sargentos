import React from 'react';
import logoUrl from '../../assets/logo.png';

interface CrestLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const CrestLogo: React.FC<CrestLogoProps> = ({ className = '', size = 'md' }) => {
  const dimensions = {
    sm: 'w-10 h-12',
    md: 'w-16 h-20',
    lg: 'w-24 h-28',
    xl: 'w-32 h-40',
  };

  return (
    <div className={`flex items-center justify-center shrink-0 ${dimensions[size]} ${className}`}>
      <img 
        src={logoUrl} 
        alt="Club Inteligente Logo" 
        className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(212,175,55,0.35)]"
        loading="eager"
      />
    </div>
  );
};
export default CrestLogo;
