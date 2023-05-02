#!/usr/bin/env swift

import AppKit
import Foundation

let urlString = CommandLine.arguments[1]

// Example input URL
// let urlString = "x-launchbar:action/ptujec.LaunchBar.action.ColorPaletteFromWebsite?title=nova_app&colors=I2U2NTE2ZTsjZmZhODQ0OyNmZjk4NDI7I2ZlODgzZjsjZmQ3ODNjOyNmYzY4M2E7I2ZiNTgzNzsjZjk0OTM1OyNmYTNmMzY7I2ZlM2EzYjsjZmYzNDQwOyNmZjMwNDU7I2ZmMmM0YTsjZmYyOTRmOyNmZjI3NTU7I2ZmMmE2NDsjZmYyYzc0OyNmZjMwODM7I2ZkMzU5MzsjZjkzYWEyOyNmNTNmYjI7I2UyNDhjMDsjYzA1M2NjOyM5ZTYwZDk7IzdkNmVlNjsjNWU3Y2YyOyM0MjhhZmY7I2IyYjJiMjsjODg4ODg4OyMwODBmMjQ7IzA2MGIxYjsjZWEzMzI5OyNlYjZhMmM7I2YyOWMzODsjZmZkMzIxOyM3NWZiNGM7IzAwZjBmZjsjMEM4Q0ZFOyMwMDNiNmU7I2U1MzJhZDsjOTcwMDU2OyMyYjBjNWM7IzNkMTQ3ZjsjODQwMGZmOyNmZjAzNGE7I2ZlYTsjZjJmMmYyOyMyZjMwMzM7I2VjZWNlYzsjZGViO3JnYmEoMCwwLDAsMC41KTtyZ2JhKDAsMCwwLDAuOCk7cmdiYSgwLDAsMCwxKTtyZ2JhKDAsMCwwLDApO3JnYmEoMCwwLDAsMC43NSk="

// Parse the input URL
if let url = URL(string: urlString),
   let title = url.valueOf("title"),
   let colorsString = url.valueOf("colors") {
    // Decode the base64-encoded colors string
    if let decodedData = Data(base64Encoded: colorsString),
       let colorsString = String(data: decodedData, encoding: .utf8) {
        // Split the comma-separated list of color values
        let colorValues = colorsString.components(separatedBy: ";")

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
            } catch {
                print("Error saving color list to disk: \(error.localizedDescription)")
            }
        }

    } else {
        print("Error decoding colors string")
    }

} else {
    print("Invalid input URL")
}// Parse the input URL
if let url = URL(string: urlString),
   let title = url.valueOf("title"),
   let colorsString = url.valueOf("colors") {
    // Decode the base64-encoded colors string
    if let decodedData = Data(base64Encoded: colorsString),
       let colorsString = String(data: decodedData, encoding: .utf8) {
        // Split the comma-separated list of color values
        let colorValues = colorsString.components(separatedBy: ";")

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

    } else {
        print("Error decoding colors string")
    }

} else {
    print("Invalid input URL")
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
        if string.starts(with: "#") {
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