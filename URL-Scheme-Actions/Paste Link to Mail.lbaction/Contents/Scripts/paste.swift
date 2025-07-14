#!/usr/bin/env swift

/* 
Paste Helper for Paste Mail URL Scheme Action for LaunchBar
by Christian Bender (@ptujec)
2025-02-16

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

import Foundation
import AppKit

// MARK: - Pasteboard Handling
func createAttributedString(text: String, url: String = "") -> NSAttributedString {
    let font = NSFont(name: "Helvetica Neue", size: 14) ?? NSFont.systemFont(ofSize: 14)
    let attributes: [NSAttributedString.Key: Any] = [.font: font]
    let attributedString = NSMutableAttributedString(string: text, attributes: attributes)
    if !url.isEmpty { attributedString.addAttribute(.link, value: url, range: NSRange(location: 0, length: attributedString.length)) }
    return attributedString
}

// Create and store clipboard content
func copyToClipboard(title: String, url: String) {
    let pasteboard = NSPasteboard.general
    pasteboard.clearContents()
    
    let attributedString = createAttributedString(text: title, url: url)
    
    guard let rtfData = try? attributedString.data(
        from: NSRange(location: 0, length: attributedString.length),
        documentAttributes: [.documentType: NSAttributedString.DocumentType.rtf]
    ) else {
        NSLog("Failed to create RTF data")
        return
    }
    
    let markdownText = "[\(title)](\(url))"
    let success = pasteboard.declareTypes([.rtf, .string], owner: nil) > 0 &&
                 pasteboard.setString(markdownText, forType: .string) &&
                 pasteboard.setData(rtfData, forType: .rtf)
    
    if !success { NSLog("Failed to copy to clipboard") }
}

func executePaste() {
    let workspace = NSWorkspace.shared
    let frontmostApp = workspace.frontmostApplication
    
    let script: String
    if frontmostApp?.bundleIdentifier == "com.ideasoncanvas.mindnode" {
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
            exit(0)
        }
    } else {
        NSLog("Failed to create AppleScript for paste command")
        exit(0)
    }
}

func main() {
    let arguments = Array(CommandLine.arguments.dropFirst())
    guard arguments.count >= 2 else {
        NSLog("Error: Insufficient arguments. Expected title and URL")
        exit(0)
    }
    
    let title = arguments[0]
    let url = arguments[1]
    
    copyToClipboard(title: title, url: url)
    executePaste()
}

main() 
