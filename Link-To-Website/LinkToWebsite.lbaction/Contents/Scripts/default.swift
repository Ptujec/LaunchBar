#!/usr/bin/env swift

/* 
Link to Website Action for LaunchBar
by Christian Bender (@ptujec)
2026-02-25

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

import Cocoa

// MARK: - Environment

struct Environment {
    static let info = ProcessInfo.processInfo.environment
    static let isCommandKeyPressed = info["LB_OPTION_COMMAND_KEY"] == "1"
    static let isAlternateKeyPressed = info["LB_OPTION_ALTERNATE_KEY"] == "1"
}

// MARK: - Browser Detection

let supportedBrowsers = ["com.apple.safari", "company.thebrowser.browser", "com.google.chrome", "net.imput.helium", "com.vivaldi.vivaldi", "com.brave.browser", "com.kagi.kagimacos"]

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
        return defaultBrowser.lowercased()
    }
    
    // Fall back to first running supported browser
    return supportedBrowsers.first(where: isRunning)
}

// MARK: - Browser Script Generation

func getBrowserScript(browser: String, customTitle: String?, includeTime: Bool = false) -> String {
    let isSafariStyle = browser == "com.apple.safari" || browser == "com.kagi.kagimacos"
    
    let baseScript: String
    if isSafariStyle {
        baseScript = "tell application id \"\(browser)\"\nset _url to URL of front document\n"
    } else {
        baseScript = "tell application id \"\(browser)\"\nset _url to URL of active tab of front window\n"
    }
    
    let titlePart = customTitle != nil ?
        "set _name to \"\(customTitle!)\"" :
        (isSafariStyle ?
            "set _name to name of front document" :
            "set _name to title of active tab of front window")
    
    let timePart: String
    if includeTime {
        let jsExecution: String
        if isSafariStyle {
            jsExecution = "set _time to (do JavaScript \"String(Math.round(document.querySelector('video').currentTime))\" in front document) as string"
        } else {
            jsExecution = "set _time to (execute active tab of front window javascript \"String(Math.round(document.querySelector('video').currentTime))\")"
        }
        timePart = "\nset _time to \"\"\nif (_url contains \"youtube.com\") or (_url contains \"youtu.be\") or (_url contains \"twitch.tv\") then\n  try\n    \(jsExecution)\n  on error e\n    set _time to \"\"\n  end try\nend if\nreturn {_url, _name, _time}"
    } else {
        timePart = "\nreturn {_url, _name, \"\"}"
    }
    
    return baseScript + titlePart + timePart + "\nend tell"
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

// MARK: - Time Formatting

func formatTimeForTitle(_ time: String) -> String {
    guard !time.isEmpty, let timeValue = Double(time), timeValue > 0 else {
        return ""
    }
    
    let totalSeconds = Int(timeValue)
    let hours = totalSeconds / 3600
    let minutes = (totalSeconds % 3600) / 60
    let seconds = totalSeconds % 60
    
    if hours > 0 {
        return String(format: " (%02d:%02d:%02d)", hours, minutes, seconds)
    } else {
        return String(format: " (%02d:%02d)", minutes, seconds)
    }
}

// MARK: - Time Append for Video URLs

func appendTimeToVideoURL(_ url: String, time: String) -> String {
    guard !time.isEmpty, let timeValue = Double(time), timeValue > 10 else {
        return url
    }
    
    if url.contains("youtube.com") || url.contains("youtu.be") {
        return handleYoutubeUrl(url, time: time)
    }
    
    if url.contains("twitch.tv") {
        return handleTwitchUrl(url, time: time)
    }
    
    return url
}

func removeTimeFromURL(_ url: String) -> String {
    var processedUrl = url
    
    if url.contains("youtube.com") || url.contains("youtu.be") {
        // Remove &t=XXXs parameter
        processedUrl = processedUrl.replacingOccurrences(of: "&t=\\d+s", with: "", options: .regularExpression)
        // Remove ?t=XXXs parameter
        processedUrl = processedUrl.replacingOccurrences(of: "\\?t=\\d+s", with: "", options: .regularExpression)
    }
    
    if url.contains("twitch.tv") {
        // Remove ?t=XXXs parameter
        processedUrl = processedUrl.replacingOccurrences(of: "\\?t=\\d+s", with: "", options: .regularExpression)
        // Remove &t=XXXs parameter
        processedUrl = processedUrl.replacingOccurrences(of: "&t=\\d+s", with: "", options: .regularExpression)
    }
    
    return processedUrl
}

func handleYoutubeUrl(_ url: String, time: String) -> String {
    let baseUrl = "https://www.youtube.com/watch?v="
    var ytId: String?
    
    if url.contains("youtu.be") {
        let components = url.split(separator: "youtu.be/")
        if components.count > 1 {
            ytId = String(components[1]).split(separator: "?")[0].trimmingCharacters(in: .whitespaces)
        }
    } else {
        let components = url.split(separator: "v=")
        if components.count > 1 {
            ytId = String(components[1]).split(separator: "&")[0].trimmingCharacters(in: .whitespaces)
        }
    }
    
    guard let ytId = ytId, !ytId.isEmpty else {
        return url
    }
    
    let timeValue = Int(Double(time) ?? 0)
    let timeParam = timeValue > 10 ? "&t=\(timeValue)s" : ""
    return baseUrl + ytId + timeParam
}

func handleTwitchUrl(_ url: String, time: String) -> String {
    let baseUrl = "https://www.twitch.tv/videos/"
    let pattern = "/videos/(\\d+)"
    
    guard let regex = try? NSRegularExpression(pattern: pattern) else {
        return url
    }
    
    let range = NSRange(url.startIndex..., in: url)
    guard let match = regex.firstMatch(in: url, range: range),
          let videoIdRange = Range(match.range(at: 1), in: url) else {
        return url
    }
    
    let videoId = String(url[videoIdRange])
    let timeValue = Int(Double(time) ?? 0)
    let timeParam = timeValue > 10 ? "?t=\(timeValue)s" : ""
    return baseUrl + videoId + timeParam
}

// MARK: - Browser Information Retrieval

func getBrowserInfo(browser: String, customTitle: String?, includeTime: Bool = false) throws -> (url: String, title: String, time: String) {
    let script = getBrowserScript(browser: browser, customTitle: customTitle, includeTime: includeTime)

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
    
    let time = result.atIndex(3)?.stringValue ?? ""
    
    return (url, title, time)
}

// MARK: - Clipboard Operations

func copyToClipboard(title: String, url: String) {
    let pasteboard = NSPasteboard.general
    pasteboard.clearContents()
    
    if Environment.isCommandKeyPressed {
        _ = pasteboard.setString(url, forType: .string)
        return
    }
    
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
        
        let info = try getBrowserInfo(browser: browser, customTitle: customTitle, includeTime: Environment.isAlternateKeyPressed)
        var url = info.url
        var title = cleanTitle(info.title)
        
        if Environment.isAlternateKeyPressed {
            url = appendTimeToVideoURL(url, time: info.time)
            title += formatTimeForTitle(info.time)
        } else {
            url = removeTimeFromURL(url)
        }
        
        copyToClipboard(title: title, url: url)
        executePaste()
    } catch {
        NSLog("Error: \(error.localizedDescription)")
        exit(0)
    }
}

main() 
