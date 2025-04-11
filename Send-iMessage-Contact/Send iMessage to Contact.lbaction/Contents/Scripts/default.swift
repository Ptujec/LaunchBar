#!/usr/bin/env swift

/*
 Send iMessage to Contact Action for LaunchBar
 by Christian Bender (@ptujec)
 2025-01-02

 Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

 Sources:
 - https://developer.apple.com/documentation/contacts
 - https://stackoverflow.com/questions/37039103/how-to-fetch-only-mobile-numbers-in-swift-using-cncontacts

 TODO: 
 - error message when no contact info found 
 */

import AppKit
import Contacts
import Foundation

// MARK: - Localization

struct LocalizedStrings {
    private static let lang = Locale.preferredLanguages[0].components(separatedBy: "-")[0]
    
    static let contactAccessDenied = lang == "de" 
        ? "Kontaktzugriff verweigert!" 
        : "Contact Access Denied"
    static let contactAccessRequired = lang == "de"
        ? "Kontaktzugriff erforderlich!"
        : "Contact Access Required"
    static let contactAccessSubtitle = lang == "de"
        ? "Systemeinstellungen → Datenschutz & Sicherheit → Kontakte\n(Klicken zum Öffnen!)"
        : "System Settings → Privacy & Security → Contacts\n(Click to open!)"
    static let noContactFound = lang == "de"
        ? "Kontakt nicht gefunden"
        : "Contact Not Found"
    static let noContactInfo = lang == "de"
        ? "Keine Kontaktinformationen verfügbar"
        : "No Contact Information Available"
}

// MARK: - AppleScript Helpers

func executeAppleScript(_ source: String) {
    if let scriptObject = NSAppleScript(source: source) {
        var error: NSDictionary?
        scriptObject.executeAndReturnError(&error)
    }
}

func showLaunchBarNotification(title: String, message: String, callbackURL: String? = nil) {
    var script = """
        tell application "LaunchBar"
            display in notification center "\(message)" with title "\(title)"
        """
    
    if let url = callbackURL {
        script += " callback URL \"\(url)\""
    }
    
    script += "\nend tell"
    executeAppleScript(script)
}

// MARK: - Contact Management

final class ContactManager {
    private let store = CNContactStore()
    private let keysToFetch = [
        CNContactGivenNameKey,
        CNContactFamilyNameKey,
        CNContactNicknameKey,
        CNContactOrganizationNameKey,
        CNContactPhoneNumbersKey,
        CNContactEmailAddressesKey
    ] as [CNKeyDescriptor]
    
    func messageContact(name: String) async throws {
        let contacts = try fetchContacts(matching: name)
        guard !contacts.isEmpty else {
            showLaunchBarNotification(
                title: LocalizedStrings.noContactFound,
                message: name
            )
            return
        }
        
        let contact = findBestMatch(name, contacts)
        guard let contactInfo = extractContactInfo(from: contact) else {
            showLaunchBarNotification(
                title: LocalizedStrings.noContactInfo,
                message: "\(contact.givenName) \(contact.familyName)".trimmingCharacters(in: .whitespaces)
            )
            return
        }
        
        try await sendMessage(to: contactInfo)
    }
    
    private func findBestMatch(_ query: String, _ contacts: [CNContact]) -> CNContact {
        if contacts.count == 1 { return contacts[0] }
        
        let query = query.lowercased()
        return contacts.max { a, b in
            let aScore = matchScore(for: a, query: query)
            let bScore = matchScore(for: b, query: query)
            return aScore < bScore
        } ?? contacts[0]
    }
    
    private func matchScore(for contact: CNContact, query: String) -> Int {
        let fields = [
            (contact.givenName.lowercased(), 40),
            (contact.familyName.lowercased(), 30),
            (contact.nickname.lowercased(), 45),
            (contact.organizationName.lowercased(), 35),
            ("\(contact.givenName) \(contact.familyName)".lowercased(), 50)
        ]
        
        var score = fields.reduce(0) { total, field in
            if field.0.isEmpty { return total }
            if field.0 == query { return total + field.1 + 50 }  // Bonus for exact match
            if field.0.contains(query) || query.contains(field.0) { return total + field.1 }
            return total
        }
        
        // Phone number quality
        if contact.phoneNumbers.contains(where: { ($0.label ?? "").contains("Mobil") || ($0.label ?? "").contains("iPhone") }) {
            score += 20
        }
        
        return score
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
                        return num.value.stringValue.replacingOccurrences(of: #"\s+"#, with: "", options: .regularExpression)
                    }
                }
            }
            return contact.phoneNumbers[0].value.stringValue.replacingOccurrences(of: #"\s+"#, with: "", options: .regularExpression)
        }
        
        // Fall back to email
        if !contact.emailAddresses.isEmpty {
            return contact.emailAddresses[0].value as String
        }
        
        return nil
    }
    
    private func sendMessage(to contactInfo: String) async throws {
        let messageURL = "imessage://" + contactInfo
        guard let url = URL(string: messageURL) else { return }
        NSWorkspace.shared.open(url)
    }
}

// MARK: - Main Action

struct MessageContactAction {
    static func main() async throws {
        // Check authorization
        let status = CNContactStore.authorizationStatus(for: .contacts)
        let settingsURL = "x-apple.systempreferences:com.apple.preference.security?Privacy_Contacts"
        
        if status == .notDetermined {
            let store = CNContactStore()
            guard try await store.requestAccess(for: .contacts) else {
                showLaunchBarNotification(
                    title: LocalizedStrings.contactAccessDenied,
                    message: LocalizedStrings.contactAccessSubtitle,
                    callbackURL: settingsURL
                )
                return
            }
        }
        
        guard status == .authorized else {
            showLaunchBarNotification(
                title: LocalizedStrings.contactAccessRequired,
                message: LocalizedStrings.contactAccessSubtitle,
                callbackURL: settingsURL
            )
            return
        }
        
        // Hide LaunchBar
        executeAppleScript("tell application \"LaunchBar\" to hide")
        
        // Process arguments
        let arguments = Array(CommandLine.arguments.dropFirst())
        guard let name = arguments.first else { return }
        
        // Send the message
        let manager = ContactManager()
        try await manager.messageContact(name: name)
    }
}

// MARK: - Script Execution

let semaphore = DispatchSemaphore(value: 0)

Task {
    do {
        try await MessageContactAction.main()
    } catch {
        NSLog("Error: \(error.localizedDescription)")
    }
     semaphore.signal()

}

semaphore.wait()