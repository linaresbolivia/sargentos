import React from 'react';
import logoUrl from '../../assets/logo.png';

interface CrestLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const CrestLogo: React.FC<CrestLogoProps> = ({ className = '', size = 'md' }) => {
  const dimensions = {
    sm: 'w-12 h-16',
    md: 'w-24 h-32',
    lg: 'w-36 h-48',
    xl: 'w-48 h-64',
  };

  return (
    <div className={`flex items-center justify-center ${dimensions[size]} ${className}`}>
      <img 
        src={logoUrl} 
        alt="Club Hípico Los Sargentos Logo" 
        className="w-full h-full object-contain drop-shadow-2xl"
      />
    </div>
  );
};
export default CrestLogo;
