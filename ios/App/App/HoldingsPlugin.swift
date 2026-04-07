//
//  HoldingsPlugin.swift
//  App
//
//  Widget ve Watch'ın okuyabilmesi için holdings'i App Group UserDefaults'a kaydeder.
//

import Capacitor
import Foundation
import WidgetKit

@objc(HoldingsPlugin)
public class HoldingsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HoldingsPlugin"
    public let jsName = "Holdings"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "saveHoldings", returnType: CAPPluginReturnPromise)
    ]

    @objc func saveHoldings(_ call: CAPPluginCall) {
        guard let holdingsArray = call.getArray("holdings") else {
            call.reject("holdings parametresi eksik")
            return
        }

        do {
            let jsonData = try JSONSerialization.data(withJSONObject: holdingsArray)
            let defaults = UserDefaults(suiteName: "group.com.codeyzer.portfoy")
            defaults?.set(jsonData, forKey: "watchHoldings")
            defaults?.synchronize()
            WidgetCenter.shared.reloadAllTimelines()
            call.resolve(["success": true])
        } catch {
            call.reject("Holdings kaydedilemedi: \(error.localizedDescription)")
        }
    }
}
