import React, { useState, useEffect } from 'react';
import { X, Share, PlusSquare, Download } from 'lucide-react';

export const PWAInstallPrompt: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Detectar se já está instalado (Modo Standalone)
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(isInStandaloneMode);

    if (isInStandaloneMode) return;

    // 2. Detectar se é iOS (iPhone/iPad)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 3. Lógica de exibição
    // Se for iOS, mostra após 2 segundos.
    // Se for Android/Desktop, espera o evento 'beforeinstallprompt' capturado no index.tsx
    if (isIosDevice) {
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    } else {
      // Verifica se o evento já foi capturado anteriormente
      if ((window as any).deferredPrompt) {
        setShowPrompt(true);
      }
      
      // Escuta novos eventos caso ainda não tenha disparado
      const handleBeforeInstallPrompt = () => {
        setShowPrompt(true);
      };
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = (window as any).deferredPrompt;
    if (!promptEvent) return;

    // Mostra o prompt nativo
    promptEvent.prompt();
    
    // Espera a escolha do usuário
    const { outcome } = await promptEvent.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
      (window as any).deferredPrompt = null;
    }
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 relative">
        <button 
          onClick={() => setShowPrompt(false)}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full p-1"
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-4 pr-6">
          <div className="bg-primary text-white p-3 rounded-lg shrink-0">
             <Download size={24} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm mb-1">Instalar Aplicativo</h3>
            
            {isIOS ? (
              <div className="text-xs text-gray-600 space-y-2">
                <p>Para instalar no iPhone/iPad:</p>
                <div className="flex items-center gap-2">
                  1. Toque em <span className="inline-flex items-center justify-center bg-gray-100 p-1 rounded"><Share size={12} className="text-blue-500"/></span> Compartilhar
                </div>
                <div className="flex items-center gap-2">
                  2. Selecione <span className="inline-flex items-center justify-center bg-gray-100 p-1 rounded"><PlusSquare size={12}/></span> <strong>Adicionar à Tela de Início</strong>
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-600 mb-3">
                <p>Adicione o Constructa à sua tela inicial para acesso rápido e funcionamento offline.</p>
              </div>
            )}

            {!isIOS && (
              <button 
                onClick={handleInstallClick}
                className="mt-2 bg-primary hover:bg-slate-800 text-white text-xs font-bold py-2 px-4 rounded-lg w-full transition-colors"
              >
                Instalar Agora
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};