#!/usr/bin/env swift

/* 
Mindnode URL Scheme Action for LaunchBar
by Christian Bender (@ptujec)
2026-11-28

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

import Cocoa

// MARK: - Environment

struct Environment {
    static let info = ProcessInfo.processInfo.environment
    static let isCommandKeyPressed = info["LB_OPTION_COMMAND_KEY"] == "1"
}

// MARK: - Input Parsing

func parseMindnodeItem(input: String) -> (title: String, url: String)? {
    guard let data = input.data(using: .utf8),
          let json = try? JSONSerialization.jsonObject(with: data) else { return nil }
    let item: [String: Any]? = (json as? [[String: Any]])?.first ?? (json as? [String: Any])
    guard let title = item?["title"] as? String, let url = item?["url"] as? String else { return nil }
    return (title, url)
}

// MARK: - Pasteboard Handling

func createAttributedString(text: String, url: String = "") -> NSAttributedString {
    let font = NSFont(name: "Helvetica Neue", size: 14) ?? NSFont.systemFont(ofSize: 14)
    let attributes: [NSAttributedString.Key: Any] = [.font: font]
    let attributedString = NSMutableAttributedString(string: text, attributes: attributes)
    if !url.isEmpty { attributedString.addAttribute(.link, value: url, range: NSRange(location: 0, length: attributedString.length)) }
    return attributedString
}

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

// MARK: - Paste Operation

func executePaste() {
    let script = """
        tell application "System Events" to keystroke "v" using command down
    """
    
    if let appleScript = NSAppleScript(source: script) {
        var error: NSDictionary?
        appleScript.executeAndReturnError(&error)
        
        if let error = error {
            NSLog("Failed to execute paste command: \(error)")
            exit(1)
        }
    }
}

// MARK: - Main Action

func main() {
    guard CommandLine.arguments.count > 1 else {
        NSLog("No path provided")
        exit(1)
    }
    
    let input = CommandLine.arguments[1]

    guard let item = parseMindnodeItem(input: input) else {
        NSLog("Invalid Mindnode item: \(input)")
        exit(1)
    }

    copyToClipboard(title: item.title, url: item.url)
    executePaste()
}

main()
