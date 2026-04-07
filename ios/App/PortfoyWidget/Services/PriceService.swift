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
        config.timeoutIntervalForRequest = 8
        config.timeoutIntervalForResource = 15
        config.httpAdditionalHeaders = [
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148"
        ]
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
        if type == "FUND" {
            return await fetchTefasPrice(symbol: symbol)
        }
        if symbol == "GAUTRY" || symbol == "GAU" {
            return await fetchGramMetalPrice(metal: "XAU")
        }
return await fetchYahooPrice(symbol: symbol)
    }

    // MARK: - Yahoo Finance

    private func fetchYahooPrice(symbol: String) async -> (price: Double, previousClose: Double)? {
        let yahooSymbol = convertToYahooSymbol(symbol)
        let hosts = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"]

        for host in hosts {
            guard let url = URL(string: "https://\(host)/v8/finance/chart/\(yahooSymbol)?interval=1d&range=1d") else { continue }
            do {
                let (data, response) = try await session.data(from: url)
                guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else { continue }
                let decoded = try JSONDecoder().decode(YahooChartResponse.self, from: data)
                if let result = decoded.chart.result?.first,
                   let price = result.meta.regularMarketPrice, price > 0 {
                    let previousClose = result.meta.previousClose ?? price
                    return (price, previousClose)
                }
            } catch {
                print("Yahoo API Error (\(host)) for \(symbol): \(error)")
            }
        }

        return nil
    }

    // MARK: - Swissquote (spot metal fiyatı: XAU veya XAG)

    private func fetchSwissquoteSpot(metal: String) async -> Double? {
        guard let url = URL(string: "https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/\(metal)/USD") else {
            return nil
        }

        do {
            let (data, response) = try await session.data(from: url)
            guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
                return nil
            }

            if let platforms = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
                let platform = platforms.first(where: {
                    ($0["topo"] as? [String: Any])?["platform"] as? String == "SwissquoteLtd"
                }) ?? platforms.first

                if let prices = platform?["spreadProfilePrices"] as? [[String: Any]] {
                    let profile = prices.first(where: { $0["spreadProfile"] as? String == "prime" })
                        ?? prices.first(where: { $0["spreadProfile"] as? String == "elite" })
                        ?? prices.first

                    if let bid = profile?["bid"] as? Double, let ask = profile?["ask"] as? Double {
                        return (bid + ask) / 2.0
                    }
                }
            }
        } catch {
            print("Swissquote Error: \(error)")
        }

        return nil
    }

    // MARK: - Gram Altın (GAUTRY)
    // Hesap: (XAU/USD spot * USD/TRY) / 31.1035

    private func fetchGramMetalPrice(metal: String) async -> (price: Double, previousClose: Double)? {
        let OUNCE_TO_GRAM = 31.1035

        async let spotTask = fetchSwissquoteSpot(metal: metal)
        async let usdTryTask = fetchYahooPrice(symbol: "USDTRY")

        let (currentOunceUSD, usdTryResult) = await (spotTask, usdTryTask)

        guard let ounceUSD = currentOunceUSD, ounceUSD > 0,
              let usdTry = usdTryResult, usdTry.price > 0 else {
            return nil
        }

        let gramPriceTRY = (ounceUSD * usdTry.price) / OUNCE_TO_GRAM
        let previousGramPriceTRY = (ounceUSD * usdTry.previousClose) / OUNCE_TO_GRAM

        return (gramPriceTRY, previousGramPriceTRY)
    }

    // MARK: - TEFAS (Türkiye yatırım fonları)

    private func fetchTefasPrice(symbol: String) async -> (price: Double, previousClose: Double)? {
        guard let url = URL(string: "https://www.tefas.gov.tr/api/DB/BindHistoryInfo") else {
            return nil
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded; charset=UTF-8", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json, text/javascript, */*; q=0.01", forHTTPHeaderField: "Accept")
        request.setValue("XMLHttpRequest", forHTTPHeaderField: "X-Requested-With")

        let today = formatDate(Date())
        let weekAgo = formatDate(Calendar.current.date(byAdding: .day, value: -7, to: Date()) ?? Date())
        let body = "fontip=YAT&fonkod=\(symbol)&bastarih=\(weekAgo)&bittarih=\(today)"
        request.httpBody = body.data(using: .utf8)

        do {
            let (data, response) = try await session.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
                return nil
            }

            if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let items = json["data"] as? [[String: Any]] {

                // TARIH milisaniye timestamp olarak gelir, en yeniden eskiye sırala
                let sorted = items.sorted {
                    let t0 = ($0["TARIH"] as? Double) ?? (Double($0["TARIH"] as? String ?? "0") ?? 0)
                    let t1 = ($1["TARIH"] as? Double) ?? (Double($1["TARIH"] as? String ?? "0") ?? 0)
                    return t0 > t1
                }

                guard let latest = sorted.first,
                      let price = latest["FIYAT"] as? Double, price > 0 else {
                    return nil
                }

                let previousClose: Double
                if sorted.count > 1, let prev = sorted[1]["FIYAT"] as? Double, prev > 0 {
                    previousClose = prev
                } else {
                    previousClose = price
                }

                return (price, previousClose)
            }
        } catch {
            print("TEFAS Error for \(symbol): \(error)")
        }

        return nil
    }

    // MARK: - Helpers

    private func convertToYahooSymbol(_ symbol: String) -> String {
        let currencyPairs = [
            "USDTRY", "EURTRY", "GBPTRY", "JPYTRY", "CHFTRY",
            "AUDTRY", "CADTRY", "SEKTRY", "NOKTRY", "DKKTRY",
            "RUBTRY", "CNYTRY", "AEDTRY", "SARTRY", "KWDTRY"
        ]

        if currencyPairs.contains(symbol) {
            return "\(symbol)=X"
        }

        // BIST hisseleri için .IS ekle
        if !symbol.contains(".") && !symbol.contains("=") && !symbol.hasSuffix("TRY") {
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
