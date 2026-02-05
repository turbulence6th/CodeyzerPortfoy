//
//  PriceService.swift
//  Codeyzer Portfoy Watch Watch App
//
//  Fiyat verilerini API'den çeken servis
//

import Foundation

class PriceService {
    static let shared = PriceService()

    private let session: URLSession

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 15
        config.timeoutIntervalForResource = 30
        self.session = URLSession(configuration: config)
    }

    // MARK: - Fetch All Prices

    func fetchPrices(for holdings: [WatchHolding]) async -> [WatchHolding] {
        var updatedHoldings = holdings

        await withTaskGroup(of: (Int, Double, Double)?.self) { group in
            for (index, holding) in holdings.enumerated() {
                group.addTask {
                    if let (price, previousClose) = await self.fetchPrice(symbol: holding.symbol, type: holding.type) {
                        return (index, price, previousClose)
                    }
                    return nil
                }
            }

            for await result in group {
                if let (index, price, previousClose) = result {
                    updatedHoldings[index].price = price
                    updatedHoldings[index].value = price * updatedHoldings[index].amount
                    updatedHoldings[index].change = price - previousClose
                    updatedHoldings[index].changePercent = previousClose > 0
                        ? ((price - previousClose) / previousClose) * 100
                        : 0
                }
            }
        }

        return updatedHoldings
    }

    // MARK: - Fetch Single Price

    private func fetchPrice(symbol: String, type: String) async -> (price: Double, previousClose: Double)? {
        // TEFAS fonları için özel işlem
        if type == "FUND" {
            return await fetchTefasPrice(symbol: symbol)
        }

        // Yahoo Finance API
        return await fetchYahooPrice(symbol: symbol)
    }

    // MARK: - Yahoo Finance API

    private func fetchYahooPrice(symbol: String) async -> (price: Double, previousClose: Double)? {
        // Sembol dönüşümü (USDTRY -> USDTRY=X)
        let yahooSymbol = convertToYahooSymbol(symbol)

        guard let url = URL(string: "https://query1.finance.yahoo.com/v8/finance/chart/\(yahooSymbol)?interval=1d&range=1d") else {
            return nil
        }

        do {
            let (data, response) = try await session.data(from: url)

            guard let httpResponse = response as? HTTPURLResponse,
                  httpResponse.statusCode == 200 else {
                return nil
            }

            let decoded = try JSONDecoder().decode(YahooChartResponse.self, from: data)

            if let result = decoded.chart.result?.first {
                let price = result.meta.regularMarketPrice ?? 0
                let previousClose = result.meta.previousClose ?? price
                return (price, previousClose)
            }
        } catch {
            print("Yahoo API Error for \(symbol): \(error)")
        }

        return nil
    }

    // MARK: - TEFAS API

    private func fetchTefasPrice(symbol: String) async -> (price: Double, previousClose: Double)? {
        // TEFAS için basit bir approach - gerçek TEFAS API'si daha karmaşık
        // Şimdilik placeholder, iOS'tan gelen son değeri kullanacağız
        // veya TEFAS web scraping yapılabilir

        guard let url = URL(string: "https://www.tefas.gov.tr/api/DB/BindHistoryInfo") else {
            return nil
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")

        let today = formatDate(Date())
        let body = "fontip=YAT&fonkod=\(symbol)&baession=\(today)&bession=\(today)"
        request.httpBody = body.data(using: .utf8)

        do {
            let (data, response) = try await session.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse,
                  httpResponse.statusCode == 200 else {
                return nil
            }

            // TEFAS response parsing
            if let json = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]],
               let first = json.first,
               let price = first["BirimPayDegworki"] as? Double {
                // TEFAS genellikle önceki gün kapanışı vermez, aynı değeri kullanıyoruz
                return (price, price)
            }
        } catch {
            print("TEFAS API Error for \(symbol): \(error)")
        }

        return nil
    }

    // MARK: - Helpers

    private func convertToYahooSymbol(_ symbol: String) -> String {
        // Döviz çiftleri için =X ekle
        let currencyPairs = ["USDTRY", "EURTRY", "GBPTRY", "JPYTRY", "CHFTRY", "AUDTRY", "CADTRY", "SEKTRY", "NOKTRY", "DKKTRY", "RUBTRY", "CNYTRY", "AEDTRY", "SARTRY", "KWDTRY"]

        if currencyPairs.contains(symbol) {
            return "\(symbol)=X"
        }

        // Altın sembolleri
        if symbol == "XAUTRY" || symbol == "GAUTRY" {
            return "GC=F"  // Gold Futures - sonra TRY'ye çevrilmeli
        }

        if symbol == "XAGTRY" {
            return "SI=F"  // Silver Futures
        }

        // BIST hisseleri için .IS ekle
        if !symbol.contains(".") && !symbol.contains("=") {
            return "\(symbol).IS"
        }

        return symbol
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "dd.MM.yyyy"
        return formatter.string(from: date)
    }
}
