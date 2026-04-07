import SwiftUI
import WidgetKit

// MARK: - Main View

struct PortfoyMoversView: View {
    let entry: MoversEntry
    @Environment(\.widgetFamily) var family

    var hasMovers: Bool { !entry.gainers.isEmpty || !entry.losers.isEmpty }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            header.padding(.bottom, 8)
            if hasMovers {
                HStack(alignment: .top, spacing: 0) {
                    columnView(title: "Yükselenler", systemImage: "arrow.up",
                               color: .green, holdings: entry.gainers)
                    Divider().padding(.horizontal, 8)
                    columnView(title: "Düşenler", systemImage: "arrow.down",
                               color: .red, holdings: entry.losers)
                }
                .frame(maxHeight: .infinity)
            } else {
                emptyState
            }
        }
        .padding(0)
    }

    // MARK: Header

    private var header: some View {
        HStack(spacing: 5) {
            Image(systemName: "chart.line.uptrend.xyaxis")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(.secondary)
            Text("Günlük Hareketler")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(.secondary)
            Spacer()
            Text(entry.date, style: .time)
                .font(.system(size: 11))
                .foregroundStyle(.tertiary)
        }
    }

    // MARK: Kolon

    private func columnView(
        title: String, systemImage: String,
        color: Color, holdings: [WatchHolding]
    ) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 3) {
                Image(systemName: systemImage)
                    .font(.system(size: 10, weight: .bold))
                Text(title)
                    .font(.system(size: 11, weight: .semibold))
            }
            .foregroundStyle(color)
            .padding(.bottom, 5)

            if holdings.isEmpty {
                Text("—").font(.system(size: 12)).foregroundStyle(.tertiary)
            } else {
                VStack(alignment: .leading, spacing: 5) {
                    ForEach(holdings) { HoldingRow(holding: $0) }
                }
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: Empty

    private var emptyState: some View {
        VStack(spacing: 3) {
            Spacer()
            Image(systemName: "chart.bar.xaxis")
                .font(.system(size: 20))
                .foregroundStyle(.tertiary)
            Text("Fiyat bekleniyor")
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(.secondary)
            Text("Uygulamayı açın")
                .font(.system(size: 10))
                .foregroundStyle(.tertiary)
            Spacer()
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Holding Row

struct HoldingRow: View {
    let holding: WatchHolding

    private var isPositive: Bool { holding.changePercent >= 0 }
    private var color: Color { isPositive ? .green : .red }
    private var changeText: String {
        "\(isPositive ? "+" : "")\(String(format: "%.2f", holding.changePercent))%"
    }

    var body: some View {
        HStack(alignment: .center, spacing: 4) {
            VStack(alignment: .leading, spacing: 1) {
                Text(holding.symbol)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(.primary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
                if holding.name != holding.symbol {
                    Text(holding.name)
                        .font(.system(size: 9))
                        .foregroundStyle(.tertiary)
                        .lineLimit(1)
                }
            }
            Spacer(minLength: 2)
            Text(changeText)
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(color)
                .padding(.horizontal, 5)
                .padding(.vertical, 2)
                .background(color.opacity(0.12))
                .clipShape(Capsule())
                .lineLimit(1)
        }
    }
}

// MARK: - Preview

#Preview(as: .systemMedium) {
    PortfoyMoversWidget()
} timeline: {
    MoversEntry(
        date: .now,
        gainers: [
            WatchHolding(id: "1", symbol: "THYAO",  name: "THY",       type: "STOCK",     amount: 10, changePercent: 3.45),
            WatchHolding(id: "2", symbol: "GAUTRY", name: "Gram Altın", type: "COMMODITY", amount: 1,  changePercent: 1.20),
            WatchHolding(id: "3", symbol: "EURTRY", name: "Euro/TL",    type: "CURRENCY",  amount: 50, changePercent: 0.55),
        ],
        losers: [
            WatchHolding(id: "4", symbol: "USDTRY", name: "Dolar/TL", type: "CURRENCY", amount: 100, changePercent: -0.32),
            WatchHolding(id: "5", symbol: "YAS",    name: "YAS Fon",  type: "FUND",     amount: 500, changePercent: -0.18),
        ]
    )
}

#Preview(as: .systemLarge) {
    PortfoyMoversWidget()
} timeline: {
    MoversEntry(
        date: .now,
        gainers: [
            WatchHolding(id: "1", symbol: "THYAO",  name: "THY",       type: "STOCK",     amount: 10, changePercent: 3.45),
            WatchHolding(id: "2", symbol: "GAUTRY", name: "Gram Altın", type: "COMMODITY", amount: 1,  changePercent: 1.20),
            WatchHolding(id: "3", symbol: "EURTRY", name: "Euro/TL",    type: "CURRENCY",  amount: 50, changePercent: 0.55),
            WatchHolding(id: "6", symbol: "AKBNK",  name: "Akbank",     type: "STOCK",     amount: 20, changePercent: 0.32),
            WatchHolding(id: "7", symbol: "ISCTR",  name: "İş Bankası", type: "STOCK",     amount: 30, changePercent: 0.28),
            WatchHolding(id: "8", symbol: "GARAN",  name: "Garanti",    type: "STOCK",     amount: 15, changePercent: 0.21),
        ],
        losers: [
            WatchHolding(id: "9",  symbol: "USDTRY", name: "Dolar/TL",  type: "CURRENCY", amount: 100, changePercent: -0.32),
            WatchHolding(id: "10", symbol: "YAS",    name: "YAS Fon",   type: "FUND",     amount: 500, changePercent: -0.18),
            WatchHolding(id: "11", symbol: "SASA",   name: "Sasa Poly", type: "STOCK",    amount: 25,  changePercent: -0.15),
            WatchHolding(id: "12", symbol: "ASELS",  name: "Aselsan",   type: "STOCK",    amount: 10,  changePercent: -0.12),
            WatchHolding(id: "13", symbol: "BIMAS",  name: "BİM",       type: "STOCK",    amount: 8,   changePercent: -0.08),
            WatchHolding(id: "14", symbol: "KCHOL",  name: "Koç Holding",type: "STOCK",   amount: 5,   changePercent: -0.05),
        ]
    )
}
