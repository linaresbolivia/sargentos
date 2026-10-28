import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);
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
      const response = await api.post('/auth/login', { 
        email, 
        username: email, 
        password 
      });
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

        {/* Socio Quick Notice */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-900/40 border border-emerald-500/30 text-emerald-200 text-xs">
          <span className="font-bold text-brand-gold uppercase tracking-wider">Socios:</span>
          <span>Ingrese con su <strong>Código de Socio / N° de Acción</strong></span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5 relative">
            <label className="text-xs font-medium text-gray-300 px-1">Código de Socio / Usuario / Correo</label>
            <div className="relative flex items-center">
              <Mail size={16} className="absolute left-3 text-slate-400 dark:text-gray-400" />
              <input
                id="login-email"
                type="text"
                placeholder="Ej. 2625 (Socio) o usuario institucional"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full glass-input pl-10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-400 font-medium"
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 relative">
            <label className="text-xs font-medium text-gray-300 px-1">{t('login.passwordLabel')}</label>
            <div className="relative flex items-center">
              <Lock size={16} className="absolute left-3 text-slate-400 dark:text-gray-400" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder={t('login.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full glass-input pl-10 pr-10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-400 font-medium"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            id="login-submit-btn"
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

        <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-white/10 text-center">
          <button
            type="button"
            onClick={() => navigate('/news')}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 inline-flex items-center gap-1.5 transition-colors"
          >
            <span>Ver Biblioteca Digital y Noticias Oficiales</span>
            <ArrowRight size={13} />
          </button>
        </div>

      </div>
    </div>
  );
};
