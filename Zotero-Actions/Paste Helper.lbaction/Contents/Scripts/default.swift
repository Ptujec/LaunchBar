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

    guard let dict = NSDictionary(contentsOfFile: prefsPath),
          let pasteHelper = dict["pasteHelperContent"] as? [String: String],
          let rawText = pasteHelper["text"]
    else {
        NSLog("Error: Could not read preferences file or invalid data")
        exit(1)
    }

    let text = decodeHTMLEntities(rawText)
    let url = pasteHelper["url"]?.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
    let annotation = pasteHelper["annotation"] ?? ""

    let markdownItalics = text.replacingOccurrences(of: "</?i>", with: "*", options: .regularExpression)
    
    // MARK: 1. Plain text (in markdown format)
    let markdownText = [
        annotation.isEmpty ? nil : "\"\(annotation)\"",
        url.isEmpty ? markdownItalics : "[\(markdownItalics)](\(url))"
    ].compactMap { $0 }.joined(separator: " ")
    
    let pasteboard = NSPasteboard.general
    pasteboard.clearContents()
    
    // MARK: 2. Create attributed string for RTF
    let attributedString = createAttributedString(
        text: text,
        url: url,
        annotation: annotation
    )
    
    guard let rtfData = try? attributedString.data(
        from: NSRange(location: 0, length: attributedString.length),
        documentAttributes: [.documentType: NSAttributedString.DocumentType.rtf]
    ) else {
        NSLog("Error: Failed to create RTF data")
        exit(1)
    }

    // MARK: 3. Set all formats at once
    guard pasteboard.setString(markdownText, forType: .string) &&
          pasteboard.setString(text, forType: .html) &&
          pasteboard.setData(rtfData, forType: .rtf)
    else {
        NSLog("Error: Failed to set pasteboard data")
        exit(1)
    }

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

func createAttributedString(text: String, url: String, annotation: String) -> NSAttributedString {
    let regularFont = NSFont(name: "Helvetica Neue", size: 14) ?? NSFont.systemFont(ofSize: 14)
    let italicFont = NSFont(name: "Helvetica Neue Italic", size: 14) 
        ?? NSFontManager.shared.convert(regularFont, toHaveTrait: .italicFontMask)

    let attributedString = NSMutableAttributedString()
    
    // MARK: 1. Add annotation if present
    if !annotation.isEmpty {
        attributedString.append(NSAttributedString(
            string: "\"\(annotation)\" ",
            attributes: [.font: regularFont]
        ))
    }
    
    // MARK: 2. Split text into segments and process
    let segments = text.components(separatedBy: "<i>")
    attributedString.append(NSAttributedString(
        string: segments[0],
        attributes: [.font: regularFont]
    ))
    
    // MARK: 3. Process remaining segments (alternating italic/non-italic)
    for segment in segments.dropFirst() {
        guard let endIndex = segment.range(of: "</i>")?.lowerBound else { continue }
        
        let italicText = String(segment[..<endIndex])
        let remainingText = String(segment[segment.index(endIndex, offsetBy: 4)...])
        
        attributedString.append(NSAttributedString(
            string: italicText,
            attributes: [.font: italicFont]
        ))
        attributedString.append(NSAttributedString(
            string: remainingText,
            attributes: [.font: regularFont]
        ))
    }
    
    // MARK: 4. Add link to citation part only
    if !url.isEmpty {
        let annotationPrefix = "\"\(annotation)\" "
        let location: Int
        let length: Int
        
        if !annotation.isEmpty {
            location = annotationPrefix.count
            length = attributedString.length - location
        } else {
            location = 0
            length = attributedString.length
        }
        
        let citationRange = NSRange(location: location, length: length)
        attributedString.addAttribute(.link, value: url, range: citationRange)
    }
    
    return attributedString
}

func decodeHTMLEntities(_ string: String) -> String {
    return CFXMLCreateStringByUnescapingEntities(nil, string as CFString, nil) as String? ?? string
}

// MARK: Run the script
run()
