#!/usr/bin/env swift

/* 
Link to Website Action for LaunchBar
by Christian Bender (@ptujec)
2025-02-13

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

import Cocoa
import LinkPresentation

// MARK: - Environment

struct Environment {
    static let info = ProcessInfo.processInfo.environment
    static let isCommandKeyPressed = info["LB_OPTION_COMMAND_KEY"] == "1"
}

// MARK: - Browser Detection

let supportedBrowsers = ["com.apple.safari", "company.thebrowser.browser", "com.google.chrome", "com.vivaldi.vivaldi", "com.brave.browser"]

func getActiveBrowser() -> String? {
    let workspace = NSWorkspace.shared
    let isRunning = { (browserId: String) -> Bool in
        workspace.runningApplications.contains { app in
            app.bundleIdentifier?.lowercased() == browserId.lowercased()
        }
    }
    
    // Try default browser first
    if let plistURL = FileManager.default.urls(for: .libraryDirectory, in: .userDomainMask).first?
            .appendingPathComponent("Preferences/com.apple.LaunchServices/com.apple.launchservices.secure.plist"),
       let plist = NSDictionary(contentsOf: plistURL) as? [String: Any],
       let handlers = plist["LSHandlers"] as? [[String: Any]],
       let defaultBrowser = handlers.first(where: { $0["LSHandlerURLScheme"] as? String == "http" })?["LSHandlerRoleAll"] as? String,
       supportedBrowsers.contains(where: { $0.lowercased() == defaultBrowser.lowercased() }),
       isRunning(defaultBrowser) {
        return defaultBrowser
    }
    
    // Fall back to first running supported browser
    return supportedBrowsers.first(where: isRunning)
}

// MARK: - Browser Script Generation

func getBrowserScript(browser: String, customTitle: String?) -> String {
    let baseScript: String
    if browser == "com.apple.safari" {
        baseScript = "tell application id \"com.apple.safari\"\nset _url to URL of front document\n"
    } else {
        baseScript = "tell application id \"\(browser)\"\nset _url to URL of active tab of front window\n"
    }
    
    let titlePart = customTitle != nil ?
        "set _name to \"\(customTitle!)\"" :
        (browser == "com.apple.safari" ?
            "set _name to name of front document" :
            "set _name to title of active tab of front window")
    
    return baseScript + titlePart + "\nreturn {_url, _name}\nend tell"
}

// MARK: - Pasteboard Handling

func createAttributedString(text: String, url: String = "") -> NSAttributedString {
    let font = NSFont(name: "Helvetica Neue", size: 14) ?? NSFont.systemFont(ofSize: 14)
    let attributes: [NSAttributedString.Key: Any] = [.font: font]
    let attributedString = NSMutableAttributedString(string: text, attributes: attributes)
    if !url.isEmpty { attributedString.addAttribute(.link, value: url, range: NSRange(location: 0, length: attributedString.length)) }
    return attributedString
}

// MARK: - Title Cleaning

func cleanTitle(_ title: String) -> String {
    var cleanedTitle = title
    
    // Remove YouTube notification count at start
    cleanedTitle = cleanedTitle.replacingOccurrences(of: #"^\(\d+\)\s*"#, with: "", options: .regularExpression)
    
    // Remove " - YouTube" at the end
    cleanedTitle = cleanedTitle.replacingOccurrences(of: #"\s*-\s*YouTube$"#, with: "", options: .regularExpression)
    
    // Remove other common patterns if needed
    // Add more patterns here as needed
    
    return cleanedTitle.trimmingCharacters(in: .whitespaces)
}

// MARK: - Browser Information Retrieval

func getBrowserInfo(browser: String, customTitle: String?) throws -> (url: String, title: String) {
    let script = getBrowserScript(browser: browser, customTitle: customTitle)

    NSLog("Script: \(script)")
    
    guard let appleScript = NSAppleScript(source: script) else {
        throw NSError(domain: "AppleScriptError", code: -1)
    }
    
    var error: NSDictionary?
    let result = appleScript.executeAndReturnError(&error)
    guard error == nil,
          result.descriptorType == typeAEList,
          let url = result.atIndex(1)?.stringValue,
          let title = result.atIndex(2)?.stringValue else {
        throw NSError(domain: "AppleScriptError", code: -1, userInfo: error as? [String: Any] ?? [:])
    }
    
    return (url, title)
}

// MARK: - Clipboard Operations

func copyToClipboard(title: String, url: String) {
    let pasteboard = NSPasteboard.general
    pasteboard.clearContents()
    
    if Environment.isCommandKeyPressed {
        _ = pasteboard.setString(url, forType: .string)
        return
    }
    
    // Create link metadata
    let metadata = LPLinkMetadata()
    metadata.originalURL = URL(string: url)
    metadata.url = URL(string: url)
    metadata.title = title
    
    // Add link presentation metadata to pasteboard
    if let data = try? NSKeyedArchiver.archivedData(withRootObject: metadata, requiringSecureCoding: true) {
        pasteboard.setData(data, forType: NSPasteboard.PasteboardType("com.apple.linkpresentation.metadata"))
    }
    
    // Add RTF and markdown fallbacks
    if let rtfData = try? createAttributedString(text: title, url: url).data(
        from: NSMakeRange(0, title.count),
        documentAttributes: [.documentType: NSAttributedString.DocumentType.rtf]
    ) {
        pasteboard.setData(rtfData, forType: .rtf)
        pasteboard.setString("[\(title)](\(url))", forType: .string)
    }
}

// MARK: - Paste Execution

func executePaste() {
    let script = """
        tell application "System Events" to keystroke "v" using command down
    """
    
    if let appleScript = NSAppleScript(source: script) {
        var error: NSDictionary?
        appleScript.executeAndReturnError(&error)
        
        if let error = error {
            NSLog("Failed to execute paste command: \(error)")
            exit(0)
        }
    } else {
        NSLog("Failed to create AppleScript for paste command")
        exit(0)
    }
}

// MARK: - Main Action

func main() {
    do {
        let customTitle = Array(CommandLine.arguments.dropFirst()).first
        
        guard let browser = getActiveBrowser() else {
            NSLog("Error: No supported browser running")
            exit(0)
        }
        
        let info = try getBrowserInfo(browser: browser, customTitle: customTitle)
        let cleanedTitle = cleanTitle(info.title)
        copyToClipboard(title: cleanedTitle, url: info.url)
        executePaste()
    } catch {
        NSLog("Error: \(error.localizedDescription)")
        exit(0)
    }
}

main() 
