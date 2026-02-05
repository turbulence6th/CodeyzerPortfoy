//
//  WatchPlugin.swift
//  App
//
//  Capacitor plugin - React'tan Watch'a holdings listesi gönderme
//

import Foundation
import Capacitor

@objc(WatchPlugin)
public class WatchPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WatchPlugin"
    public let jsName = "Watch"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "sendHoldings", returnType: CAPPluginReturnPromise)
    ]

    @objc func sendHoldings(_ call: CAPPluginCall) {
        print("📱 [WatchPlugin] sendHoldings çağrıldı!")

        // Holdings array'i al
        var holdings: [[String: Any]] = []

        if let holdingsArray = call.getArray("holdings") as? [JSObject] {
            print("📱 [WatchPlugin] Holdings array alındı, sayı: \(holdingsArray.count)")
            for holding in holdingsArray {
                var item: [String: Any] = [:]
                item["id"] = holding["id"] as? String ?? ""
                item["symbol"] = holding["symbol"] as? String ?? ""
                item["name"] = holding["name"] as? String ?? ""
                item["type"] = holding["type"] as? String ?? ""
                item["amount"] = holding["amount"] as? Double ?? 0

                holdings.append(item)
            }
            print("📱 [WatchPlugin] ✅ \(holdings.count) varlık parse edildi")
        } else {
            print("📱 [WatchPlugin] ❌ Holdings array alınamadı!")
        }

        // Watch'a gönder
        print("📱 [WatchPlugin] WatchSessionManager.sendHoldings çağrılıyor...")
        WatchSessionManager.shared.sendHoldings(holdings)

        call.resolve(["success": true])
    }
}
