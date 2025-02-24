#!/usr/bin/env swift

/*
 Menus - Menu Bar Items Action for LaunchBar
 by Christian Bender (@ptujec)
 2025-02-21

 Created on the basis of https://github.com/BenziAhamed/Menu-Bar-Search by Benzi Ahamed.
 Adjusted and improved for LaunchBar with the help of Cursor.

 Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

 Documentation:
 - https://developer.apple.com/design/human-interface-guidelines/the-menu-bar
 - https://developer.apple.com/documentation/applicationservices/carbon_accessibility/attributes

 TODO:
 - fix mic, globe … display … fn & F5 … show sf symbols if possible ? I don't think so
 - option to include apple & help menu in config (false by default) includeAppleMenu: false
 */

import Cocoa

// MARK: - Configuration

struct UserConfig: Codable {
    var globalMenuExclusions: [String]
    var appMenuExclusions: [String: [String]]
}

struct Config {
    private static let preferences = Preferences.load()
    private static let userConfig = preferences.config ?? UserConfig(
        globalMenuExclusions: [
            "Open Recent", "Benutzte Dokumente", "Services", "Dienste", "History", "Verlauf",
        ],
        appMenuExclusions: ["org.mozilla.firefox": ["Chronik"]]
    )

    static let globalExclusions = userConfig.globalMenuExclusions
    static let appExclusions = userConfig.appMenuExclusions.mapValues(Set.init)

    static func isPathExcluded(_ path: [String], for bundleId: String?) -> Bool {
        path.contains { item in
            globalExclusions.contains(item) ||
                bundleId.flatMap { appExclusions[$0]?.contains(item) } ?? false
        }
    }

    static func openConfigInEditor() {
        if preferences.config == nil {
            var prefs = preferences
            prefs.config = userConfig
            Preferences.save(prefs)
        }
        NSWorkspace.shared.open(URL(fileURLWithPath: Environment.preferencesPlistPath))
    }
}

// MARK: - Core Menu Types & Protocols

protocol MenuItemProvider {
    func getMenuItems(startingFrom indices: [Int]?) -> [MenuItem]
}

protocol MenuItemInteractor {
    func performMenuItemAction(indices: [Int])
}

struct MenuItem {
    let title: String
    let path: [String]
    let indices: [Int]
    let shortcut: String
    let mark: String?
    let hasSubmenu: Bool

    var subtitle: String {
        path.dropLast().joined(separator: " > ")
    }

    var uid: String? {
        guard let bundleId = NSWorkspace.shared.menuBarOwningApplication?.bundleIdentifier else { return nil }
        return "\(bundleId).\(indices.map { String($0) }.joined(separator: "."))"
    }
}

// MARK: - Menu Bar Access Implementation

final class MenuBarAccess: MenuItemProvider, MenuItemInteractor {
    private let axApp: AXUIElement
    private let bundleId: String?

    init(for app: NSRunningApplication) {
        axApp = AXUIElementCreateApplication(app.processIdentifier)
        bundleId = app.bundleIdentifier
    }

    private func getMenuBar() -> AXUIElement? {
        var menuBarRef: CFTypeRef?
        let result = AXUIElementCopyAttributeValue(axApp, kAXMenuBarAttribute as CFString, &menuBarRef)
        guard result == .success else {
            NSLog("Failed to get menu bar with error: \(result)")
            return nil
        }
        return (menuBarRef as! AXUIElement)
    }

    private func processSubmenu(_ menu: AXUIElement, currentPath: [String], currentIndices: [Int], recursive: Bool = false) -> [MenuItem] {
        guard let menuItems = getAttribute(element: menu, name: kAXChildrenAttribute) as? [AXUIElement] else {
            return []
        }

        var items: [MenuItem] = []

        for (index, menuItem) in menuItems.enumerated() {
            let attrs = getMultipleAttributes(element: menuItem, names: [
                kAXTitleAttribute as String,
                kAXEnabledAttribute as String,
                kAXChildrenAttribute as String,
                kAXMenuItemCmdCharAttribute as String,
                kAXMenuItemCmdModifiersAttribute as String,
                kAXMenuItemCmdVirtualKeyAttribute as String,
                kAXMenuItemMarkCharAttribute as String,
            ])

            guard let title = attrs[kAXTitleAttribute as String] as? String,
                  !title.isEmpty,
                  attrs[kAXEnabledAttribute as String] as? Bool ?? false else { continue }

            let path = currentPath + [title]
            guard !Config.isPathExcluded(path, for: bundleId) else { continue }

            let indices = currentIndices + [index]
            let shortcut = formatShortcut(
                cmd: attrs[kAXMenuItemCmdCharAttribute as String] as? String,
                modifiers: (attrs[kAXMenuItemCmdModifiersAttribute as String] as? NSNumber)?.intValue ?? 0,
                virtualKey: (attrs[kAXMenuItemCmdVirtualKeyAttribute as String] as? NSNumber)?.intValue ?? 0
            )

            let mark = attrs[kAXMenuItemMarkCharAttribute] as? String
            let hasSubmenu = (attrs[kAXChildrenAttribute as String] as? [AXUIElement])?.isEmpty == false

            let currentItem = MenuItem(
                title: title,
                path: path,
                indices: indices,
                shortcut: shortcut,
                mark: mark,
                hasSubmenu: hasSubmenu
            )

            items.append(currentItem)

            if recursive && hasSubmenu,
               let submenu = attrs[kAXChildrenAttribute as String] as? [AXUIElement],
               !submenu.isEmpty {
                items.append(contentsOf: processSubmenu(submenu[0], currentPath: path, currentIndices: indices, recursive: true))
            }
        }

        return items
    }

    func getMenuItems(startingFrom indices: [Int]? = nil) -> [MenuItem] {
        guard let menuBar = getMenuBar() else { return [] }

        var menuBarItems: CFTypeRef?
        guard AXUIElementCopyAttributeValue(menuBar, kAXChildrenAttribute as CFString, &menuBarItems) == .success,
              let items = menuBarItems as! NSArray? as? [AXUIElement] else {
            return []
        }

        if let indices = indices {
            guard let firstIndex = indices.first,
                  firstIndex < items.count else { return [] }

            var currentMenu = items[firstIndex]
            var currentPath = [String]()
            var currentIndices = [firstIndex]

            func getSubmenu(from element: AXUIElement) -> AXUIElement? {
                guard let submenu = getMultipleAttributes(element: element, names: [kAXChildrenAttribute as String])[kAXChildrenAttribute as String] as? [AXUIElement],
                      !submenu.isEmpty else { return nil }
                return submenu[0]
            }

            for index in indices.dropFirst() {
                guard let menu = getSubmenu(from: currentMenu),
                      let items = getAttribute(element: menu, name: kAXChildrenAttribute) as? [AXUIElement],
                      index < items.count else { return [] }

                currentMenu = items[index]

                if let title = getAttribute(element: currentMenu, name: kAXTitleAttribute) as? String {
                    currentPath.append(title)
                    currentIndices.append(index)
                }
            }

            guard let submenu = getSubmenu(from: currentMenu) else { return [] }
            return processSubmenu(submenu, currentPath: currentPath, currentIndices: currentIndices)
        } else {
            let itemCount = items.count - 1
            var allProcessedItems: [[MenuItem]] = Array(repeating: [], count: itemCount)

            DispatchQueue.concurrentPerform(iterations: itemCount) { index in
                let menuBarItem = items[index + 1]

                let attrs = getMultipleAttributes(element: menuBarItem, names: [
                    kAXTitleAttribute as String,
                    kAXChildrenAttribute as String,
                ])

                if let title = attrs[kAXTitleAttribute as String] as? String,
                   let submenu = attrs[kAXChildrenAttribute as String] as? [AXUIElement],
                   !submenu.isEmpty,
                   !Config.isPathExcluded([title], for: bundleId) {
                    allProcessedItems[index] = processSubmenu(submenu[0], currentPath: [title], currentIndices: [index + 1], recursive: true)
                }
            }

            return allProcessedItems.flatMap { $0 }
        }
    }
}

// MARK: - MenuItemInteractor Implementation

extension MenuBarAccess {
    func performMenuItemAction(indices: [Int]) {
        guard indices.count >= 2,
              let menuBar = getMenuBar(),
              let menuBarItems = getAttribute(element: menuBar, name: kAXChildrenAttribute) as? [AXUIElement],
              let firstIndex = indices.first,
              firstIndex < menuBarItems.count else { return }

        func getSubmenu(from element: AXUIElement) -> AXUIElement? {
            guard let submenu = getMultipleAttributes(element: element, names: [kAXChildrenAttribute as String])[kAXChildrenAttribute as String] as? [AXUIElement],
                  !submenu.isEmpty else { return nil }
            return submenu[0]
        }

        var currentMenu = menuBarItems[firstIndex]
        for index in indices.dropFirst() {
            guard let menu = getSubmenu(from: currentMenu),
                  let items = getAttribute(element: menu, name: kAXChildrenAttribute) as? [AXUIElement],
                  index < items.count else { return }

            let menuItem = items[index]

            if index == indices.last {
                AXUIElementPerformAction(menuItem, kAXPressAction as CFString)
                return
            }
            currentMenu = menuItem
        }
    }
}

// MARK: - Accessibility Helpers

private func getMultipleAttributes(element: AXUIElement, names: [String]) -> [String: Any] {
    var values: CFArray?
    let attrNames = names as NSArray
    let result = AXUIElementCopyMultipleAttributeValues(element, attrNames, .init(rawValue: 0), &values)

    if result == .success,
       let array = values as NSArray? as? [Any],
       array.count == names.count {
        return Dictionary(uniqueKeysWithValues: zip(names, array))
    }

    // Fall back to individual retrieval for failed attributes
    return names.reduce(into: [:]) { dict, name in
        var value: CFTypeRef?
        if AXUIElementCopyAttributeValue(element, name as CFString, &value) == .success {
            dict[name] = value
        }
    }
}

private func getAttribute(element: AXUIElement, name: String) -> CFTypeRef? {
    var value: CFTypeRef?
    AXUIElementCopyAttributeValue(element, name as CFString, &value)
    return value
}

private func formatShortcut(cmd: String?, modifiers: Int, virtualKey: Int) -> String {
    let virtualKeyMappings: [Int: String] = [
        0x24: "↩", // Return
        0x35: "⎋", // Escape
        0x31: "␣", // Space
        0x4C: "⌤", // kVK_ANSI_KeypadEnter
        0x47: "⌧", // kVK_ANSI_KeypadClear
        0x30: "⇥", // kVK_Tab
        0x33: "⌫", // kVK_Delete
        0x39: "⇪", // kVK_CapsLock
        0x3F: "fn", // kVK_Function
        0x7A: "F1", // kVK_F1
        0x78: "F2", // kVK_F2
        0x63: "F3", // kVK_F3
        0x76: "F4", // kVK_F4
        0x60: "F5", // kVK_F5
        0x61: "F6", // kVK_F6
        0x62: "F7", // kVK_F7
        0x64: "F8", // kVK_F8
        0x65: "F9", // kVK_F9
        0x6D: "F10", // kVK_F10
        0x67: "F11", // kVK_F11
        0x6F: "F12", // kVK_F12
        0x69: "F13", // kVK_F13
        0x6B: "F14", // kVK_F14
        0x71: "F15", // kVK_F15
        0x6A: "F16", // kVK_F16
        0x40: "F17", // kVK_F17
        0x4F: "F18", // kVK_F18
        0x50: "F19", // kVK_F19
        0x5A: "F20", // kVK_F20
        0x73: "↖", // kVK_Home
        0x74: "⇞", // kVK_PageUp
        0x75: "⌦", // kVK_ForwardDelete
        0x77: "↘", // kVK_End
        0x79: "⇟", // kVK_PageDown
        0x7B: "◀︎", // kVK_LeftArrow
        0x7C: "▶︎", // kVK_RightArrow
        0x7D: "▼", // kVK_DownArrow
        0x7E: "▲", // kVK_UpArrow
    ]

    let emojiMappings = [
        "🎤": "F5",
        "🌐": "fn",
    ]

    let modifierSymbols = [
        (key: 0x04, symbol: "⌃", isActive: { modifiers & 0x04 != 0 }), // control
        (key: 0x02, symbol: "⌥", isActive: { modifiers & 0x02 != 0 }), // option
        (key: 0x01, symbol: "⇧", isActive: { modifiers & 0x01 != 0 }), // shift
        (key: 0x08, symbol: "⌘", isActive: { modifiers & 0x08 == 0 }), // command
        (key: 0x10, symbol: "fn", isActive: { modifiers & 0x10 != 0 }), // globe/fn
    ]

    let parts = modifierSymbols
        .filter { $0.isActive() }
        .map { $0.symbol }

    var allParts = parts

    if virtualKey > 0 {
        if let keySymbol = virtualKeyMappings[virtualKey] {
            allParts.append(keySymbol)
            return allParts.joined(separator: " ")
        }
    }

    if let cmd = cmd, !cmd.isEmpty {
        // TODO: Ideally this would use string composition, but for now direct replacement works better
        // Unicode normalization attempts (.precomposedStringWithCompatibilityMapping, etc.) don't handle this case correctly
        let commandChar = if cmd == "SS" { "ß" } else { emojiMappings[cmd] ?? cmd }
        allParts.append(commandChar)
    }

    guard allParts != ["⌘"] else { return "" }

    return allParts.joined(separator: " ")
}

// MARK: - LaunchBar Integration

struct Environment {
    static let info = ProcessInfo.processInfo.environment
    static let actionPath = info["LB_ACTION_PATH"] ?? ""
    static let supportPath = info["LB_SUPPORT_PATH"] ?? ""
    static let preferencesPlistPath = "\(supportPath)/preferences.plist"
    static let isCommandKeyPressed = info["LB_OPTION_COMMAND_KEY"] == "1"
}

struct RecentMenuItem: Codable {
    let bundleId: String
    let indices: [Int]

    var uid: String {
        return "\(bundleId).\(indices.map { String($0) }.joined(separator: "."))"
    }
}

struct Preferences: Codable {
    var recentItems: [RecentMenuItem]
    var config: UserConfig?

    init() {
        recentItems = []
    }

    static func load() -> Preferences {
        let url = URL(fileURLWithPath: Environment.preferencesPlistPath)

        if let data = try? Data(contentsOf: url),
           let preferences = try? PropertyListDecoder().decode(Preferences.self, from: data) {
            return preferences
        }

        let preferences = Preferences()
        save(preferences)
        return preferences
    }

    static func save(_ preferences: Preferences) {
        let encoder = PropertyListEncoder()
        encoder.outputFormat = .xml

        guard let data = try? encoder.encode(preferences) else {
            NSLog("Failed to encode preferences")
            return
        }
        try? data.write(to: URL(fileURLWithPath: Environment.preferencesPlistPath))
    }

    static func updateRecentItems(bundleId: String, indices: [Int]) {
        var preferences = load()
        preferences.recentItems.removeAll { $0.bundleId == bundleId }
        preferences.recentItems.append(RecentMenuItem(bundleId: bundleId, indices: indices))
        save(preferences)
    }
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

        var error: NSDictionary?
        if let scriptObject = NSAppleScript(source: script) {
            scriptObject.executeAndReturnError(&error)
            if let error = error {
                NSLog("Failed to hide LaunchBar: \(error)")
            }
        }
    }

    static var isGermanLocale: Bool {
        return Locale.current.identifier.starts(with: "de")
    }
}

// MARK: - Main Action Handler

struct MenuAction {
    static func main() -> [[String: Any]] {
        if Environment.isCommandKeyPressed {
            Utils.hideLaunchBar()
            Config.openConfigInEditor()
            exit(0)
        }

        let arguments = Array(CommandLine.arguments.dropFirst())

        guard let frontmostApp = NSWorkspace.shared.menuBarOwningApplication else {
            return [["title": "Error", "subtitle": "Could not get frontmost application"]]
        }

        let menuBarAccess = MenuBarAccess(for: frontmostApp)

        if let firstArg = arguments.first,
           let dict = try? JSONSerialization.jsonObject(with: firstArg.data(using: .utf8)!) as? [String: Any],
           let indices = dict["indices"] as? [Int],
           let hasSubmenu = dict["hasSubmenu"] as? Bool {
            if hasSubmenu {
                let submenuItems = menuBarAccess.getMenuItems(startingFrom: indices)
                let parentPath = dict["parentPath"] as? String
                return processItems(submenuItems, frontmostApp: frontmostApp, parentPath: parentPath)
            } else {
                if let bundleId = frontmostApp.bundleIdentifier { Preferences.updateRecentItems(bundleId: bundleId, indices: indices) }
                if frontmostApp.bundleIdentifier != "at.obdev.LaunchBar" { Utils.hideLaunchBar() }
                menuBarAccess.performMenuItemAction(indices: indices)
                exit(0)
            }
        }

        let menuItems = menuBarAccess.getMenuItems(startingFrom: nil)
        return processItems(menuItems, frontmostApp: frontmostApp)
    }

    private static func processItems(_ items: [MenuItem], frontmostApp: NSRunningApplication, parentPath: String? = nil) -> [[String: Any]] {
        let preferences = Preferences.load()
        let recentUIDs = Set(preferences.recentItems.map(\.uid))

        let processedItems = items.map { item -> [String: Any] in
            [
                "title": (item.mark != nil ? "✓ " : "") + item.title.trimmingCharacters(in: .whitespaces),
                "subtitle": parentPath != nil ? (parentPath ?? "") + " > " + item.subtitle : item.subtitle,
                "alwaysShowsSubtitle": true,
                "icon": (frontmostApp.bundleIdentifier ?? "iconTemplate") as String,
                "action": Utils.getActionScriptName(),
                "actionArgument": ["indices": item.indices, "hasSubmenu": item.hasSubmenu, "parentPath": item.hasSubmenu ? item.subtitle : nil],
                "actionRunsInBackground": item.hasSubmenu ? false : true,
                "actionReturnsItems": item.hasSubmenu ? true : false,
                "badge": item.shortcut.isEmpty ? nil : item.shortcut,
                "label": item.uid.flatMap { recentUIDs.contains($0) ? (Utils.isGermanLocale ? "Zuletzt benutzt" : "Recent") : nil },
                "uid": item.uid,
            ].compactMapValues { $0 }
        }

        let (recent, other) = processedItems.reduce(into: (recent: [[String: Any]](), other: [[String: Any]]())) { result, item in
            if let uid = item["uid"] as? String, recentUIDs.contains(uid) {
                result.recent.append(item)
            } else {
                result.other.append(item)
            }
        }

        return recent + other
    }
}

// MARK: - Script Entry Point

let result = MenuAction.main()
if let jsonData = try? JSONSerialization.data(withJSONObject: result, options: []),
   let jsonString = String(data: jsonData, encoding: .utf8) {
    print(jsonString)
}
