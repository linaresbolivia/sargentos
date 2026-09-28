import React from 'react';
import { useTranslation } from 'react-i18next';

export const LanguageToggle: React.FC = () => {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language.startsWith('es') ? 'en' : 'es';
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="p-2 rounded-xl border border-brand-gold/30 theme-search-bg text-brand-gold hover:bg-brand-gold/10 transition-colors flex items-center justify-center font-bold text-xs uppercase w-10 h-10 shadow-lg"
      title="Cambiar Idioma / Change Language"
    >
      {i18n.language.startsWith('es') ? 'EN' : 'ES'}
    </button>
  );
};
