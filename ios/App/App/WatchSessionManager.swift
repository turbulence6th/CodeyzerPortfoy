//
//  WatchSessionManager.swift
//  App
//
//  iOS tarafında Watch ile iletişimi yöneten sınıf
//  Sadece holdings listesini gönderir, Watch kendi fiyatlarını çeker
//

import Foundation
import WatchConnectivity

class WatchSessionManager: NSObject, ObservableObject {
    static let shared = WatchSessionManager()

    private var session: WCSession?

    override init() {
        super.init()
        print("📱 [WatchSession] WatchSessionManager başlatılıyor...")
        setupSession()
    }

    private func setupSession() {
        print("📱 [WatchSession] WCSession.isSupported: \(WCSession.isSupported())")
        if WCSession.isSupported() {
            session = WCSession.default
            session?.delegate = self
            session?.activate()
            print("📱 [WatchSession] Session aktive ediliyor...")
        } else {
            print("📱 [WatchSession] ❌ WCSession desteklenmiyor!")
        }
    }

    // MARK: - Send Holdings to Watch

    /// Varlık listesini Watch'a gönder (fiyatsız, sadece sembol ve miktar)
    func sendHoldings(_ holdings: [[String: Any]]) {
        print("📱 [WatchSession] sendHoldings çağrıldı, varlık sayısı: \(holdings.count)")

        guard let session = session else {
            print("📱 [WatchSession] ❌ Session nil!")
            return
        }

        print("📱 [WatchSession] Session durumu:")
        print("  - isPaired: \(session.isPaired)")
        print("  - isWatchAppInstalled: \(session.isWatchAppInstalled)")
        print("  - isReachable: \(session.isReachable)")
        print("  - activationState: \(session.activationState.rawValue)")

        guard session.isPaired else {
            print("📱 [WatchSession] ❌ Watch eşleşmemiş!")
            return
        }

        guard session.isWatchAppInstalled else {
            print("📱 [WatchSession] ❌ Watch uygulaması yüklü değil!")
            return
        }

        // JSON encode
        if let jsonData = try? JSONSerialization.data(withJSONObject: holdings) {
            print("📱 [WatchSession] ✅ JSON encode başarılı, boyut: \(jsonData.count) bytes")

            // App context olarak gönder (Watch açılmasa bile son veriyi alır)
            do {
                try session.updateApplicationContext(["holdings": jsonData])
                print("📱 [WatchSession] ✅ Application context güncellendi")
            } catch {
                print("📱 [WatchSession] ❌ Application context güncellenemedi: \(error)")
            }

            // Eğer Watch erişilebilirse direkt mesaj gönder
            if session.isReachable {
                print("📱 [WatchSession] Watch erişilebilir, mesaj gönderiliyor...")
                session.sendMessage(["holdings": jsonData], replyHandler: { response in
                    print("📱 [WatchSession] ✅ Mesaj cevabı alındı: \(response)")
                }) { error in
                    print("📱 [WatchSession] ❌ Mesaj gönderilemedi: \(error)")
                }
            } else {
                print("📱 [WatchSession] ⚠️ Watch şu an erişilebilir değil, sadece context gönderildi")
            }
        } else {
            print("📱 [WatchSession] ❌ JSON encode başarısız!")
        }

        // App Groups üzerinden de kaydet (offline erişim için)
        saveToAppGroup(holdings)
    }

    private func saveToAppGroup(_ holdings: [[String: Any]]) {
        print("📱 [WatchSession] App Groups'a kaydediliyor...")
        if let defaults = UserDefaults(suiteName: "group.com.codeyzer.portfoy") {
            if let jsonData = try? JSONSerialization.data(withJSONObject: holdings) {
                defaults.set(jsonData, forKey: "watchHoldings")
                defaults.synchronize()
                print("📱 [WatchSession] ✅ App Groups'a kaydedildi")
            } else {
                print("📱 [WatchSession] ❌ App Groups JSON encode başarısız")
            }
        } else {
            print("📱 [WatchSession] ❌ App Groups UserDefaults oluşturulamadı!")
        }
    }
}

// MARK: - WCSessionDelegate
extension WatchSessionManager: WCSessionDelegate {
    func sessionDidBecomeInactive(_ session: WCSession) {
        print("📱 [WatchSession] Session inactive oldu")
    }

    func sessionDidDeactivate(_ session: WCSession) {
        print("📱 [WatchSession] Session deactivate oldu, yeniden aktive ediliyor...")
        session.activate()
    }

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        if let error = error {
            print("📱 [WatchSession] ❌ Aktivasyon hatası: \(error)")
        } else {
            print("📱 [WatchSession] ✅ Aktivasyon tamamlandı")
            print("  - activationState: \(activationState.rawValue) (0=notActivated, 1=inactive, 2=activated)")
            print("  - isPaired: \(session.isPaired)")
            print("  - isWatchAppInstalled: \(session.isWatchAppInstalled)")
        }
    }

    // Watch'tan gelen mesajları dinle
    func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
        print("📱 [WatchSession] Watch'tan mesaj alındı: \(message.keys)")

        if message["request"] as? String == "holdings" {
            print("📱 [WatchSession] Watch holdings listesi istiyor...")
            // Watch holdings listesi istedi - App Groups'tan oku ve gönder
            if let defaults = UserDefaults(suiteName: "group.com.codeyzer.portfoy"),
               let data = defaults.data(forKey: "watchHoldings") {
                print("📱 [WatchSession] ✅ App Groups'tan veri okundu, boyut: \(data.count) bytes")
                replyHandler(["holdings": data])
            } else {
                print("📱 [WatchSession] ❌ App Groups'ta veri yok!")
                replyHandler([:])
            }
        }
    }
}
