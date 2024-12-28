#!/usr/bin/env swift

/*
Look Up Action for LaunchBar
by Christian Bender (@ptujec)
2024-12-28

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

Documentation:
- https://developer.apple.com/documentation/coreservices/1446842-dcscopytextdefinition
- https://fmentzer.github.io/posts/2020/dictionary/ (I didn't use this. But if you want to digg deep that might help because the official API doesn't do much)

Similar abandoned action by @nbjahan: https://github.com/nbjahan/launchbar-livedic
*/

import AppKit  // Add this for NSSpellChecker
import CoreServices
import Foundation

// Get the search query (first argument)
let arguments = Array(CommandLine.arguments.dropFirst())
guard let searchTerm = arguments.first else {
    exit(0)
}

// Create a dictionary reference and search
let dictionary: DCSDictionary? = nil  // Use default dictionary
let searchRange = CFRangeMake(0, CFStringGetLength(searchTerm as CFString))

// Get spell checking suggestions
let spellChecker = NSSpellChecker.shared
let wordRange = NSRange(location: 0, length: searchTerm.count)
let guesses =
    spellChecker.guesses(
        forWordRange: wordRange,
        in: searchTerm,
        language: spellChecker.language(),
        inSpellDocumentWithTag: 0) ?? []

// Combine original term with suggestions
var allWords = [searchTerm] + guesses
var results: [[String: String]] = []

// Get definitions for all words
for word in allWords {
    let searchRange = CFRangeMake(0, CFStringGetLength(word as CFString))
    if let definition = DCSCopyTextDefinition(dictionary, word as CFString, searchRange)?
        .takeRetainedValue() as String?
    {
        // NSLog("Definition: \(definition)")

        // Limit definition length … because the interface can not display much anyways
        let maxLength = 120
        let trimmedDefinition = definition.count > maxLength
            ? String(definition.prefix(maxLength - 1)) + "…"
            : definition
            
        // Split the definition by "|" and trim whitespace
        let components = trimmedDefinition.components(separatedBy: "|").map {
            $0.trimmingCharacters(in: .whitespaces)
        }

        // NSLog("Components: \(components.count)")

        let title =
            components.count == 1
            ? searchTerm
            : components.dropLast().joined(separator: " | ")

        let subtitle = components.count == 1 ? trimmedDefinition : components.last ?? ""
        
        let icon = word != searchTerm ? "suggestionTemplate" : "hitTemplate"
        let url =
            "dict://\(word.addingPercentEncoding(withAllowedCharacters: .urlHostAllowed) ?? "")"

        results.append(
            [
                "title": title,
                "subtitle": subtitle,
                "alwaysShowsSubtitle": "true",
                "icon": icon,
                "url": url,
            ].compactMapValues { $0 })

    }
}

// Convert to JSON and print
do {
    let data = try JSONSerialization.data(withJSONObject: results)
    if let string = String(data: data, encoding: .utf8) {
        print(string)
    }
} catch {
    NSLog("Error converting data to JSON: \(error)")
}
