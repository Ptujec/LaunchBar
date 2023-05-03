#!/usr/bin/env swift

/* 
Import Colors for LaunchBar
by Christian Bender (@ptujec)
2023-05-02

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

import AppKit
import Foundation

let input = CommandLine.arguments[1]
// let input = """
// FFB11B
// DFC62A
// #FFC300
// #E8AB12
// rgba(0,0,0,0.9)
// """

// Split the input string by newlines
let colorValues = input.components(separatedBy: "\n")

// Create timestamp
let formatter = DateFormatter()
formatter.dateFormat = "yyyyMMddHHmmss"
let timestamp = formatter.string(from: Date())

// Set a default title
let defaultTitle = "Color list \(timestamp)"

// Use Applescript to ask for title
let appleScriptString = """
tell application "System Events"
    activate
    set theTitle to text returned of (display dialog "Choose a name for the list:" default answer "\(defaultTitle)" with title "Import Colors")
end tell
return theTitle
"""

// Create an NSAppleScript object from the AppleScript string
let appleScript = NSAppleScript(source: appleScriptString)

// Call the AppleScript and get the result
var error: NSDictionary?
guard let title = appleScript?.executeAndReturnError(&error).stringValue else {
    print("Error: \(error?.description ?? "Unknown error")")
    exit(1)
}


// Create a new NSColorList
let colorList = NSColorList(name: title)

// Loop over the color values and add them to the color list
for colorValue in colorValues {
    if let color = NSColor(from: colorValue) {
        colorList.setColor(color, forKey: colorValue)
    }
}

// Save the color list to disk
let fileManager = FileManager.default
if let path = fileManager.urls(for: .libraryDirectory, in: .userDomainMask).first?.appendingPathComponent("Colors/\(title).clr") {
    do {
        try colorList.write(to: path)
        print("Successfully created color list file at \(path)")

        // Reveal the file in Finder
        NSWorkspace.shared.activateFileViewerSelecting([path])

        // Play the sound using afplay
        let soundUrl = URL(fileURLWithPath: "/System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/acknowledgment_sent.caf")
        let soundPath = soundUrl.path
        let task = Process()
        task.launchPath = "/usr/bin/afplay"
        task.arguments = [soundPath]
        task.launch()
        task.waitUntilExit()
    } catch {
        print("Error saving color list to disk: \(error.localizedDescription)")
    }
}

// Extension to extract query parameter values from a URL
extension URL {
    func valueOf(_ key: String) -> String? {
        guard let components = URLComponents(url: self, resolvingAgainstBaseURL: false),
              let value = components.queryItems?.first(where: { $0.name == key })?.value else {
            return nil
        }
        return value
    }
}

// Extension to convert a string representation of a color to an NSColor object
extension NSColor {
    convenience init?(from string: String) {
        if string.starts(with: "#") || string.range(of: #"^[0-9a-fA-F]{3,6}$"#, options: .regularExpression) != nil {
            // Parse hex color value
            var hexString = string.trimmingCharacters(in: .whitespacesAndNewlines)
            hexString = hexString.replacingOccurrences(of: "#", with: "")
            if hexString.count == 3 {
                // Expand 3-character hex code to 6 characters
                hexString = hexString.map { String(repeating: $0, count: 2) }.joined()
            }
            let scanner = Scanner(string: hexString)
            var hexNumber: UInt64 = 0
            if scanner.scanHexInt64(&hexNumber) {
                let red = CGFloat((hexNumber & 0xFF0000) >> 16) / 255.0
                let green = CGFloat((hexNumber & 0xFF00) >> 8) / 255.0
                let blue = CGFloat(hexNumber & 0xFF) / 255.0
                self.init(red: red, green: green, blue: blue, alpha: 1.0)
                return
            }
        } else if string.starts(with: "rgba(") && string.hasSuffix(")") {
            // Parse rgba color value
            var components = string.replacingOccurrences(of: "rgba(", with: "")
            components = components.replacingOccurrences(of: ")", with: "")
            let values = components.components(separatedBy: ",")
            if values.count == 4,
               let red = Float(values[0].trimmingCharacters(in: .whitespaces)),
               let green = Float(values[1].trimmingCharacters(in: .whitespaces)),
               let blue = Float(values[2].trimmingCharacters(in: .whitespaces)),
               let alpha = Float(values[3].trimmingCharacters(in: .whitespaces)) {
                self.init(red: CGFloat(red), green: CGFloat(green), blue: CGFloat(blue), alpha: CGFloat(alpha))
                return
            }
        } else if let color = NSColorList(name: "System").color(withKey: string) {
            // Parse named color value
            self.init(cgColor: color.cgColor)
            return
        }

        // Failed to parse color value
        return nil
    }
}
