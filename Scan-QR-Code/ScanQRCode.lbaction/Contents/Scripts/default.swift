#!/usr/bin/env swift

/*
Scan QR Code Action for LaunchBar
by Christian Bender (@ptujec)
2025-03-07

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

import Cocoa
import Vision

struct Environment {
    static let info = ProcessInfo.processInfo.environment
    static let isCommandKeyPressed = info["LB_OPTION_COMMAND_KEY"] == "1"
}

enum QRContent {
    case url(String)
    case wifi(ssid: String, password: String)
    case text(String)

    init(_ content: String) {
        if content.hasPrefix("WIFI:") {
            let fields = Dictionary(
                content.dropFirst(5).components(separatedBy: ";")
                    .compactMap { component -> (String, String)? in
                        let parts = component.split(separator: ":", maxSplits: 1)
                        guard parts.count == 2 else { return nil }
                        return (String(parts[0]), String(parts[1]).removingPercentEncoding ?? "")
                    },
                uniquingKeysWith: { $1 }
            )
            self = .wifi(ssid: fields["S"] ?? "", password: fields["P"] ?? "")
        } else if content.hasPrefix("http") && URL(string: content) != nil {
            self = .url(content)
        } else {
            self = .text(content)
        }
    }

    var notification: (text: String, callback: String?) {
        switch self {
        case let .url(url):
            return ("\(url)\nClick to open!", url)
        case let .wifi(ssid, password):
            return ("WiFi Network: \(ssid)\nPassword: \(password)\nCopied! Click to open Network Settings!",
                    "x-apple.systempreferences:com.apple.preference.network")
        case let .text(content):
            return (content, nil)
        }
    }

    var clipboardText: String {
        switch self {
        case let .wifi(_, password): password
        case let .url(url): url
        case let .text(content): content
        }
    }
}

func takeScreenshot() -> URL? {
    let tempPath = (NSTemporaryDirectory() as NSString).appendingPathComponent("qr_screenshot.png")
    let task = Process()
    task.executableURL = URL(fileURLWithPath: "/usr/sbin/screencapture")
    task.arguments = Environment.isCommandKeyPressed ? [tempPath] : ["-i", tempPath]
    try? task.run()
    task.waitUntilExit()
    return URL(fileURLWithPath: tempPath)
}

func scanQRCode(from image: NSImage) -> String? {
    guard let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else { return nil }
    let request = VNDetectBarcodesRequest()
    try? VNImageRequestHandler(cgImage: cgImage).perform([request])
    return request.results?.first?.payloadStringValue
}

func notify(_ text: String, callback: String? = nil) {
    let script = NSAppleScript(source: """
    tell application "LaunchBar"
        display in notification center "\(text)" with title "QR Code Content" \
        \(callback.map { "callback URL \"\($0)\"" } ?? "")
    end tell
    """)
    script?.executeAndReturnError(nil)
}

// MARK: Main execution

if let screenshotURL = takeScreenshot() {
    if let image = NSImage(contentsOf: screenshotURL) {
        if let qrContent = scanQRCode(from: image) {
            let content = QRContent(qrContent)
            NSPasteboard.general.clearContents()
            NSPasteboard.general.setString(content.clipboardText, forType: .string)

            let notification = content.notification
            notify(notification.text, callback: notification.callback)
        } else {
            notify("No QR code found in the selected area!")
        }
    } else {
        notify("Failed to process screenshot!")
    }
    try? FileManager.default.removeItem(at: screenshotURL)
}
