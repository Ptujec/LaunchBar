#!/usr/bin/env swift

import Foundation

// MARK: - Logging

let logPath = "/tmp/ia-writer-search.log"

func log(_ message: String) {
    let timestamp = ISO8601DateFormatter().string(from: Date())
    let logEntry = "[\(timestamp)] \(message)\n"

    // Append to log file
    if FileManager.default.fileExists(atPath: logPath) {
        if let fileHandle = try? FileHandle(forWritingTo: URL(fileURLWithPath: logPath)) {
            fileHandle.seekToEndOfFile()
            if let data = logEntry.data(using: .utf8) {
                fileHandle.write(data)
            }
            try? fileHandle.close()
        }
    } else {
        try? logEntry.write(toFile: logPath, atomically: true, encoding: .utf8)
    }

    // Also print to stderr
    fputs(message + "\n", stderr)
}

/// Resolve bookmark data to a filesystem path
/// - Parameter data: Bookmark data from plist
/// - Returns: Filesystem path or nil on failure
func resolveBookmark(_ data: Data) -> String? {
    log("🔖 Attempting to resolve bookmark...")
    log("   Bookmark size: \(data.count) bytes")

    var isStale: ObjCBool = false

    do {
        let url = try NSURL(resolvingBookmarkData: data,
                            options: .withoutUI,
                            relativeTo: nil,
                            bookmarkDataIsStale: &isStale) as URL

        log("   ✅ Resolved bookmark to: \(url.path)")
        log("   ⚠️  Is stale: \(isStale)")

        return url.path
    } catch {
        log("   ❌ Failed to resolve bookmark: \(error.localizedDescription)")
        return nil
    }
}

/// Get the default folder from iA Writer preferences
/// - Returns: Folder path or empty string on failure
func getDefaultFolder() -> String {
    log("📂 Getting default folder from iA Writer preferences...")

    let homeDir = FileManager.default.homeDirectoryForCurrentUser.path
    let plistPath = homeDir + "/Library/Containers/pro.writer.mac/Data/Library/Preferences/pro.writer.mac.plist"

    log("   Checking plist: \(plistPath)")

    guard FileManager.default.fileExists(atPath: plistPath) else {
        log("   ❌ plist file does not exist")
        return ""
    }

    log("   ✅ plist file found")

    guard let plist = NSDictionary(contentsOfFile: plistPath) else {
        log("   ❌ Failed to read plist file")
        return ""
    }

    log("   ✅ plist loaded, has \(plist.count) keys")

    guard let bookmarkData = plist["NSOSPLastRootDirectory"] as? Data else {
        log("   ❌ 'NSOSPLastRootDirectory' key not found or not binary data")
        if let val = plist["NSOSPLastRootDirectory"] {
            log("   📋 Found key but type is: \(type(of: val))")
        }
        return ""
    }

    log("   ✅ Found bookmark data (\(bookmarkData.count) bytes)")

    guard let folderPath = resolveBookmark(bookmarkData) else {
        log("   ❌ Failed to resolve bookmark")
        return ""
    }

    var isDir: ObjCBool = false
    guard FileManager.default.fileExists(atPath: folderPath, isDirectory: &isDir) else {
        log("   ❌ Resolved path does not exist: \(folderPath)")
        return ""
    }

    guard isDir.boolValue else {
        log("   ❌ Path exists but is not a directory: \(folderPath)")
        return ""
    }

    log("   ✅ Folder is valid and readable: \(folderPath)")
    return folderPath
}

// MARK: - Main

log("🚀 Starting iA Writer Search bookmark resolver")
log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

let folderPath = getDefaultFolder()

if !folderPath.isEmpty {
    log("✅ SUCCESS: Found folder path")
    print(folderPath)
    exit(0)
} else {
    log("❌ FAILED: No valid folder path found")
    log("📝 Full log available at: \(logPath)")
    exit(1)
}
