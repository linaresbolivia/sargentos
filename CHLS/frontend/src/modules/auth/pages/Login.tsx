import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { CrestLogo } from '@shared/components/CrestLogo';
import { ThemeToggle } from '@shared/components/ThemeToggle';
import { LanguageToggle } from '@shared/components/LanguageToggle';
import { useTranslation } from 'react-i18next';
import { api } from '@config/api';
import { RootState } from '@store/store';
import { loginStart, loginSuccess, loginFailure } from '@store/authSlice';

export const Login: React.FC = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { isLoading } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error(t('login.errorFields'));
      return;
    }

    dispatch(loginStart());

    try {
      const response = await api.post('/auth/login', { email, password });
      const { user, accessToken } = response.data.data;

      dispatch(loginSuccess({ user, accessToken }));
      toast.success(t('login.welcomeBack'));
      navigate('/');
    } catch (err: any) {
      const message = err.response?.data?.message || t('login.errorLogin');
      dispatch(loginFailure(message));
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Liquid background blobs */}
      <div className="liquid-bg-blob liquid-bg-blob-1"></div>
      <div className="liquid-bg-blob liquid-bg-blob-2"></div>
      <div className="liquid-bg-blob liquid-bg-blob-3"></div>

      {/* Theme and Language Toggles in top right */}
      <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md glass-panel bg-[#133825] dark:bg-[#0a2014]/90 p-8 relative z-10 flex flex-col gap-6 border border-brand-gold/20 shadow-[0_0_50px_rgba(19,56,37,0.4)]">
        
        {/* Header */}
        <div className="flex flex-col items-center gap-2 text-center">
          <CrestLogo size="md" className="mb-2" />
          <p className="text-gray-300 text-xs md:text-sm">{t('login.title')}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5 relative">
            <label className="text-xs font-medium text-gray-300 px-1">{t('login.emailLabel')}</label>
            <div className="relative flex items-center">
              <Mail size={16} className="absolute left-3 text-gray-500" />
              <input
                type="email"
                placeholder={t('login.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full glass-input pl-10"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 relative">
            <label className="text-xs font-medium text-gray-300 px-1">{t('login.passwordLabel')}</label>
            <div className="relative flex items-center">
              <Lock size={16} className="absolute left-3 text-gray-500" />
              <input
                type="password"
                placeholder={t('login.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full glass-input pl-10"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="glass-button-primary mt-2 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {t('login.submit')} <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
};
