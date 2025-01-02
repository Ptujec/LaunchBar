#!/usr/bin/env swift

/*
 Send iMessage to Contact Action for LaunchBar
 by Christian Bender (@ptujec)
 2025-01-02

 Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

 Sources:
 - https://developer.apple.com/documentation/contacts
 - https://stackoverflow.com/questions/37039103/how-to-fetch-only-mobile-numbers-in-swift-using-cncontacts
 */

import AppKit
import Contacts
import Foundation

// MARK: - Localization

struct LocalizedStrings {
    private static let lang = Locale.preferredLanguages[0].components(separatedBy: "-")[0]
    
    static let contactAccessDenied = lang == "de" 
        ? "Kontaktzugriff verweigert (⏎)" 
        : "Contact Access Denied (⏎)"
    static let contactAccessRequired = lang == "de"
        ? "Kontaktzugriff erforderlich (⏎)"
        : "Contact Access Required (⏎)"
    static let contactAccessSubtitle = lang == "de"
        ? "Systemeinstellungen → Datenschutz & Sicherheit → Kontakte"
        : "System Settings → Privacy & Security → Contacts"
}

// MARK: - Contact Management

final class ContactManager {
    private let store = CNContactStore()
    private let keysToFetch = [CNContactGivenNameKey, CNContactFamilyNameKey, CNContactPhoneNumbersKey, CNContactEmailAddressesKey] as [CNKeyDescriptor]
    
    func messageContact(name: String) async throws {
        let contacts = try fetchContacts(matching: name)
        guard let contact = contacts.first else { return }
        
        if let contactInfo = extractContactInfo(from: contact) {
            try await sendMessage(to: contactInfo)
        }
    }
    
    private func fetchContacts(matching name: String) throws -> [CNContact] {
        let predicate = CNContact.predicateForContacts(matchingName: name)
        return try store.unifiedContacts(matching: predicate, keysToFetch: keysToFetch)
    }
    
    private func extractContactInfo(from contact: CNContact) -> String? {
        // Try to get phone number first
        if !contact.phoneNumbers.isEmpty {
            if contact.phoneNumbers.count > 1 {
                for num in contact.phoneNumbers {
                    if let label = num.label, (label.contains("Mobil") || label.contains("iPhone")) {
                        return num.value.stringValue
                    }
                }
            }
            return contact.phoneNumbers[0].value.stringValue
        }
        
        // Fall back to email
        if !contact.emailAddresses.isEmpty {
            return contact.emailAddresses[0].value as String
        }
        
        return nil
    }
    
    private func sendMessage(to contactInfo: String) async throws {
        let cleanedInfo = contactInfo.replacingOccurrences(
            of: #"\s*"#,
            with: "",
            options: .regularExpression
        )
        
        let messageURL = "imessage://" + cleanedInfo
        guard let url = URL(string: messageURL) else { return }
        NSWorkspace.shared.open(url)
    }
}

// MARK: - Main Action

struct MessageContactAction {
    static func main() async throws {
        // Check authorization
        let status = CNContactStore.authorizationStatus(for: .contacts)
        
        if status == .notDetermined {
            let store = CNContactStore()
            guard try await store.requestAccess(for: .contacts) else {
                print("""
                    [{  "title": "\(LocalizedStrings.contactAccessDenied)",
                        "subtitle": "\(LocalizedStrings.contactAccessSubtitle)",
                        "alwaysShowsSubtitle": true,
                        "icon": "alert",
                        "url": "x-apple.systempreferences:com.apple.preference.security?Privacy_Contacts"}]
                    """)
                return
            }
        }
        
        guard status == .authorized else {
            print("""
                [{  "title": "\(LocalizedStrings.contactAccessRequired)",
                    "subtitle": "\(LocalizedStrings.contactAccessSubtitle)",
                    "alwaysShowsSubtitle": true,
                    "icon": "alert",
                    "url": "x-apple.systempreferences:com.apple.preference.security?Privacy_Contacts"}]
                """)
            return
        }
        
        // Hide LaunchBar
        NSAppleScript(source: "tell application \"LaunchBar\" to hide")?.executeAndReturnError(nil)
        
        // Process arguments
        let arguments = Array(CommandLine.arguments.dropFirst())
        guard let name = arguments.first else { return }
        
        // Send the message
        let manager = ContactManager()
        try await manager.messageContact(name: name)
    }
}

// MARK: - Script Execution

var isComplete = false

Task {
    do {
        try await MessageContactAction.main()
    } catch {
        NSLog("Error: \(error.localizedDescription)")
    }
    isComplete = true
}

while !isComplete {
    RunLoop.current.run(mode: .default, before: Date(timeIntervalSinceNow: 0.1))
}
