//
//  ContentView.swift
//  Codeyzer Portfoy Watch Watch App
//
//  Ana portföy özeti ekranı - Bağımsız fiyat çekme özelliği ile
//

import SwiftUI

struct ContentView: View {
    @StateObject private var viewModel = PortfolioViewModel()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 12) {
                    if viewModel.holdings.isEmpty {
                        EmptyStateView()
                    } else {
                        // Toplam Değer Kartı
                        TotalValueCard(summary: viewModel.summary)

                        // Varlıklar Listesi
                        HoldingsSection(holdings: viewModel.holdings)

                        // Son Güncelleme
                        if let lastRefresh = viewModel.lastRefresh {
                            Text("Son: \(formatTime(lastRefresh))")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                .padding(.horizontal, 4)
            }
            .navigationTitle("Portföy")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        Task {
                            await viewModel.refreshPrices()
                        }
                    } label: {
                        if viewModel.isLoading {
                            ProgressView()
                                .progressViewStyle(.circular)
                        } else {
                            Image(systemName: "arrow.clockwise")
                        }
                    }
                    .disabled(viewModel.isLoading)
                }
            }
        }
    }

    private func formatTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        return formatter.string(from: date)
    }
}

// MARK: - Boş Durum

struct EmptyStateView: View {
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: "chart.pie")
                .font(.largeTitle)
                .foregroundColor(.secondary)

            Text("Varlık Yok")
                .font(.headline)

            Text("iPhone'dan varlık ekleyin")
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
    }
}

// MARK: - Toplam Değer Kartı

struct TotalValueCard: View {
    let summary: PortfolioSummary

    var body: some View {
        VStack(spacing: 4) {
            Text("Toplam Değer")
                .font(.caption2)
                .foregroundColor(.secondary)

            Text(formatCurrency(summary.totalValue))
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(.white)
                .minimumScaleFactor(0.5)
                .lineLimit(1)

            HStack(spacing: 4) {
                Image(systemName: summary.totalChangeValue >= 0 ? "arrow.up.right" : "arrow.down.right")
                    .font(.caption2)

                Text(formatChange(summary.totalChangeValue, summary.totalChangePercent))
                    .font(.caption)
                    .fontWeight(.medium)
            }
            .foregroundColor(summary.totalChangeValue >= 0 ? .green : .red)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.white.opacity(0.1))
        )
    }

    private func formatCurrency(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "TRY"
        formatter.currencySymbol = "₺"
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: value)) ?? "₺0"
    }

    private func formatChange(_ value: Double, _ percent: Double) -> String {
        let sign = value >= 0 ? "+" : ""
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.maximumFractionDigits = 0
        let valueStr = formatter.string(from: NSNumber(value: abs(value))) ?? "0"
        return "\(sign)\(value >= 0 ? "" : "-")₺\(valueStr) (\(String(format: "%.1f", percent))%)"
    }
}

// MARK: - Varlıklar Bölümü

struct HoldingsSection: View {
    let holdings: [WatchHolding]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Varlıklar")
                .font(.caption)
                .foregroundColor(.secondary)
                .padding(.leading, 4)

            ForEach(sortedHoldings.prefix(5)) { holding in
                HoldingRow(holding: holding)
            }

            if holdings.count > 5 {
                Text("+\(holdings.count - 5) daha")
                    .font(.caption2)
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
            }
        }
    }

    private var sortedHoldings: [WatchHolding] {
        holdings.sorted { $0.value > $1.value }
    }
}

// MARK: - Varlık Satırı

struct HoldingRow: View {
    let holding: WatchHolding

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(holding.name)
                    .font(.caption)
                    .fontWeight(.medium)
                    .lineLimit(1)

                Text(holding.symbol)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 2) {
                Text(formatValue(holding.value))
                    .font(.caption)
                    .fontWeight(.medium)

                Text(formatPercent(holding.changePercent))
                    .font(.caption2)
                    .foregroundColor(holding.changePercent >= 0 ? .green : .red)
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 6)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.white.opacity(0.05))
        )
    }

    private func formatValue(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "TRY"
        formatter.currencySymbol = "₺"
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: value)) ?? "₺0"
    }

    private func formatPercent(_ percent: Double) -> String {
        let sign = percent >= 0 ? "+" : ""
        return "\(sign)\(String(format: "%.1f", percent))%"
    }
}

#Preview {
    ContentView()
}
