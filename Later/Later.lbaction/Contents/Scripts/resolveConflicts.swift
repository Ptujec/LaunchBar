#!/usr/bin/env swift

import Foundation

// Check if a file path was provided
guard CommandLine.arguments.count > 1 else {
    print("ERROR: No file path provided")
    exit(1)
}

let filePath = CommandLine.arguments[1]
let url = URL(fileURLWithPath: filePath)

// Check if file exists
guard FileManager.default.fileExists(atPath: filePath) else {
    print("NOT_DOWNLOADED")
    exit(0)
}

// Get resource values for the file
do {
    let resourceValues = try url.resourceValues(forKeys: [.ubiquitousItemHasUnresolvedConflictsKey])
    
    // Check for conflicts
    if let hasConflicts = resourceValues.ubiquitousItemHasUnresolvedConflicts, hasConflicts {
        // STEP 1: Collect and merge all data first
        var allItems: [[String: Any]] = []
        var seenURLs: Set<String> = []
        
        // Get all versions including conflicts
        var allVersionURLs = [url] // Include current version
        
        // Add conflict versions if any exist
        if let versions = NSFileVersion.unresolvedConflictVersionsOfItem(at: url) {
            for version in versions {
                let versionURL = version.url
                allVersionURLs.append(versionURL)
            }
        }
        
        // Also check the conflict versions directory for any additional versions
        let fm = FileManager.default
        let conflictVersionsURL = try fm.url(for: .itemReplacementDirectory, in: .userDomainMask, appropriateFor: url, create: true)
        if let enumerator = fm.enumerator(at: conflictVersionsURL, includingPropertiesForKeys: nil) {
            for case let versionURL as URL in enumerator {
                if versionURL.pathExtension == "json" {
                    allVersionURLs.append(versionURL)
                }
            }
        }
        
        // Read data from all versions
        for versionURL in allVersionURLs {
            if let data = try? Data(contentsOf: versionURL),
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let items = json["data"] as? [[String: Any]] {
                
                // Add only unique items
                for item in items {
                    if let url = item["url"] as? String,
                       !seenURLs.contains(url) {
                        allItems.append(item)
                        seenURLs.insert(url)
                    }
                }
            }
        }
        
        // Sort all collected items by dateAdded
        allItems.sort { item1, item2 in
            guard let date1 = item1["dateAdded"] as? String,
                  let date2 = item2["dateAdded"] as? String else {
                return false
            }
            return date1 < date2
        }
        
        // STEP 2: Force resolve the conflict by removing current version
        try fm.removeItem(at: url)
        
        // STEP 3: Create our merged version
        var mergedData: [String: Any] = [
            "data": allItems,
            "source": "launchbar"
        ]
        
        // Set current timestamp in the correct format
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
        mergedData["edited"] = dateFormatter.string(from: Date())
        
        // Write our merged data
        let jsonData = try JSONSerialization.data(withJSONObject: mergedData, options: .prettyPrinted)
        try jsonData.write(to: url, options: .atomic)
        
        // Clean up conflict versions
        if let versions = NSFileVersion.unresolvedConflictVersionsOfItem(at: url) {
            for version in versions {
                try? version.remove()
            }
        }
        if let enumerator = fm.enumerator(at: conflictVersionsURL, includingPropertiesForKeys: nil) {
            for case let versionURL as URL in enumerator {
                if versionURL.pathExtension == "json" {
                    try? fm.removeItem(at: versionURL)
                }
            }
        }
        
        print("MERGED")
        exit(0)
    }
    
    // If no conflicts found
    print("NO_CONFLICTS")
    
} catch {
    print("ERROR: \(error.localizedDescription)")
    exit(1)
}
