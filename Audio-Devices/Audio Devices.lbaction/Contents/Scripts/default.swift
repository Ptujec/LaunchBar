#!/usr/bin/env swift

/*
Audio Devices Action for LaunchBar
by Christian Bender (@ptujec)
2025-01-14

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation & Sources:
- https://developer.apple.com/documentation/coreaudio
- https://github.com/karaggeorge/macos-audio-devices/
- https://github.com/TobiasMende/alfred-audio-switcher
- https://openairplay.github.io/airplay-spec/service_discovery.html

TODO: 
- AirPlay support
- Localization
- Cleanup

*/

// MARK: - Imports

import CoreAudio
import Foundation

struct Environment {
    static let info = ProcessInfo.processInfo.environment
    static let isCommandKeyPressed = info["LB_OPTION_COMMAND_KEY"] == "1"
    static let isControlKeyPressed = info["LB_OPTION_CONTROL_KEY"] == "1"
    static let isAlternateKeyPressed = info["LB_OPTION_ALTERNATE_KEY"] == "1"
    static let actionPath = info["LB_ACTION_PATH"] ?? ""
    static let supportPath = info["LB_SUPPORT_PATH"] ?? ""
    static let historyPlistPath = "\(supportPath)/device_history.plist"
    static let preferencesPlistPath = "\(supportPath)/preferences.plist"
}

struct Preferences: Codable {
    var excludedDevices: Set<String>
    var noSoundEffectsSyncDevices: Set<String>

    init() {
        excludedDevices = []
        noSoundEffectsSyncDevices = []
    }

    mutating func toggleExcludedDevice(_ deviceUID: String) {
        if excludedDevices.contains(deviceUID) {
            excludedDevices.remove(deviceUID)
        } else {
            excludedDevices.insert(deviceUID)
        }
    }

    mutating func toggleNoSoundEffectsSync(_ deviceUID: String) {
        if noSoundEffectsSyncDevices.contains(deviceUID) {
            noSoundEffectsSyncDevices.remove(deviceUID)
        } else {
            noSoundEffectsSyncDevices.insert(deviceUID)
        }
    }
}

struct CoreAudioUtils {
    static func createPropertyAddress(selector: AudioObjectPropertySelector)
        -> AudioObjectPropertyAddress
    {
        return AudioObjectPropertyAddress(
            mSelector: selector,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )
    }

    static func getDeviceTitle(deviceID: UInt32) -> String? {
        var titleSize = UInt32(MemoryLayout<CFString>.size)
        var deviceTitle: CFString = "" as CFString
        var address = createPropertyAddress(selector: kAudioDevicePropertyDeviceNameCFString)

        let status = withUnsafeMutablePointer(to: &deviceTitle) { ptr in
            AudioObjectGetPropertyData(deviceID, &address, 0, nil, &titleSize, ptr)
        }

        return status == noErr ? (deviceTitle as String) : nil
    }

    static func getDeviceList(type: String) -> [(title: String, id: UInt32, isActive: Bool)] {
        var propertySize: UInt32 = 0
        var address = createPropertyAddress(selector: kAudioHardwarePropertyDevices)

        var status = AudioObjectGetPropertyDataSize(
            AudioObjectID(kAudioObjectSystemObject),
            &address, 0, nil, &propertySize)
        guard status == noErr else { return [] }

        let deviceCount = Int(propertySize) / MemoryLayout<UInt32>.size
        var deviceIDs = [UInt32](repeating: 0, count: deviceCount)

        status = AudioObjectGetPropertyData(
            AudioObjectID(kAudioObjectSystemObject),
            &address, 0, nil, &propertySize, &deviceIDs)
        guard status == noErr else { return [] }

        var deviceList: [(title: String, id: UInt32, isActive: Bool)] = []
        for id in deviceIDs {
            let scope: AudioObjectPropertyScope =
                (type == "input") ? kAudioDevicePropertyScopeInput : kAudioDevicePropertyScopeOutput
            var streamAddress = AudioObjectPropertyAddress(
                mSelector: kAudioDevicePropertyStreams,
                mScope: scope,
                mElement: kAudioObjectPropertyElementMain)
            var streamSize: UInt32 = 0

            status = AudioObjectGetPropertyDataSize(id, &streamAddress, 0, nil, &streamSize)
            if status != noErr || streamSize == 0 { continue }

            guard let deviceTitle = getDeviceTitle(deviceID: id) else { continue }

            // Check if device is active
            var isActive = false
            if type == "input" {
                var propertyAddress = createPropertyAddress(
                    selector: kAudioHardwarePropertyDefaultInputDevice)
                var defaultDevice: UInt32 = 0
                var propertySize = UInt32(MemoryLayout<UInt32>.size)
                let status = AudioObjectGetPropertyData(
                    AudioObjectID(kAudioObjectSystemObject),
                    &propertyAddress, 0, nil, &propertySize, &defaultDevice)
                if status == noErr {
                    isActive = defaultDevice == id
                }
            } else {
                var propertyAddress = createPropertyAddress(
                    selector: kAudioHardwarePropertyDefaultOutputDevice)
                var defaultDevice: UInt32 = 0
                var propertySize = UInt32(MemoryLayout<UInt32>.size)
                let status = AudioObjectGetPropertyData(
                    AudioObjectID(kAudioObjectSystemObject),
                    &propertyAddress, 0, nil, &propertySize, &defaultDevice)
                if status == noErr {
                    isActive = defaultDevice == id
                }
            }

            deviceList.append((title: deviceTitle, id: id, isActive: isActive))
        }

        return deviceList
    }

    static func activateDevice(type: String, deviceID: UInt32) -> Bool {
        // Set up the property address for the default device
        var address = AudioObjectPropertyAddress(
            mSelector: type == "input"
                ? kAudioHardwarePropertyDefaultInputDevice
                : kAudioHardwarePropertyDefaultOutputDevice,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain  // Changed to Master
        )

        // Check if the property is settable
        var isSettable: DarwinBoolean = false
        var status = AudioObjectIsPropertySettable(
            AudioObjectID(kAudioObjectSystemObject),
            &address,
            &isSettable
        )

        guard status == noErr, isSettable == true else {
            NSLog("Property is not settable, status: \(status), isSettable: \(isSettable)")
            return false
        }

        // Set the default device
        var mutableDeviceID = deviceID  // Make a mutable copy
        status = AudioObjectSetPropertyData(
            AudioObjectID(kAudioObjectSystemObject),
            &address,
            0,
            nil,
            UInt32(MemoryLayout<AudioDeviceID>.size),
            &mutableDeviceID
        )

        if status != noErr {
            NSLog("Failed to set device with status: \(status)")
            return false
        }

        return true
    }

    static func setSoundEffectsOutput(deviceID: UInt32) -> Bool {
        var propertyAddress = AudioObjectPropertyAddress(
            mSelector: kAudioHardwarePropertyDefaultSystemOutputDevice,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )

        var deviceIDCopy = deviceID
        let status = AudioObjectSetPropertyData(
            AudioObjectID(kAudioObjectSystemObject),
            &propertyAddress,
            0,
            nil,
            UInt32(MemoryLayout<AudioDeviceID>.size),
            &deviceIDCopy
        )

        return status == noErr
    }

    static func getDeviceUID(deviceID: UInt32) -> String? {
        var propertySize = UInt32(MemoryLayout<CFString>.size)
        var deviceUID = "" as CFString
        var address = createPropertyAddress(selector: kAudioDevicePropertyDeviceUID)

        let status = withUnsafeMutablePointer(to: &deviceUID) { ptr in
            AudioObjectGetPropertyData(deviceID, &address, 0, nil, &propertySize, ptr)
        }

        return status == noErr ? (deviceUID as String) : nil
    }
}

struct DeviceHistory: Codable {
    struct DeviceUsage: Codable {
        let deviceUID: String
        let lastUsedDate: Date

        init(deviceUID: String, lastUsedDate: Date) {
            self.deviceUID = deviceUID
            self.lastUsedDate = lastUsedDate
        }
    }

    var inputHistory: [DeviceUsage]
    var outputHistory: [DeviceUsage]

    init() {
        inputHistory = []
        outputHistory = []
    }

    func lastUsedDevice(type: String, excluding currentUID: String?) -> String? {
        let history = type == "input" ? inputHistory : outputHistory
        let devices = CoreAudioUtils.getDeviceList(type: type)
        let connectedUIDs = devices.compactMap { CoreAudioUtils.getDeviceUID(deviceID: $0.id) }

        return
            history
            .filter { currentUID == nil || $0.deviceUID != currentUID }
            .filter { connectedUIDs.contains($0.deviceUID) }
            .sorted { $0.lastUsedDate > $1.lastUsedDate }
            .first?.deviceUID
    }

    mutating func addUsage(deviceUID: String, type: String) {
        let usage = DeviceUsage(deviceUID: deviceUID, lastUsedDate: Date())
        let history = type == "input" ? inputHistory : outputHistory

        let updatedHistory = (history.filter { $0.deviceUID != deviceUID } + [usage])
            .sorted { $0.lastUsedDate > $1.lastUsedDate }
            .prefix(7)

        if type == "input" {
            inputHistory = Array(updatedHistory)
        } else {
            outputHistory = Array(updatedHistory)
        }
    }
}

struct Utils {
    static func isCompiledVersionAvailable(scriptName: String, in actionPath: String) -> Bool {
        return FileManager.default.fileExists(
            atPath: "\(actionPath)/Contents/Scripts/\(scriptName)")
    }
}

struct AudioDevicesAction {
    static func main() -> [[String: Any]] {
        let arguments = Array(CommandLine.arguments.dropFirst())

        if let firstArg = arguments.first,
            let dict = try? JSONSerialization.jsonObject(with: firstArg.data(using: .utf8)!)
                as? [String: String],
            let deviceID = dict["deviceID"],
            let deviceType = dict["deviceType"]
        {
            if let deviceIDInt = UInt32(deviceID) {
                if Environment.isControlKeyPressed {
                    if let deviceUID = CoreAudioUtils.getDeviceUID(deviceID: deviceIDInt) {
                        var preferences = loadPreferences()
                        preferences.toggleExcludedDevice(deviceUID)
                        savePreferences(preferences)
                    }
                } else if Environment.isAlternateKeyPressed && deviceType == "output" {
                    if let deviceUID = CoreAudioUtils.getDeviceUID(deviceID: deviceIDInt) {
                        var preferences = loadPreferences()
                        preferences.toggleNoSoundEffectsSync(deviceUID)
                        savePreferences(preferences)
                    }
                } else {
                    let preferences = loadPreferences()
                    activateDevice(
                        deviceID: deviceID, deviceType: deviceType, preferences: preferences)
                    if Environment.isCommandKeyPressed {
                        return listDevices(filterType: deviceType == "input" ? "output" : "input")
                    }
                }
            }
            return listDevices(filterType: nil)
        }

        return listDevices(filterType: nil)
    }

    private static func listDevices(filterType: String?) -> [[String: Any]] {
        let history = loadDeviceHistory()
        let preferences = loadPreferences()
        let showExcluded = Environment.isCommandKeyPressed && filterType == nil

        // Process input and output devices separately to maintain correct ordering
        let inputDevices = CoreAudioUtils.getDeviceList(type: "input")
            .filter { device in
                if let uid = CoreAudioUtils.getDeviceUID(deviceID: device.id) {
                    return showExcluded || !preferences.excludedDevices.contains(uid)
                }
                return true
            }
        let outputDevices = CoreAudioUtils.getDeviceList(type: "output")
            .filter { device in
                if let uid = CoreAudioUtils.getDeviceUID(deviceID: device.id) {
                    return showExcluded || !preferences.excludedDevices.contains(uid)
                }
                return true
            }

        // Find active devices once
        let activeInputUID = inputDevices.first { $0.isActive }.flatMap {
            CoreAudioUtils.getDeviceUID(deviceID: $0.id)
        }
        let activeOutputUID = outputDevices.first { $0.isActive }.flatMap {
            CoreAudioUtils.getDeviceUID(deviceID: $0.id)
        }

        // Find last used devices once
        let lastUsedInputUID = history.lastUsedDevice(type: "input", excluding: activeInputUID)
        let lastUsedOutputUID = history.lastUsedDevice(type: "output", excluding: activeOutputUID)

        // Log device lists for debugging
        NSLog("Input Devices:")
        for device in inputDevices {
            let uid = CoreAudioUtils.getDeviceUID(deviceID: device.id) ?? "unknown"
            NSLog("- \(device.title) (ID: \(device.id), UID: \(uid), Active: \(device.isActive))")
        }

        NSLog("Output Devices:")
        for device in outputDevices {
            let uid = CoreAudioUtils.getDeviceUID(deviceID: device.id) ?? "unknown"
            NSLog("- \(device.title) (ID: \(device.id), UID: \(uid), Active: \(device.isActive))")
        }

        // Process devices based on type filter
        let processDevices = {
            (devices: [(title: String, id: UInt32, isActive: Bool)], type: String) -> [[String:
                Any]] in
            devices.map { device -> [String: Any] in
                let deviceUID = CoreAudioUtils.getDeviceUID(deviceID: device.id)
                let isLastUsed =
                    deviceUID != nil
                    && (type == "input"
                        ? deviceUID == lastUsedInputUID
                        : deviceUID == lastUsedOutputUID)

                let isExcluded =
                    deviceUID != nil && preferences.excludedDevices.contains(deviceUID!)
                let noSoundEffectsSync =
                    type == "output" && deviceUID != nil
                    && preferences.noSoundEffectsSyncDevices.contains(deviceUID!)

                // Create display labels
                var labels: [String] = []
                if device.isActive { labels.append("active") }
                if isLastUsed { labels.append("last used") }
                if isExcluded { labels.append("excluded") }
                if noSoundEffectsSync { labels.append("no sound effects sync") }

                // Create sort priority
                let sortPriority: Int
                if isExcluded {
                    sortPriority = 4
                } else if isLastUsed {
                    sortPriority = 1
                } else if device.isActive {
                    sortPriority = 2
                } else {
                    sortPriority = 3
                }

                return [
                    "title": device.title,
                    "label": labels.isEmpty ? "" : labels.joined(separator: " | "),
                    "icon": type == "input"
                        ? (device.isActive ? "inputActiveTemplate" : "inputTemplate")
                        : (device.isActive ? "outputActiveTemplate" : "outputTemplate"),
                    "badge": type,
                    "sortPriority": sortPriority,
                    "action": Utils.isCompiledVersionAvailable(
                        scriptName: "default",
                        in: Environment.actionPath) ? "default" : "default.swift",
                    "actionArgument": [
                        "deviceID": String(device.id),
                        "deviceType": type,
                    ],
                ]
            }
        }

        let result: [[String: Any]]
        if let filterType = filterType {
            result =
                filterType == "input"
                ? processDevices(inputDevices, "input")
                : processDevices(outputDevices, "output")
        } else {
            result = processDevices(outputDevices, "output") + processDevices(inputDevices, "input")
        }

        return result.sorted { item1, item2 in
            let type1 = item1["badge"] as? String ?? ""
            let type2 = item2["badge"] as? String ?? ""
            let priority1 = item1["sortPriority"] as? Int ?? 3
            let priority2 = item2["sortPriority"] as? Int ?? 3

            if type1 != type2 { return type1 == "output" }
            if priority1 != priority2 { return priority1 < priority2 }
            return (item1["title"] as? String ?? "") < (item2["title"] as? String ?? "")
        }
    }

    private static func activateDevice(
        deviceID: String, deviceType: String, preferences: Preferences
    ) {
        guard let deviceIDInt = UInt32(deviceID),
            let deviceUID = CoreAudioUtils.getDeviceUID(deviceID: deviceIDInt)
        else {
            NSLog("Failed to get device info for ID: \(deviceID)")
            return
        }

        if CoreAudioUtils.activateDevice(type: deviceType, deviceID: deviceIDInt) {
            if deviceType == "output" && !preferences.noSoundEffectsSyncDevices.contains(deviceUID)
            {
                if !CoreAudioUtils.setSoundEffectsOutput(deviceID: deviceIDInt) {
                    NSLog("Failed to sync sound effects output")
                }
            }

            var history = loadDeviceHistory()
            history.addUsage(deviceUID: deviceUID, type: deviceType)
            saveDeviceHistory(history)
        } else {
            NSLog("Failed to set device as default")
        }
    }

    private static func loadDeviceHistory() -> DeviceHistory {
        guard let data = try? Data(contentsOf: URL(fileURLWithPath: Environment.historyPlistPath)),
            let history = try? PropertyListDecoder().decode(DeviceHistory.self, from: data)
        else {
            return DeviceHistory()
        }
        return history
    }

    private static func saveDeviceHistory(_ history: DeviceHistory) {
        guard let data = try? PropertyListEncoder().encode(history) else {
            NSLog("Failed to encode device history")
            return
        }

        try? data.write(to: URL(fileURLWithPath: Environment.historyPlistPath))
    }

    private static func loadPreferences() -> Preferences {
        guard
            let data = try? Data(
                contentsOf: URL(fileURLWithPath: Environment.preferencesPlistPath)),
            let preferences = try? PropertyListDecoder().decode(Preferences.self, from: data)
        else {
            return Preferences()
        }
        return preferences
    }

    private static func savePreferences(_ preferences: Preferences) {
        guard let data = try? PropertyListEncoder().encode(preferences) else {
            NSLog("Failed to encode preferences")
            return
        }

        try? data.write(to: URL(fileURLWithPath: Environment.preferencesPlistPath))
    }

    private static func toggleDeviceExclusion(deviceID: UInt32) {
        guard let deviceUID = CoreAudioUtils.getDeviceUID(deviceID: deviceID) else {
            NSLog("Failed to get device UID for ID: \(deviceID)")
            return
        }
        var preferences = loadPreferences()
        preferences.toggleExcludedDevice(deviceUID)
        savePreferences(preferences)
    }

    private static func toggleNoSoundEffectsSync(deviceID: UInt32) {
        guard let deviceUID = CoreAudioUtils.getDeviceUID(deviceID: deviceID) else {
            NSLog("Failed to get device UID for ID: \(deviceID)")
            return
        }
        var preferences = loadPreferences()
        preferences.toggleNoSoundEffectsSync(deviceUID)
        savePreferences(preferences)
    }
}

// MARK: - Script Execution

let result = AudioDevicesAction.main()
if let jsonData = try? JSONSerialization.data(withJSONObject: result, options: []),
    let jsonString = String(data: jsonData, encoding: .utf8)
{
    print(jsonString)
}
