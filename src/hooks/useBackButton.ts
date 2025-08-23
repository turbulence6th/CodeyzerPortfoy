import { useEffect } from 'react';
import { App } from '@capacitor/app';
import type { BackButtonListenerEvent } from '@capacitor/app';

/**
 * Mobil cihazlarda donanım geri tuşuna basıldığında bir eylemi tetiklemek için kullanılan React hook'u.
 * @param callback Geri tuşuna basıldığında çalıştırılacak fonksiyon.
 * @param enabled Hook'un aktif olup olmadığını belirler. Genellikle bir diyalogun açık/kapalı durumudur.
 */
export const useBackButton = (callback: () => void, enabled: boolean) => {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const listenerPromise = App.addListener('backButton', (event: BackButtonListenerEvent) => {
      // `preventDefault` yerine, varsayılan davranışı engellemek için
      // olayın daha fazla yayılmasını durdurmak genellikle işe yarar.
      // Ancak Capacitor'ün özel bir yöntemi olabilir. Şimdilik bu genel bir çözüm.
      // event.stopImmediatePropagation(); // Bu event'te bu metot yoksa, aşağıdaki satırları kullan.
      
      // Capacitor'de geri tuşu olayını "işlenmiş" olarak işaretlemek ve
      // varsayılan davranışı (uygulamadan çıkma) engellemek için `canGoBack` kullanılır.
      // Bu callback'i bizim ele aldığımızı belirtiyoruz.
      if (event.canGoBack) {
        window.history.back();
      } else {
        // App'in varsayılan çıkış davranışını engellemek için bir şey yapmaya gerek yok,
        // callback'i çağırmamız yeterli.
      }
      callback();
    });

    // Cleanup fonksiyonu: Component unmount olduğunda veya 'enabled' false olduğunda
    // promise'in çözülmesini bekleyip listener'ı kaldır.
    return () => {
      listenerPromise.then(listener => listener.remove());
    };
  }, [enabled, callback]);
};
