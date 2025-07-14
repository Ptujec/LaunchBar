#!/usr/bin/env swift

/* 
Mindnode URL Scheme Action for LaunchBar
by Christian Bender (@ptujec)
2024-02-13

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

import Cocoa

// MARK: - Environment

struct Environment {
    static let info = ProcessInfo.processInfo.environment
    static let isCommandKeyPressed = info["LB_OPTION_COMMAND_KEY"] == "1"
}

// MARK: - URL Generation

func generateMindnodeURL(path: String) -> (urlScheme: String, docTitle: String) {
    let docTitle = path.replacingOccurrences(
        of: "/Users/.+/Documents/",
        with: "",
        options: .regularExpression
    )
    let encodedTitle = docTitle.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? docTitle
    let urlScheme = "mindnode://open?name=\(encodedTitle)"
    
    return (urlScheme, docTitle)
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
    let workspace = NSWorkspace.shared
    let frontmostApp = workspace.frontmostApplication
    
    let script: String
    if frontmostApp?.bundleIdentifier == "com.ideasoncanvas.mindnode" && !Environment.isCommandKeyPressed {
        script = """
        tell application "System Events" to keystroke "v" using {command down, option down, shift down}
        """
    } else {
        script = """
        tell application "System Events" to keystroke "v" using command down
        """
    }
    
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
    
    let path = CommandLine.arguments[1]
    let (urlScheme, docTitle) = generateMindnodeURL(path: path)
    
    copyToClipboard(title: docTitle, url: urlScheme)
    executePaste()
}

main()
