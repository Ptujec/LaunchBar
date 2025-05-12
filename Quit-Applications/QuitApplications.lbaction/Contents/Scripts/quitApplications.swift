#!/usr/bin/swift

/*
  Quit Applications (by Context) Action for LaunchBar
  by Christian Bender (@ptujec)
  2025-05-12

  Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

import Foundation
import AppKit

// MARK: - QuitApplicationsManager Class

class QuitApplicationsManager {
    private let exclusions: [String]
    private let keepCurrent: Bool
    private let keepFinderWindows: Bool
    
    init(exclusions: [String], keepCurrent: Bool = true, keepFinderWindows: Bool = true) {
        self.exclusions = exclusions
        self.keepCurrent = keepCurrent
        self.keepFinderWindows = keepFinderWindows
    }
    
    func getRunningApps() -> [NSRunningApplication] {
        let workspace = NSWorkspace.shared
        return workspace.runningApplications.filter { app in
            // Filter out background-only apps
            guard app.activationPolicy == .regular else { return false }
            
            guard let bundleId = app.bundleIdentifier else { return false }
            if exclusions.contains(bundleId) { return false }
            if keepCurrent && app.isActive { return false }
            return true
        }
    }
    
    func getFinderWindowCount() -> Int {
        guard let finder = NSWorkspace.shared.runningApplications.first(where: { $0.bundleIdentifier == "com.apple.finder" }) else {
            return 0
        }
        
        let finderElement = AXUIElementCreateApplication(finder.processIdentifier)
        var value: AnyObject?
        let result = AXUIElementCopyAttributeValue(finderElement, kAXWindowsAttribute as CFString, &value)
        
        if result == .success, let windows = value as? [AXUIElement] {
            return windows.filter { window in
                var valuePtr: AnyObject?
                
                AXUIElementCopyAttributeValue(window, kAXRoleAttribute as CFString, &valuePtr)
                let role = (valuePtr as? String) ?? ""
                
                AXUIElementCopyAttributeValue(window, kAXSubroleAttribute as CFString, &valuePtr)
                let subrole = (valuePtr as? String) ?? ""
                
                return role == "AXWindow" && subrole == "AXStandardWindow"
            }.count
        }
        return 0
    }
    
    func closeFinderWindows() {
        let script = "tell application \"Finder\" to close every window"
        
        var error: NSDictionary?
        if let scriptObject = NSAppleScript(source: script) {
            scriptObject.executeAndReturnError(&error)
        }
    }
    
    // MARK: - Main Functionality
    
    func quitApplications(listOnly: Bool = false) -> (appsToQuit: [String], finderWindowCount: Int) {
        let runningApps = getRunningApps()
        let finderWindowCount = keepFinderWindows ? 0 : getFinderWindowCount()
        
        let appsToQuit = runningApps.compactMap { app -> String? in
            return app.localizedName
        }
        
        if !listOnly {
            for app in runningApps {
                app.terminate()
            }
            
            if !keepFinderWindows {
                closeFinderWindows()
            }
        }
        
        return (appsToQuit, finderWindowCount)
    }
}

// MARK: - Arguments Parsing

let args = CommandLine.arguments
guard args.count > 1 else {
    print("Usage: quitApplications.swift <exclusions> [keepCurrent] [keepFinderWindows] [listOnly]") 
    exit(1)
}

let exclusions = args[1].split(separator: ",").map(String.init)
let keepCurrent = args.count > 2 ? args[2].lowercased() == "true" : true
let keepFinderWindows = args.count > 3 ? args[3].lowercased() == "true" : true
let listOnly = args.count > 4 ? args[4].lowercased() == "true" : false

let manager = QuitApplicationsManager(
    exclusions: exclusions,
    keepCurrent: keepCurrent,
    keepFinderWindows: keepFinderWindows
)

let result = manager.quitApplications(listOnly: listOnly)
let output = [
    result.appsToQuit.joined(separator: ", "),
    String(result.finderWindowCount)
].joined(separator: "|")
print(output) 