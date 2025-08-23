import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { NativeBiometric } from 'capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';

interface AuthContextType {
  isAuthenticated: boolean;
  isBiometricEnabled: boolean;
  isLoading: boolean;
  error: string | null;
  verifyIdentity: () => Promise<void>;
  lockApp: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Biometric ayarını localStorage'dan oku
  const isBiometricEnabled = JSON.parse(localStorage.getItem('isBiometricEnabled') || 'false');

  useEffect(() => {
    // Eğer biyometrik kilit kapalıysa, kullanıcıyı direkt olarak doğrulanmış say
    if (!isBiometricEnabled) {
      setIsAuthenticated(true);
      setIsLoading(false);
    } else {
      // Kilit açıksa, başlangıçta kullanıcıyı doğrulanmamış say
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  }, [isBiometricEnabled]);

  const verifyIdentity = useCallback(async () => {
    // Web platformunda geliştirme yaparken biyometrik kontrolü atla
    if (Capacitor.getPlatform() === 'web') {
      console.log('Running on web, skipping biometric check.');
      setIsAuthenticated(true);
      return;
    }

    try {
      setError(null);
      
      const isAvailable = await NativeBiometric.isAvailable();
      if (!isAvailable.isAvailable) {
        setError('Biyometrik doğrulama bu cihazda mevcut değil.');
        return;
      }

      await NativeBiometric.verifyIdentity({
        reason: 'Codeyzer Portföy uygulamasına erişim',
        title: 'Kimlik Doğrulama',
        subtitle: 'Lütfen devam etmek için kimliğinizi doğrulayın',
        description: 'Uygulamayı açmak için parmak izinizi kullanın',
      });

      // Başarılı doğrulama
      setIsAuthenticated(true);

    } catch (e: any) {
      const errorMessage = e?.message || 'Bilinmeyen bir hata oluştu.';
      if (errorMessage.includes('cancelled') || errorMessage.includes('canceled')) {
        // Kullanıcı iptal etti, özel bir hata mesajı göstermeyebiliriz.
        console.log('Biometric verification cancelled by user.');
      } else {
        setError(`Doğrulama başarısız: ${errorMessage}`);
      }
      setIsAuthenticated(false);
    }
  }, []);

  const lockApp = () => {
    if (isBiometricEnabled) {
      setIsAuthenticated(false);
    }
  };

  const value = {
    isAuthenticated,
    isBiometricEnabled,
    isLoading,
    error,
    verifyIdentity,
    lockApp,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
