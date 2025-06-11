#!/usr/bin/env swift

import Foundation

// Read the plist file
if let plistPath = NSString(string: "~/Library/Preferences/app.soulver.mac.plist").expandingTildeInPath as String?,
   let plistData = try? Data(contentsOf: URL(fileURLWithPath: plistPath)),
   let plist = try? PropertyListSerialization.propertyList(from: plistData, options: [], format: nil) as? [String: Any],
   let bookmarkData = plist["NSOSPLastRootDirectory"] as? Data {
    
    do {
        var isStale = false
        // Resolve the bookmark data to a URL without security scope
        // This is important since we're just reading the path
        let url = try URL(resolvingBookmarkData: bookmarkData,
                         options: [],  // Remove security scope option
                         relativeTo: nil,
                         bookmarkDataIsStale: &isStale)
        
        // Print the resolved path
        print("\(url.path)")
        
        if isStale {
            print("Warning: Bookmark data is stale")
        }
    } catch {
        print("Error resolving bookmark: \(error)")
    }
} else {
    print("Could not read or parse plist file")
}