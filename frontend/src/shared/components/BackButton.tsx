import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  to?: string;
  onClick?: () => void;
  title?: string;
  className?: string;
  iconClassName?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({
  to,
  onClick,
  title = 'Volver atrás',
  className = '',
  iconClassName = 'w-5 h-5',
}) => {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
      return;
    }
    if (to) {
      navigate(to);
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={title}
      aria-label={title}
      className={`p-2.5 rounded-2xl bg-white/80 dark:bg-black/40 hover:bg-brand-gold hover:text-black dark:hover:bg-brand-gold dark:hover:text-black border border-gray-200 dark:border-brand-gold/30 text-gray-700 dark:text-brand-gold shadow-sm transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center shrink-0 cursor-pointer ${className}`}
    >
      <ArrowLeft className={iconClassName} />
    </button>
  );
};

export default BackButton;
