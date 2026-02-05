//
//  PortfolioData.swift
//  Codeyzer Portfoy Watch Watch App
//
//  Portföy verilerini temsil eden modeller
//

import Foundation

// MARK: - Holdings (iOS'tan gelen varlık listesi)

struct WatchHolding: Codable, Identifiable {
    let id: String
    let symbol: String
    let name: String
    let type: String  // CURRENCY, FUND, STOCK, COMMODITY
    let amount: Double

    // Hesaplanan değerler (Watch'ta doldurulur)
    var price: Double = 0
    var value: Double = 0
    var change: Double = 0
    var changePercent: Double = 0
}

// MARK: - Portfolio Summary (Watch'ta hesaplanır)

struct PortfolioSummary {
    var totalValue: Double = 0
    var totalChangeValue: Double = 0
    var totalChangePercent: Double = 0
    var lastUpdate: Date?

    static let empty = PortfolioSummary()
}

// MARK: - Price Response Models

struct YahooChartResponse: Codable {
    let chart: YahooChart
}

struct YahooChart: Codable {
    let result: [YahooChartResult]?
    let error: YahooError?
}

struct YahooChartResult: Codable {
    let meta: YahooMeta
}

struct YahooMeta: Codable {
    let regularMarketPrice: Double?
    let previousClose: Double?
    let symbol: String?
}

struct YahooError: Codable {
    let code: String?
    let description: String?
}

// MARK: - UserDefaults Extension

extension UserDefaults {
    static let appGroup = UserDefaults(suiteName: "group.com.codeyzer.portfoy") ?? .standard

    var watchHoldings: [WatchHolding]? {
        get {
            guard let data = data(forKey: "watchHoldings") else { return nil }
            return try? JSONDecoder().decode([WatchHolding].self, from: data)
        }
        set {
            let data = try? JSONEncoder().encode(newValue)
            set(data, forKey: "watchHoldings")
        }
    }
}
