//
//  PortfolioViewModel.swift
//  Codeyzer Portfoy Watch Watch App
//
//  Portföy verilerini yöneten ViewModel
//  Bağımsız olarak fiyatları çeker ve hesaplar
//

import Foundation
import Combine
import WatchConnectivity

@MainActor
class PortfolioViewModel: NSObject, ObservableObject {
    @Published var holdings: [WatchHolding] = []
    @Published var summary: PortfolioSummary = .empty
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var lastRefresh: Date?

    private var session: WCSession?
    private let priceService = PriceService.shared

    override init() {
        super.init()
        print("⌚️ [Watch] PortfolioViewModel başlatılıyor...")
        setupWatchConnectivity()
        loadHoldingsFromStorage()
    }

    // MARK: - Watch Connectivity

    private func setupWatchConnectivity() {
        print("⌚️ [Watch] WCSession.isSupported: \(WCSession.isSupported())")
        if WCSession.isSupported() {
            session = WCSession.default
            session?.delegate = self
            session?.activate()
            print("⌚️ [Watch] Session aktive ediliyor...")
        } else {
            print("⌚️ [Watch] ❌ WCSession desteklenmiyor!")
        }
    }

    /// Önceden gönderilmiş application context'i kontrol et
    private func checkReceivedApplicationContext() {
        guard let session = session else {
            print("⌚️ [Watch] ❌ Session nil, context kontrol edilemiyor")
            return
        }

        let context = session.receivedApplicationContext
        print("⌚️ [Watch] receivedApplicationContext kontrol ediliyor, keys: \(context.keys)")

        if let data = context["holdings"] as? Data {
            print("⌚️ [Watch] ✅ Cached context bulundu, boyut: \(data.count) bytes")
            parseAndLoadHoldings(from: data)
        } else {
            print("⌚️ [Watch] ⚠️ Cached context'te holdings yok")
        }
    }

    /// JSON data'yı parse et ve holdings'e yükle
    private func parseAndLoadHoldings(from data: Data) {
        // Önce JSONDecoder ile dene (Codable format)
        if let holdings = try? JSONDecoder().decode([WatchHolding].self, from: data) {
            print("⌚️ [Watch] ✅ JSONDecoder ile \(holdings.count) varlık decode edildi")
            self.holdings = holdings
            saveHoldingsLocally(holdings)
            Task {
                await refreshPrices()
            }
            return
        }

        // JSONSerialization ile dene (dictionary format - iOS'tan gelen)
        if let jsonArray = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
            print("⌚️ [Watch] JSONSerialization ile \(jsonArray.count) varlık bulundu")
            var holdings: [WatchHolding] = []
            for item in jsonArray {
                if let id = item["id"] as? String,
                   let symbol = item["symbol"] as? String,
                   let name = item["name"] as? String,
                   let type = item["type"] as? String,
                   let amount = item["amount"] as? Double {
                    let holding = WatchHolding(
                        id: id,
                        symbol: symbol,
                        name: name,
                        type: type,
                        amount: amount
                    )
                    holdings.append(holding)
                }
            }

            if !holdings.isEmpty {
                print("⌚️ [Watch] ✅ \(holdings.count) varlık parse edildi")
                self.holdings = holdings
                saveHoldingsLocally(holdings)
                Task {
                    await refreshPrices()
                }
            } else {
                print("⌚️ [Watch] ❌ Parse edilen varlık yok")
            }
        } else {
            print("⌚️ [Watch] ❌ JSON parse başarısız!")
            if let str = String(data: data, encoding: .utf8) {
                print("⌚️ [Watch] Raw data: \(str.prefix(200))")
            }
        }
    }

    /// Holdings'i yerel storage'a kaydet
    private func saveHoldingsLocally(_ holdings: [WatchHolding]) {
        if let data = try? JSONEncoder().encode(holdings) {
            UserDefaults.standard.set(data, forKey: "watchHoldingsLocal")
            print("⌚️ [Watch] ✅ Holdings yerel storage'a kaydedildi")
        }
    }

    /// Yerel storage'dan holdings yükle
    private func loadHoldingsFromLocalStorage() -> [WatchHolding]? {
        guard let data = UserDefaults.standard.data(forKey: "watchHoldingsLocal") else {
            return nil
        }
        return try? JSONDecoder().decode([WatchHolding].self, from: data)
    }

    // MARK: - Data Loading

    /// Yerel storage'dan holdings listesini yükle
    func loadHoldingsFromStorage() {
        print("⌚️ [Watch] Yerel storage'dan veri yükleniyor...")
        if let savedHoldings = loadHoldingsFromLocalStorage() {
            print("⌚️ [Watch] ✅ Yerel storage'dan \(savedHoldings.count) varlık yüklendi")
            self.holdings = savedHoldings
            // Fiyatları çek
            Task {
                await refreshPrices()
            }
        } else {
            print("⌚️ [Watch] ⚠️ Yerel storage'ta veri yok")
        }
    }

    /// Fiyatları API'den çek ve hesapla
    func refreshPrices() async {
        print("⌚️ [Watch] refreshPrices çağrıldı, mevcut holdings: \(holdings.count)")

        guard !holdings.isEmpty else {
            print("⌚️ [Watch] ❌ Holdings boş, refresh yapılamıyor")
            errorMessage = "Varlık yok"
            return
        }

        isLoading = true
        errorMessage = nil

        print("⌚️ [Watch] Fiyatlar API'den çekiliyor...")
        // Fiyatları çek
        let updatedHoldings = await priceService.fetchPrices(for: holdings)
        print("⌚️ [Watch] ✅ Fiyatlar çekildi")

        // UI'ı güncelle
        self.holdings = updatedHoldings
        self.calculateSummary()
        self.lastRefresh = Date()
        self.isLoading = false

        print("⌚️ [Watch] Toplam değer: \(summary.totalValue)")

        // Güncellenmiş verileri yerel storage'a kaydet
        saveHoldingsLocally(updatedHoldings)
    }

    /// Toplam değerleri hesapla
    private func calculateSummary() {
        var totalValue: Double = 0
        var totalPreviousValue: Double = 0

        for holding in holdings {
            totalValue += holding.value
            let previousValue = holding.price > 0 && holding.changePercent != 0
                ? holding.value / (1 + holding.changePercent / 100)
                : holding.value
            totalPreviousValue += previousValue
        }

        let totalChangeValue = totalValue - totalPreviousValue
        let totalChangePercent = totalPreviousValue > 0
            ? (totalChangeValue / totalPreviousValue) * 100
            : 0

        summary = PortfolioSummary(
            totalValue: totalValue,
            totalChangeValue: totalChangeValue,
            totalChangePercent: totalChangePercent,
            lastUpdate: Date()
        )
    }

    /// iPhone'dan holdings listesini iste
    func requestHoldingsFromPhone() {
        print("⌚️ [Watch] iPhone'dan holdings isteniyor...")

        guard let session = session else {
            print("⌚️ [Watch] ❌ Session nil!")
            return
        }

        print("⌚️ [Watch] Session durumu: isReachable=\(session.isReachable)")

        guard session.isReachable else {
            print("⌚️ [Watch] ❌ iPhone erişilebilir değil!")
            return
        }

        session.sendMessage(["request": "holdings"], replyHandler: { [weak self] response in
            print("⌚️ [Watch] iPhone'dan cevap geldi: \(response.keys)")
            Task { @MainActor in
                if let data = response["holdings"] as? Data {
                    print("⌚️ [Watch] Holdings data alındı, boyut: \(data.count) bytes")
                    self?.parseAndLoadHoldings(from: data)
                } else {
                    print("⌚️ [Watch] ❌ Response'ta holdings yok!")
                }
            }
        }, errorHandler: { error in
            print("⌚️ [Watch] ❌ Holdings istenemedi: \(error)")
        })
    }
}

// MARK: - WCSessionDelegate

extension PortfolioViewModel: WCSessionDelegate {
    nonisolated func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        print("⌚️ [Watch] Session aktivasyon tamamlandı: \(activationState.rawValue)")
        if let error = error {
            print("⌚️ [Watch] ❌ Aktivasyon hatası: \(error)")
        }

        if activationState == .activated {
            print("⌚️ [Watch] ✅ Session aktif")
            Task { @MainActor in
                // Önce cached application context'i kontrol et
                self.checkReceivedApplicationContext()

                // Sonra iPhone'dan güncel veri iste (erişilebilirse)
                self.requestHoldingsFromPhone()
            }
        }
    }

    // iPhone'dan gelen holdings güncellemelerini dinle
    nonisolated func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        print("⌚️ [Watch] iPhone'dan mesaj alındı (didReceiveMessage): \(message.keys)")

        if let data = message["holdings"] as? Data {
            print("⌚️ [Watch] Holdings data alındı, boyut: \(data.count) bytes")
            Task { @MainActor in
                self.parseAndLoadHoldings(from: data)
            }
        }
    }

    // App context güncellemelerini dinle
    nonisolated func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        print("⌚️ [Watch] iPhone'dan context alındı (didReceiveApplicationContext): \(applicationContext.keys)")

        if let data = applicationContext["holdings"] as? Data {
            print("⌚️ [Watch] Holdings data alındı, boyut: \(data.count) bytes")
            Task { @MainActor in
                self.parseAndLoadHoldings(from: data)
            }
        }
    }
}
