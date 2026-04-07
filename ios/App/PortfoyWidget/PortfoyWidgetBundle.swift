import WidgetKit
import SwiftUI

// MARK: - Timeline Entry

struct MoversEntry: TimelineEntry {
    let date: Date
    let gainers: [WatchHolding]
    let losers: [WatchHolding]

    static let placeholder = MoversEntry(date: Date(), gainers: [], losers: [])
}

// MARK: - Provider

struct MoversProvider: TimelineProvider {

    func placeholder(in context: Context) -> MoversEntry {
        .placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping (MoversEntry) -> Void) {
        completion(fetchEntry(family: context.family))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<MoversEntry>) -> Void) {
        let entry = fetchEntry(family: context.family)
        let next = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date()
        completion(Timeline(entries: [entry], policy: .after(next)))
    }

    private func fetchEntry(family: WidgetFamily) -> MoversEntry {
        let stored = UserDefaults.appGroup.watchHoldings ?? []
        guard !stored.isEmpty else { return .placeholder }

        let count = family == .systemLarge ? 9 : 3

        // Aynı sembol birden fazla kez eklenmiş olabilir — tekrarları kaldır
        var seen = Set<String>()
        let unique = stored.filter { seen.insert($0.symbol).inserted }

        let sorted = unique.sorted { $0.changePercent > $1.changePercent }
        let gainers = Array(sorted.filter { $0.changePercent > 0 }.prefix(count))
        let losers  = Array(sorted.filter { $0.changePercent < 0 }.suffix(count).reversed())

        return MoversEntry(date: Date(), gainers: gainers, losers: losers)
    }
}

// MARK: - Widget

struct PortfoyMoversWidget: Widget {
    let kind = "PortfoyMoversWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: MoversProvider()) { entry in
            PortfoyMoversView(entry: entry)
                .containerBackground(.background, for: .widget)
        }
        .configurationDisplayName("Portföy Hareketleri")
        .description("En çok yükselen ve düşen varlıkları gösterir.")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}

// MARK: - Bundle

@main
struct PortfoyWidgetBundle: WidgetBundle {
    var body: some Widget {
        PortfoyMoversWidget()
    }
}
