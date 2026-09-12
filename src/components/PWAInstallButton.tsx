import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share2, PlusSquare, X, Check } from 'lucide-react';

export const PWAInstallButton: React.FC<{ variant?: 'nav' | 'banner' | 'icon' }> = ({
  variant = 'nav',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installedNotice, setInstalledNotice] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleInstall = async () => {
    const success = await install();
    if (success) {
      setInstalledNotice(true);
      setTimeout(() => setInstalledNotice(false), 3000);
    }
  };

  if (isInstallable) {
    if (variant === 'icon') {
      return (
        <button
          id="pwa-install-icon-btn"
          onClick={handleInstall}
          title="Instalar aplicativo GestLab"
          className="p-2 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4" />
        </button>
      );
    }

    return (
      <button
        id="pwa-install-app-btn"
        onClick={handleInstall}
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:from-blue-700 hover:to-indigo-700 transition cursor-pointer"
      >
        {installedNotice ? (
          <>
            <Check className="w-3.5 h-3.5" />
            <span>Instalado!</span>
          </>
        ) : (
          <>
            <Download className="w-3.5 h-3.5 animate-bounce" />
            <span>Instalar App</span>
          </>
        )}
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          id="pwa-install-ios-btn"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-xs"
        >
          <Download className="w-3.5 h-3.5 text-blue-600" />
          <span>Instalar App</span>
        </button>

        {showIOSGuide && (
          <div
            id="pwa-ios-guide-modal"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in"
          >
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                    <Download className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Instalar no iPhone / iPad</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-slate-600">
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shrink-0 text-[10px]">
                    1
                  </span>
                  <p>
                    Toque no botão de <strong>Compartilhar</strong>{' '}
                    <Share2 className="w-3.5 h-3.5 inline text-blue-600 mx-0.5" /> na barra inferior do Safari.
                  </p>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shrink-0 text-[10px]">
                    2
                  </span>
                  <p>
                    Role para baixo e selecione a opção{' '}
                    <strong>Adicionar à Tela de Início</strong>{' '}
                    <PlusSquare className="w-3.5 h-3.5 inline text-blue-600 mx-0.5" />.
                  </p>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shrink-0 text-[10px]">
                    3
                  </span>
                  <p>
                    Toque em <strong>Adicionar</strong> no canto superior direito para acessar o sistema como um aplicativo nativo.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition cursor-pointer shadow-xs"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
