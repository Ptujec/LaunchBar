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
 
 TODO:
 - Localization
 - Error handling, when the device is not found you want to switch to
 - Cleanup
 */

// MARK: - Imports

import AppKit
import CoreAudio
import Foundation

struct Environment {
    static let info = ProcessInfo.processInfo.environment
    static let isCommandKeyPressed = info["LB_OPTION_COMMAND_KEY"] == "1"
    static let isControlKeyPressed = info["LB_OPTION_CONTROL_KEY"] == "1"
    static let isAlternateKeyPressed = info["LB_OPTION_ALTERNATE_KEY"] == "1"
    static let isShiftKeyPressed = info["LB_OPTION_SHIFT_KEY"] == "1"
    static let actionPath = info["LB_ACTION_PATH"] ?? ""
    static let supportPath = info["LB_SUPPORT_PATH"] ?? ""
    static let historyPlistPath = "\(supportPath)/device_history.plist"
    static let preferencesPlistPath = "\(supportPath)/preferences.plist"
}

struct Utils {
    static func getActionScriptName(scriptName: String = "default") -> String {
        return FileManager.default.fileExists(
            atPath: "\(Environment.actionPath)/Contents/Scripts/\(scriptName)")
            ? scriptName
            : "\(scriptName).swift"
    }
    
    static func hideLaunchBar() {
        let script = """
        tell application "LaunchBar" to hide
        """
        if let appleScript = NSAppleScript(source: script) {
            var error: NSDictionary?
            appleScript.executeAndReturnError(&error)
            if let error = error {
                NSLog("Failed to hide LaunchBar: \(error)")
            }
        }
    }
}

struct AirPlayDevice: Codable, Hashable {
    let name: String
    var uid: String

    init(name: String) {
        self.name = name
        uid = "\(name.replacingOccurrences(of: " ", with: "_"))_AIRPLAY"
    }

    static func == (lhs: Self, rhs: Self) -> Bool { lhs.uid == rhs.uid }
}

struct Preferences: Codable {
    var excludedDevices: Set<String>
    var noSoundEffectsSyncDevices: Set<String>
    var airPlayDevices: Set<AirPlayDevice>
    var hideAfterSelection: Bool
    
    init() {
        excludedDevices = []
        noSoundEffectsSyncDevices = []
        airPlayDevices = []
        hideAfterSelection = false // Default to old behavior
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

    func lastUsedDevice(type: String, excluding currentUID: String?, preferences: Preferences)
        -> String? {
        let history = type == "input" ? inputHistory : outputHistory
        let devices = CoreAudioUtils.getDeviceList(type: type)
        let connectedUIDs = devices.compactMap { CoreAudioUtils.getDeviceUID(deviceID: $0.id) }

        // Add AirPlay device UIDs from preferences
        let airPlayUIDs = preferences.airPlayDevices.map { $0.uid }
        let allUIDs = connectedUIDs + airPlayUIDs

        return
            history
                .filter { currentUID == nil || $0.deviceUID != currentUID }
                .filter { allUIDs.contains($0.deviceUID) }
                .sorted { $0.lastUsedDate > $1.lastUsedDate }
                .first?.deviceUID
    }

    mutating func addUsage(deviceUID: String, type: String) {
        let usage = DeviceUsage(deviceUID: deviceUID, lastUsedDate: Date())

        if type == "input" {
            inputHistory.removeAll { $0.deviceUID == deviceUID }
            inputHistory.insert(usage, at: 0)
            if inputHistory.count > 5 {
                inputHistory = Array(inputHistory.prefix(5))
            }
        } else {
            outputHistory.removeAll { $0.deviceUID == deviceUID }
            outputHistory.insert(usage, at: 0)
            if outputHistory.count > 5 {
                outputHistory = Array(outputHistory.prefix(5))
            }
        }
    }
}

struct CoreAudioUtils {
    static func createPropertyAddress(selector: AudioObjectPropertySelector)
        -> AudioObjectPropertyAddress {
        return AudioObjectPropertyAddress(
            mSelector: selector,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )
    }

    static func getDeviceName(deviceID: UInt32) -> String? {
        var nameSize = UInt32(MemoryLayout<CFString>.size)
        var deviceName: CFString = "" as CFString
        var address = createPropertyAddress(selector: kAudioDevicePropertyDeviceNameCFString)

        let status = withUnsafeMutablePointer(to: &deviceName) { ptr in
            AudioObjectGetPropertyData(deviceID, &address, 0, nil, &nameSize, ptr)
        }

        return status == noErr ? (deviceName as String) : nil
    }

    static func getDeviceList(type: String) -> [(
        name: String, id: UInt32, isActive: Bool, transportType: UInt32?
    )] {
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

        var deviceList: [(name: String, id: UInt32, isActive: Bool, transportType: UInt32?)] = []
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

            guard let deviceName = getDeviceName(deviceID: id) else { continue }

            // Get transport type
            var transportTypeSize = UInt32(MemoryLayout<UInt32>.size)
            var transportType: UInt32 = 0
            var transportAddress = createPropertyAddress(
                selector: kAudioDevicePropertyTransportType)
            let transportStatus = AudioObjectGetPropertyData(
                id, &transportAddress, 0, nil, &transportTypeSize, &transportType)
            let finalTransportType = transportStatus == noErr ? transportType : nil

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

            deviceList.append(
                (name: deviceName, id: id, isActive: isActive, transportType: finalTransportType))
        }

        return deviceList
    }

    static func setDefaultAudioDevice(type: String, deviceID: UInt32) -> Bool {
        var address = AudioObjectPropertyAddress(
            mSelector: type == "input"
                ? kAudioHardwarePropertyDefaultInputDevice
                : kAudioHardwarePropertyDefaultOutputDevice,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )

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

        var mutableDeviceID = deviceID
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

    static func hasActiveAirPlayDevice() -> Bool {
        return getDeviceList(type: "output")
            .first { $0.isActive && $0.transportType == kAudioDeviceTransportTypeAirPlay } != nil
    }
}

// MARK: - AppleScript Part

struct AudioDevicesAction {
    private static func getSettingsMenuItem(preferences: Preferences) -> [String: Any] {
        return [
            "title": preferences.hideAfterSelection ? "Hiding LB after selection" : "Keeping LB active after selection",
            "icon": preferences.hideAfterSelection ? "hideTemplate" : "showTemplate",
            "action": Utils.getActionScriptName(),
            "actionArgument": ["toggleSetting": "true"]
        ]
    }

    private static func getAirPlayDevicesAndActivate(deviceToActivate: String? = nil) -> [String] {
        let script = """
          on run
            tell application "LaunchBar" to hide
            open location "x-apple.systempreferences:com.apple.Sound-Settings.extension"
            delay 0.1

            tell application "System Events"
              set startTime to current date
              set timeoutSeconds to 5

              repeat until (exists window 1 of application process "System Settings")
                if (current date) - startTime ≥ timeoutSeconds then
                  exit repeat
                end if
                delay 0.1
              end repeat

              delay 0.1

              tell application "System Settings"
                repeat until (id of current pane is "com.apple.Sound-Settings.extension")
                    if (current date) - startTime ≥ timeoutSeconds then
                        exit repeat
                    end if
                    delay 0.1
                end repeat
              end tell

              delay 0.1 
              set _window to window 1 of application process "System Settings"

              delay 0.2 
              set _deviceNames to my getAirPlayDevices(_window)

              if _deviceNames is {} then
                delay 0.8 -- a longer delay to give more time to show conntected airplay devices
                set _deviceNames to my getAirPlayDevices(_window)
              end if


              tell application "System Events"
                if visible of application process "System Settings" is true then
                  set visible of application process "System Settings" to false
                end if
              end tell

              return _deviceNames
            end tell
          end run

          on getAirPlayDevices(_window)
            tell application "System Events"
              set _rows to rows of outline 1 of scroll area 1 of group 2 of scroll area 1 of group 1 of group 2 of splitter group 1 of group 1 of _window
              set _deviceNames to {}
              repeat with _row in _rows
                set _deviceType to value of static text 1 of group 1 of UI element 2 of _row
                if _deviceType is "AirPlay" then
                  set _deviceName to value of static text 1 of group 1 of UI element 1 of _row
                  copy _deviceName to end of _deviceNames
                  if _deviceName is "\(deviceToActivate ?? "")" then
                    select _row
                    delay 0.2
                  end if
                end if
              end repeat
              return _deviceNames
            end tell
          end getAirPlayDevices
        """

        guard let appleScript = NSAppleScript(source: script) else {
            NSLog("Failed to create NSAppleScript")
            return []
        }

        var error: NSDictionary?
        let result = appleScript.executeAndReturnError(&error)
        if let error = error {
            NSLog("Failed to execute AppleScript: \(error)")
            return []
        }

        if result.descriptorType == typeAEList {
            let numberOfItems = result.numberOfItems
            if numberOfItems == 0 {
                return []
            }
            return (1 ... numberOfItems)
                .compactMap { result.atIndex($0)?.stringValue }
        } else {
            NSLog("Unexpected result type: \(result.descriptorType)")
            return []
        }
    }

    private static func updateAirPlayDevices(
        preferences: inout Preferences, activateDevice deviceToActivate: String? = nil
    ) -> Bool {
        let deviceNames = getAirPlayDevicesAndActivate(deviceToActivate: deviceToActivate)
        let outputDeviceUIDs = Set(
            CoreAudioUtils.getDeviceList(type: "output")
                .compactMap { CoreAudioUtils.getDeviceUID(deviceID: $0.id) })

        let existingDevices = preferences.airPlayDevices.filter { outputDeviceUIDs.contains($0.uid) }
        let updatedAirPlayDevices = existingDevices.union(
            deviceNames
                .filter { !existingDevices.map(\.name).contains($0) }
                .map(AirPlayDevice.init))

        let hasChanged = updatedAirPlayDevices != preferences.airPlayDevices
        preferences.airPlayDevices = updatedAirPlayDevices
        return hasChanged
    }

    private static func switchAudioDeviceWithHistory(
        deviceID: String,
        deviceType: String,
        preferences: Preferences
    ) {
        guard let deviceIDInt = UInt32(deviceID),
              let deviceUID = CoreAudioUtils.getDeviceUID(deviceID: deviceIDInt)
        else {
            NSLog("Failed to get device info for ID: \(deviceID)")
            return
        }

        let devices = CoreAudioUtils.getDeviceList(type: deviceType)
        if let activeDevice = devices.first(where: { $0.isActive }),
           let activeDeviceUID = CoreAudioUtils.getDeviceUID(deviceID: activeDevice.id) {
            var history = loadDeviceHistory()
            history.addUsage(deviceUID: activeDeviceUID, type: deviceType)
            saveDeviceHistory(history)
        }

        if CoreAudioUtils.setDefaultAudioDevice(type: deviceType, deviceID: deviceIDInt) {
            if deviceType == "output" && !preferences.noSoundEffectsSyncDevices.contains(deviceUID) {
                if !CoreAudioUtils.setSoundEffectsOutput(deviceID: deviceIDInt) {
                    NSLog("Failed to sync sound effects output")
                }
            }
            if preferences.hideAfterSelection {
                Utils.hideLaunchBar()
            }
        } else {
            NSLog("Failed to set device as default")
        }
    }

    static func main() -> [[String: Any]] {
        let arguments = Array(CommandLine.arguments.dropFirst())
        var preferences = loadPreferences()
        var preferencesChanged = false
        
        // Show settings menu when Alt key is pressed with no arguments
        if Environment.isAlternateKeyPressed && arguments.isEmpty {
            return [getSettingsMenuItem(preferences: preferences)]
        }

        if Environment.isShiftKeyPressed {
            if updateAirPlayDevices(preferences: &preferences) {
                preferencesChanged = true
            }
        }

        if preferencesChanged {
            savePreferences(preferences)
        }

        if let firstArg = arguments.first,
           let dict = try? JSONSerialization.jsonObject(with: firstArg.data(using: .utf8)!)
           as? [String: String] {
            // Handle settings toggle
            if dict["toggleSetting"] == "true" {
                preferences.hideAfterSelection.toggle()
                savePreferences(preferences)
                // Return settings menu again to show the updated state
                return [getSettingsMenuItem(preferences: preferences)]
            }
            
            if let deviceName = dict["airPlayName"] {
                if Environment.isControlKeyPressed {
                    // Handle excluding AirPlay device
                    let airPlayUID = AirPlayDevice(name: deviceName).uid
                    preferences.toggleExcludedDevice(airPlayUID)
                    savePreferences(preferences)
                    return listDevices(filterType: nil)
                } else {
                    // Save currently active device to history before switching
                    if let activeDevice = CoreAudioUtils.getDeviceList(type: "output")
                        .first(where: { $0.isActive }),
                        let activeDeviceUID = CoreAudioUtils.getDeviceUID(deviceID: activeDevice.id) {
                        var history = loadDeviceHistory()
                        history.addUsage(deviceUID: activeDeviceUID, type: "output")
                        saveDeviceHistory(history)
                    }

                    // Check if we have a real UID for this device
                    if let device = preferences.airPlayDevices.first(where: {
                        $0.name == deviceName
                    }),
                        let existingDevice = CoreAudioUtils.getDeviceList(type: "output")
                        .first(where: {
                            CoreAudioUtils.getDeviceUID(deviceID: $0.id) == device.uid
                        }) {
                        // Device exists in CoreAudio, activate normally
                        if CoreAudioUtils.setDefaultAudioDevice(type: "output", deviceID: existingDevice.id) {
                            var history = loadDeviceHistory()
                            history.addUsage(deviceUID: device.uid, type: "output")
                            saveDeviceHistory(history)
                            if preferences.hideAfterSelection {
                                Utils.hideLaunchBar()
                            }
                        }
                        // No sound effects sync here because it does not work for AirPlay devices
                    } else {
                        // Activate via AppleScript
                        if updateAirPlayDevices(preferences: &preferences, activateDevice: deviceName) {
                            savePreferences(preferences)
                        }

                        // Check for new AirPlay device after activation
                        let startTime = Date()
                        let timeoutSeconds: TimeInterval = 10
                        var success = false

                        while Date().timeIntervalSince(startTime) < timeoutSeconds {
                            if let activeAirPlay = CoreAudioUtils.getDeviceList(type: "output")
                                .first(where: {
                                    $0.isActive && $0.transportType == kAudioDeviceTransportTypeAirPlay
                                }),
                                let deviceUID = CoreAudioUtils.getDeviceUID(deviceID: activeAirPlay.id) {
                                // Check if this is a new device (not already in preferences)
                                if !preferences.airPlayDevices.contains(where: { $0.uid == deviceUID }) {
                                    // Update the device in preferences with the real UID
                                    preferences.airPlayDevices.remove(AirPlayDevice(name: deviceName))
                                    var updatedDevice = AirPlayDevice(name: deviceName)
                                    updatedDevice.uid = deviceUID
                                    preferences.airPlayDevices.insert(updatedDevice)
                                    savePreferences(preferences)

                                    var history = loadDeviceHistory()
                                    history.addUsage(deviceUID: deviceUID, type: "output")
                                    saveDeviceHistory(history)

                                    success = true
                                    NSLog(
                                        "Successfully linked AirPlay device '\(deviceName)' to CoreAudio UID: \(deviceUID)"
                                    )
                                    break
                                }
                            }
                            Thread.sleep(forTimeInterval: 2)
                        }

                        if !success {
                            NSLog(
                                "Failed to link AirPlay device '\(deviceName)' to a CoreAudio device within \(timeoutSeconds) seconds"
                            )
                        }
                    }
                }

                return listDevices(filterType: nil)
            } else if let deviceID = dict["deviceID"],
                      let deviceType = dict["deviceType"] {
                if let deviceIDInt = UInt32(deviceID) {
                    if Environment.isControlKeyPressed {
                        if let deviceUID = CoreAudioUtils.getDeviceUID(deviceID: deviceIDInt) {
                            preferences.toggleExcludedDevice(deviceUID)
                            preferencesChanged = true
                        }
                    } else if Environment.isAlternateKeyPressed && deviceType == "output" {
                        if let deviceUID = CoreAudioUtils.getDeviceUID(deviceID: deviceIDInt) {
                            preferences.toggleNoSoundEffectsSync(deviceUID)
                            preferencesChanged = true
                        }
                    } else {
                        switchAudioDeviceWithHistory(
                            deviceID: deviceID, deviceType: deviceType, preferences: preferences)
                        if Environment.isCommandKeyPressed {
                            return listDevices(
                                filterType: deviceType == "input" ? "output" : "input")
                        }
                    }

                    if preferencesChanged {
                        savePreferences(preferences)
                    }
                }
                return listDevices(filterType: nil)
            }
        }

        return listDevices(filterType: nil)
    }

    private static func listDevices(filterType: String?) -> [[String: Any]] {
        let history = loadDeviceHistory()
        let preferences = loadPreferences()
        let showExcluded = Environment.isCommandKeyPressed && filterType == nil

        let inputDevices = CoreAudioUtils.getDeviceList(type: "input")
            .filter { device in
                if let uid = CoreAudioUtils.getDeviceUID(deviceID: device.id) {
                    let isVirtual = device.transportType == kAudioDeviceTransportTypeVirtual
                    return (showExcluded || !preferences.excludedDevices.contains(uid)) && 
                           (!isVirtual || showExcluded)
                }
                return true
            }

        // Get output devices and their UIDs for filtering AirPlay devices
        let outputDevices = CoreAudioUtils.getDeviceList(type: "output")
        let outputDeviceUIDs = Set(
            outputDevices.compactMap { CoreAudioUtils.getDeviceUID(deviceID: $0.id) })

        let filteredOutputDevices =
            outputDevices
                .filter { device in
                    if let uid = CoreAudioUtils.getDeviceUID(deviceID: device.id) {
                        let isVirtual = device.transportType == kAudioDeviceTransportTypeVirtual
                        return (showExcluded || !preferences.excludedDevices.contains(uid)) && 
                               (!isVirtual || showExcluded)
                    }
                    return true
                }
                .map { device -> (name: String, id: UInt32, isActive: Bool, transportType: UInt32?) in
                    if let uid = CoreAudioUtils.getDeviceUID(deviceID: device.id),
                       device.transportType == kAudioDeviceTransportTypeAirPlay,
                       let airPlayDevice = preferences.airPlayDevices.first(where: { $0.uid == uid }) {
                        return (
                            name: airPlayDevice.name, id: device.id, isActive: device.isActive,
                            transportType: device.transportType
                        )
                    }
                    return device
                }

        let activeInputUID = inputDevices.first { $0.isActive }.flatMap {
            CoreAudioUtils.getDeviceUID(deviceID: $0.id)
        }
        let activeOutputUID = filteredOutputDevices.first { $0.isActive }.flatMap {
            CoreAudioUtils.getDeviceUID(deviceID: $0.id)
        }

        let lastUsedInputUID = history.lastUsedDevice(
            type: "input", excluding: activeInputUID, preferences: preferences)
        let lastUsedOutputUID = history.lastUsedDevice(
            type: "output", excluding: activeOutputUID, preferences: preferences)

        // MARK: Log device lists for debugging
        for device in filteredOutputDevices {
            let uid = CoreAudioUtils.getDeviceUID(deviceID: device.id) ?? "unknown"
            NSLog(
                "- \(device.name) (ID: \(device.id), UID: \(uid), Active: \(device.isActive), Transport: \(device.transportType ?? 0))"
            )
        }

        let processDevices = {
            (
                devices: [(name: String, id: UInt32, isActive: Bool, transportType: UInt32?)],
                type: String
            ) -> [[String: Any]] in
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
                if device.transportType == kAudioDeviceTransportTypeAirPlay {
                    labels.append("AirPlay")
                }

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
                    "title": device.name,
                    "label": labels.isEmpty ? "" : labels.joined(separator: " | "),
                    "icon": type == "input"
                        ? (device.isActive ? "inputActiveTemplate" : "inputTemplate")
                        : (device.isActive ? "outputActiveTemplate" : "outputTemplate"),
                    "badge": type,
                    "sortPriority": sortPriority,
                    "action": Utils.getActionScriptName(),
                    "actionArgument": [
                        "deviceID": String(device.id),
                        "deviceType": type,
                    ],
                    "actionRunsInBackground": preferences.hideAfterSelection ? true : false
                ]
            }
        }

        // Add AirPlay devices to the output devices list (only those not already in CoreAudio)
        let airPlayDevices: [[String: Any]] = preferences.airPlayDevices
            .filter { device in
                !outputDeviceUIDs.contains(device.uid) // Filter out devices already in CoreAudio
                    && (showExcluded || !preferences.excludedDevices.contains(device.uid))
            }
            .map { device -> [String: Any] in
                let isExcluded = preferences.excludedDevices.contains(device.uid)
                let isLastUsed = device.uid == lastUsedOutputUID

                var labels: [String] = []
                if isLastUsed { labels.append("last used") }
                if isExcluded { labels.append("excluded") }
                labels.append("AirPlay")

                let sortPriority = isExcluded ? 4 : (isLastUsed ? 1 : 3)

                return [
                    "title": device.name,
                    "label": labels.joined(separator: " | "),
                    "icon": "outputTemplate",
                    "badge": "output",
                    "sortPriority": sortPriority,
                    "action": Utils.getActionScriptName(),
                    "actionArgument": [
                        "airPlayName": device.name,
                    ],
                    "actionRunsInBackground": preferences.hideAfterSelection ? true : false,
                ]
            }

        let result: [[String: Any]]
        if let filterType = filterType {
            result =
                filterType == "input"
                    ? processDevices(inputDevices, "input")
                    : processDevices(filteredOutputDevices, "output") + airPlayDevices
        } else {
            result =
                processDevices(filteredOutputDevices, "output") + airPlayDevices
                    + processDevices(inputDevices, "input")
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
   let jsonString = String(data: jsonData, encoding: .utf8) {
    print(jsonString)
}
