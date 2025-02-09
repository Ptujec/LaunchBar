#!/usr/bin/env swift

/*
 Paste Helper for Zotero Action for LaunchBar
 by Christian Bender (@ptujec)
 2025-02-09

 Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

 Documentation: 
 - https://developer.apple.com/documentation/appkit/nspasteboard/pasteboardtype/html
 - https://nspasteboard.org/
*/

import Cocoa

@discardableResult
func run() -> String {
    let prefsPath = NSString(
        string:
        "~/Library/Application Support/LaunchBar/Action Support/ptujec.LaunchBar.action.ZoteroSearchV2/Preferences.plist"
    ).expandingTildeInPath

    guard let dict = NSDictionary(contentsOfFile: prefsPath) else {
        NSLog("Error: Could not read preferences file")
        exit(1)
    }

    guard let pasteHelper = dict["pasteHelperContent"] as? [String: String],
          let rawText = pasteHelper["text"]
    else {
        NSLog("Error: Invalid preferences data")
        exit(1)
    }

    let text = decodeHTMLEntities(rawText)
    let url = pasteHelper["url"]?.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""

    let markdownItalics = text.replacingOccurrences(of: "</?i>", with: "*", options: .regularExpression)

    let pasteboard = NSPasteboard.general
    pasteboard.clearContents()

    // MARK: 1. Plain text (in markdown format)
    let markdownText = url.isEmpty ? markdownItalics : "[\(markdownItalics)](\(url))"
    
    // MARK: 2. Create attributed string for RTF
    let attributedString = createAttributedString(text: text, url: url)
    
    guard let rtfData = try? attributedString.data(
        from: NSRange(location: 0, length: attributedString.length),
        documentAttributes: [.documentType: NSAttributedString.DocumentType.rtf]
    ) else {
        NSLog("Error: Failed to create RTF data")
        exit(1)
    }

    // MARK: 3. Set all formats at once
    let success = pasteboard.setString(markdownText, forType: .string) &&
                 pasteboard.setString(text, forType: .html) &&
                 pasteboard.setData(rtfData, forType: .rtf)
    
    guard success else {
        NSLog("Error: Failed to set pasteboard data")
        exit(1)
    }

    // Thread.sleep(forTimeInterval: 0.01)

    let script = """
        tell application "System Events" to keystroke "v" using command down
    """

    if let appleScript = NSAppleScript(source: script) {
        var error: NSDictionary?
        appleScript.executeAndReturnError(&error)
        
        if let error = error {
            NSLog("Failed to execute AppleScript: \(error)")
            exit(1)
        }
    }
    
    return text
}

func createAttributedString(text: String, url: String = "") -> NSAttributedString {
    let regularFont = NSFont(name: "Helvetica Neue", size: 14) ?? NSFont.systemFont(ofSize: 14)
    let italicFont = NSFont(name: "Helvetica Neue Italic", size: 14) 
        ?? NSFontManager.shared.convert(regularFont, toHaveTrait: .italicFontMask)

    // MARK: 1. Split text into segments and process
    let segments = text.components(separatedBy: "<i>")
    let attributedString = NSMutableAttributedString()
    
    // MARK: 2. Add first segment (non-italic)
    attributedString.append(NSAttributedString(string: segments[0], attributes: [.font: regularFont]))
    
    // MARK: 3. Process remaining segments (alternating italic/non-italic)
    for segment in segments.dropFirst() {
        guard let endIndex = segment.range(of: "</i>")?.lowerBound else { continue }
        
        let italicText = String(segment[..<endIndex])
        let remainingText = String(segment[segment.index(endIndex, offsetBy: 4)...])
        
        attributedString.append(NSAttributedString(string: italicText, attributes: [.font: italicFont]))
        attributedString.append(NSAttributedString(string: remainingText, attributes: [.font: regularFont]))
    }
    
    if !url.isEmpty {
        attributedString.addAttribute(.link, value: url, range: NSRange(location: 0, length: attributedString.length))
    }
    
    return attributedString
}

func decodeHTMLEntities(_ string: String) -> String {
    return CFXMLCreateStringByUnescapingEntities(nil, string as CFString, nil) as String? ?? string
}

// MARK: Run the script
run()
