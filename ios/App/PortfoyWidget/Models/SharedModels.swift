//
//  PortfolioData.swift
//  Codeyzer Portfoy Watch Watch App
//
//  Portföy verilerini temsil eden modeller
//

import Foundation

// MARK: - Holdings

struct WatchHolding: Codable, Identifiable {
    let id: String
    let symbol: String
    let name: String
    let type: String  // CURRENCY, FUND, STOCK, COMMODITY
    let amount: Double

    // Hesaplanan değerler (PriceService tarafından doldurulur)
    var price: Double = 0
    var value: Double = 0
    var change: Double = 0
    var changePercent: Double = 0

    init(id: String, symbol: String, name: String, type: String, amount: Double,
         price: Double = 0, value: Double = 0, change: Double = 0, changePercent: Double = 0) {
        self.id = id
        self.symbol = symbol
        self.name = name
        self.type = type
        self.amount = amount
        self.price = price
        self.value = value
        self.change = change
        self.changePercent = changePercent
    }

    // Eksik fiyat alanları için özel decoder (iPhone'dan gelen JSON'da bu alanlar olmayabilir)
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        symbol = try container.decode(String.self, forKey: .symbol)
        name = try container.decode(String.self, forKey: .name)
        type = try container.decode(String.self, forKey: .type)
        amount = try container.decode(Double.self, forKey: .amount)
        price = try container.decodeIfPresent(Double.self, forKey: .price) ?? 0
        value = try container.decodeIfPresent(Double.self, forKey: .value) ?? 0
        change = try container.decodeIfPresent(Double.self, forKey: .change) ?? 0
        changePercent = try container.decodeIfPresent(Double.self, forKey: .changePercent) ?? 0
    }
}

// MARK: - Portfolio Summary

struct PortfolioSummary {
    var totalValue: Double = 0
    var totalChangeValue: Double = 0
    var totalChangePercent: Double = 0
    var lastUpdate: Date?

    static let empty = PortfolioSummary()
}

// MARK: - Yahoo Finance API Models

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

// MARK: - UserDefaults Extension (App Group)

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
