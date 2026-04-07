import XCTest

/// Gerçek API çağrıları yapan entegrasyon testleri.
/// Çalıştırmak için: Xcode'da PortfoyWidgetTests scheme'ini seç → Cmd+U
final class PriceServiceTests: XCTestCase {

    private let service = PriceService.shared

    override func setUp() {
        super.setUp()
        continueAfterFailure = false
    }

    // MARK: - Yahoo Finance

    func testUSDTRY() async throws {
        let holding = makeHolding(symbol: "USDTRY", type: "CURRENCY")
        let result = await service.fetchPrices(for: [holding])
        let price = result[0].price

        XCTAssertGreaterThan(price, 0, "USDTRY fiyatı 0'dan büyük olmalı")
        XCTAssertGreaterThan(price, 10, "USDTRY 10 TL'den büyük olmalı")
        print("✅ USDTRY: \(price) TL | Değişim: \(result[0].changePercent.f2)%")
    }

    func testEURTRY() async throws {
        let holding = makeHolding(symbol: "EURTRY", type: "CURRENCY")
        let result = await service.fetchPrices(for: [holding])
        let price = result[0].price

        XCTAssertGreaterThan(price, 0, "EURTRY fiyatı 0'dan büyük olmalı")
        print("✅ EURTRY: \(price) TL | Değişim: \(result[0].changePercent.f2)%")
    }

    func testBISTStock() async throws {
        let holding = makeHolding(symbol: "THYAO", type: "STOCK")
        let result = await service.fetchPrices(for: [holding])
        let price = result[0].price

        XCTAssertGreaterThan(price, 0, "THYAO fiyatı 0'dan büyük olmalı")
        print("✅ THYAO: \(price) TL | Değişim: \(result[0].changePercent.f2)%")
    }

// MARK: - TEFAS

    func testTEFASFund() async throws {
        // YAS: yaygın kullanılan bir fon
        let holding = makeHolding(symbol: "YAS", type: "FUND")
        let result = await service.fetchPrices(for: [holding])
        let price = result[0].price

        XCTAssertGreaterThan(price, 0, "YAS fon fiyatı 0'dan büyük olmalı")
        print("✅ YAS (TEFAS): \(price) TL | Değişim: \(result[0].changePercent.f2)%")
    }

    // MARK: - Swissquote + Gram Altın

    func testGAUTRY() async throws {
        let holding = makeHolding(symbol: "GAUTRY", type: "COMMODITY")
        let result = await service.fetchPrices(for: [holding])
        let price = result[0].price

        XCTAssertGreaterThan(price, 0, "Gram altın fiyatı 0'dan büyük olmalı")
        XCTAssertGreaterThan(price, 100, "Gram altın 100 TL'den büyük olmalı")
        print("✅ GAUTRY (gram altın): \(price) TL | Değişim: \(result[0].changePercent.f2)%")
    }

    // MARK: - Çoklu Fiyat Çekme

    func testMultipleHoldings() async throws {
        let holdings = [
            makeHolding(symbol: "USDTRY",  type: "CURRENCY"),
            makeHolding(symbol: "THYAO",   type: "STOCK"),
            makeHolding(symbol: "YAS",     type: "FUND"),
            makeHolding(symbol: "GAUTRY",  type: "COMMODITY"),
        ]

        let results = await service.fetchPrices(for: holdings)

        XCTAssertEqual(results.count, 4)
        for r in results {
            XCTAssertGreaterThan(r.price, 0, "\(r.symbol) fiyatı 0'dan büyük olmalı")
            print("  \(r.symbol): \(r.price) | \(r.changePercent.f2)%")
        }
    }

    // MARK: - Hatalı Sembol

    func testInvalidSymbol() async throws {
        let holding = makeHolding(symbol: "XYZXYZXYZ", type: "STOCK")
        let result = await service.fetchPrices(for: [holding])

        // Hatalı sembol için fiyat 0 dönmeli, crash olmamalı
        XCTAssertEqual(result[0].price, 0, "Geçersiz sembol için fiyat 0 olmalı")
        print("✅ Hatalı sembol gracefully handled")
    }

    // MARK: - Helper

    private func makeHolding(symbol: String, type: String) -> WatchHolding {
        WatchHolding(id: UUID().uuidString, symbol: symbol, name: symbol, type: type, amount: 1.0)
    }
}

// MARK: - Formatting helper

private extension Double {
    var f2: String { String(format: "%.2f", self) }
}

