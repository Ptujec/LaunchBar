#!/usr/bin/env swift

/*
 Recent Messages Action for LaunchBar
 by Christian Bender (@ptujec)
 2025-04-10

 Documentation and sources:
 - https://chrissardegna.com/blog/reverse-engineering-apples-typedstream-format/
 
 Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

 TODO:
 - fix group chats that have a name (the url creats a new group chat) … not sure I can fix this
 - link to service messages possible?

 - clean up unused code
 */

import Contacts
import Foundation
import SQLite3

// MARK: - Environment

struct Environment {
    static let info = ProcessInfo.processInfo.environment
    static let supportPath = info["LB_SUPPORT_PATH"] ?? ""
    static let preferencesPath = "\(supportPath)/Preferences.plist"
    static let isCommandKeyPressed = info["LB_OPTION_COMMAND_KEY"] == "1"
}

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
    static let notSent = lang == "de"
        ? "Senden der Nachricht fehlgeschlagen"
        : "Failed to send message"
    static let sending = lang == "de"
        ? "Wird gesendet..."
        : "Sending..."
    static let you = lang == "de"
        ? "Du"
        : "You"
    static let audioMessage = lang == "de"
        ? "(Audionachricht)"
        : "(Audio Message)"
    static let attachment = lang == "de"
        ? "(Anhang)"
        : "(Attachment)"
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

// MARK: - Attributed Body Decoder

struct AttributedBodyDecoder {
    private static let HEADER_SIGNATURE = "streamtyped"
    private static let HEADER_VERSION: UInt64 = 4
    private static let SYSTEM_VERSION: Int64 = 1000

    private static let START: UInt8 = 0x84
    private static let END: UInt8 = 0x86
    private static let I_16: UInt8 = 0x81
    private static let I_32: UInt8 = 0x82
    private static let DICT_MARKER: UInt8 = 0x96
    private static let STRING_MARKER: UInt8 = 0x92

    static func decodeAttributedBody(_ hexString: String, isAudioMessage: Bool = false) -> String? {
        // Convert hex string to bytes
        let cleanHex = hexString.replacingOccurrences(of: "^(0x|X')|'$", with: "", options: .regularExpression)
        guard cleanHex.count >= 4 else { return nil }

        let bytes = stride(from: 0, to: cleanHex.count, by: 2).compactMap { i in
            let start = cleanHex.index(cleanHex.startIndex, offsetBy: i)
            let end = cleanHex.index(start, offsetBy: 2, limitedBy: cleanHex.endIndex) ?? cleanHex.endIndex
            return UInt8(cleanHex[start ..< end], radix: 16)
        }

        // Validate header
        var index = 0
        guard let version = readUnsignedInt(from: bytes, at: &index),
              version == HEADER_VERSION,
              let signature = readString(from: bytes, at: &index),
              signature == HEADER_SIGNATURE,
              let systemVersion = readSignedInt(from: bytes, at: &index),
              systemVersion == SYSTEM_VERSION else {
            return nil
        }

        if isAudioMessage {
            return findAudioTranscription(in: bytes, startingAt: index)
        }

        return findRegularMessage(in: bytes, startingAt: index)
    }

    private static func findAudioTranscription(in bytes: [UInt8], startingAt startIndex: Int) -> String? {
        // Look for "IMAudioTranscription" marker
        let marker = "IMAudioTranscription".utf8.map { UInt8($0) }
        guard let markerIndex = search(pattern: marker, in: bytes) else {
            return nil
        }

        // Start looking for text after the marker
        var currentIndex = markerIndex + marker.count

        // Skip structural markers and find start of actual text
        while currentIndex < bytes.count {
            let byte = bytes[currentIndex]
            if byte == 0x86 || // END marker
                byte == 0x92 || // STRING marker
                byte == 0x96 || // DICT marker
                byte == 0x84 || // START marker
                byte == 0x3E || // '>' character
                byte < 32 { // Control characters
                currentIndex += 1
                continue
            }
            break
        }

        // Look for the actual text content
        var textStart = currentIndex
        var textEnd = currentIndex
        var foundText = false
        var inUtf8Sequence = false
        var utf8BytesNeeded = 0
        var inQuote = false

        while textEnd < bytes.count {
            let byte = bytes[textEnd]

            if !inUtf8Sequence {
                if byte == 0x86 { // END marker
                    if foundText {
                        break
                    }
                    textStart = textEnd + 1
                } else if byte == 0xE2 && textEnd + 2 < bytes.count &&
                    bytes[textEnd + 1] == 0x80 &&
                    (bytes[textEnd + 2] == 0x9C || bytes[textEnd + 2] == 0x9D) { // Smart quotes
                    inQuote = !inQuote
                    foundText = true
                    textEnd += 2
                } else if byte >= 0xC0 { // Start of UTF-8 sequence
                    inUtf8Sequence = true
                    foundText = true
                    if byte >= 0xF0 { // 4 bytes
                        utf8BytesNeeded = 3
                    } else if byte >= 0xE0 { // 3 bytes
                        utf8BytesNeeded = 2
                    } else { // 2 bytes
                        utf8BytesNeeded = 1
                    }
                } else if byte >= 32 && byte <= 126 { // ASCII printable
                    foundText = true
                } else if foundText {
                    break
                } else {
                    textStart = textEnd + 1
                }
            } else {
                utf8BytesNeeded -= 1
                if utf8BytesNeeded == 0 {
                    inUtf8Sequence = false
                }
            }

            textEnd += 1
        }

        if foundText && textEnd > textStart {
            let content = Array(bytes[textStart ..< textEnd])
            if let text = String(bytes: content, encoding: .utf8),
               !text.isEmpty,
               !text.contains("IMFileTransferGUID"),
               !text.contains("IMMessagePart"),
               !text.contains("IMBase") {
                return text.trimmingCharacters(in: .whitespacesAndNewlines)
            }
        }

        return nil
    }

    private static func readUnsignedInt(from bytes: [UInt8], at index: inout Int) -> UInt64? {
        guard index < bytes.count else { return nil }

        // Handle different integer sizes based on markers
        switch bytes[index] {
        case 0x81: // 16-bit integer
            index += 1
            guard index + 2 <= bytes.count else { return nil }
            let value = UInt16(bytes[index]) | (UInt16(bytes[index + 1]) << 8)
            index += 2
            return UInt64(value)

        case 0x82: // 32-bit integer
            index += 1
            guard index + 4 <= bytes.count else { return nil }
            let value = UInt32(bytes[index]) | (UInt32(bytes[index + 1]) << 8) |
                (UInt32(bytes[index + 2]) << 16) | (UInt32(bytes[index + 3]) << 24)
            index += 4
            return UInt64(value)

        default: // 8-bit integer
            let value = bytes[index]
            index += 1
            return UInt64(value)
        }
    }

    private static func readSignedInt(from bytes: [UInt8], at index: inout Int) -> Int64? {
        guard let unsigned = readUnsignedInt(from: bytes, at: &index) else { return nil }
        return Int64(bitPattern: UInt64(unsigned))
    }

    private static func readString(from bytes: [UInt8], at index: inout Int) -> String? {
        guard let length = readUnsignedInt(from: bytes, at: &index) else { return nil }
        return readExactString(from: bytes, at: &index, length: Int(length))
    }

    private static func readExactString(from bytes: [UInt8], at index: inout Int, length: Int) -> String? {
        guard index + length <= bytes.count else { return nil }

        let stringBytes = Array(bytes[index ..< (index + length)])
        index += length

        // Filter out control characters and verify string is valid UTF-8
        let filtered = stringBytes.filter { $0 >= 32 || $0 == 9 || $0 == 10 || $0 == 13 }
        return String(bytes: filtered, encoding: .utf8)
    }

    private static func findRegularMessage(in bytes: [UInt8], startingAt index: Int) -> String? {
        // Look for NSMutableString/NSString marker
        var startIndex = -1
        var foundString = false

        for i in index ..< bytes.count {
            // Look for NSMutableString or NSString class markers
            if bytes[i] == 0x2B { // '+' character in typedstream format
                startIndex = i + 1
                foundString = true
                break
            }

            // Also check for string content after NSMutableAttributedString
            if i + 3 < bytes.count &&
                bytes[i] == 0x81 && // Length marker
                bytes[i + 1] <= 0x7F { // Reasonable length
                startIndex = i + 2
                foundString = true
                break
            }
        }

        guard foundString, startIndex != -1 else {
            return nil
        }

        // Find end pattern (0x86 - END marker in typedstream)
        var endIndex = startIndex
        while endIndex < bytes.count && bytes[endIndex] != 0x86 {
            endIndex += 1
        }

        guard endIndex > startIndex else {
            return nil
        }

        // Handle length indicators and skip markers
        if startIndex < bytes.count {
            var skipBytes = 0

            // Check if we have a length indicator
            if (bytes[startIndex] & 0x80) != 0 {
                skipBytes = 2
            } else if bytes[startIndex] <= 0x7F {
                skipBytes = 1
            }

            // Skip any additional markers
            let afterLength = startIndex + skipBytes
            if afterLength < endIndex {
                if bytes[afterLength] == 0x00 || bytes[afterLength] == 0x84 {
                    skipBytes += 1
                }
            }

            let adjustedStart = startIndex + skipBytes
            if adjustedStart < endIndex {
                let content = Array(bytes[adjustedStart ..< endIndex])
                if let result = String(bytes: content, encoding: .utf8),
                   !result.isEmpty,
                   !result.contains("IMFileTransferGUID"),
                   !result.contains("IMMessagePart"),
                   !result.contains("IMBase") {
                    return result.trimmingCharacters(in: .whitespacesAndNewlines)
                }
            }
        }

        // Fallback: try the entire content
        let content = Array(bytes[startIndex ..< endIndex])
        if let result = String(bytes: content, encoding: .utf8),
           !result.isEmpty,
           !result.contains("IMFileTransferGUID"),
           !result.contains("IMMessagePart"),
           !result.contains("IMBase") {
            return result.trimmingCharacters(in: .whitespacesAndNewlines)
        }

        return nil
    }

    private static func search(pattern: [UInt8], in bytes: [UInt8]) -> Int? {
        guard pattern.count <= bytes.count else { return nil }

        for i in 0 ... (bytes.count - pattern.count) {
            var found = true
            for j in 0 ..< pattern.count {
                if bytes[i + j] != pattern[j] {
                    found = false
                    break
                }
            }
            if found {
                return i
            }
        }

        return nil
    }
}

// MARK: - Contact Manager

class ContactManager {
    private let store = CNContactStore()
    private var identifierMap: [String: String] = [:] // chat_identifier -> contact_id
    private var contactDetails: [String: ContactInfo] = [:] // contact_id -> contact info
    private let cacheFile: URL
    private let cacheExpirationInterval: TimeInterval = 60 * 24 * 60 * 60 // 60 days (2 months)

    private struct ContactInfo: Codable {
        let name: String?
        let nickname: String?
        let organization: String?
        let isOrganization: Bool
        let timestamp: Date
    }

    private struct CacheData: Codable {
        var identifierMap: [String: String]
        var contactDetails: [String: ContactInfo]
    }

    // TODO: probably can be improved
    private func normalizePhoneNumber(_ number: String) -> String {
        return number
            .replacingOccurrences(of: "\\s", with: "", options: .regularExpression) // Remove all whitespace
            // .replacingOccurrences(of: "\\(0\\)", with: "", options: .regularExpression)  // Remove (0)
            .replacingOccurrences(of: "[()\\-]", with: "", options: .regularExpression) // Remove parentheses and hyphens
    }

    init() {
        // Create cache directory if it doesn't exist
        let cachePath = "\(Environment.supportPath)/Cache"
        try? FileManager.default.createDirectory(
            atPath: cachePath,
            withIntermediateDirectories: true
        )

        cacheFile = URL(fileURLWithPath: "\(cachePath)/contacts.json")

        if Environment.isCommandKeyPressed {
            try? FileManager.default.removeItem(at: cacheFile)
        }

        loadCache()
    }

    private func loadCache() {
        do {
            let data = try Data(contentsOf: cacheFile)
            let cacheData = try JSONDecoder().decode(CacheData.self, from: data)
            let now = Date()

            // Filter out expired entries and their corresponding identifiers
            contactDetails = cacheData.contactDetails.filter {
                now.timeIntervalSince($0.value.timestamp) < cacheExpirationInterval
            }

            // Only keep identifier mappings for contacts that haven't expired
            identifierMap = cacheData.identifierMap.filter {
                contactDetails.keys.contains($0.value)
            }
        } catch {
            identifierMap = [:]
            contactDetails = [:]
        }
    }

    private func saveCache() {
        do {
            let cacheData = CacheData(
                identifierMap: identifierMap,
                contactDetails: contactDetails
            )
            let encoder = JSONEncoder()
            encoder.outputFormatting = .prettyPrinted
            let data = try encoder.encode(cacheData)
            try data.write(to: cacheFile)
        } catch {
            // Silently fail cache saving - not critical
        }
    }

    func fetchContactNames(for identifiers: [String]) async throws -> [String: (name: String?, nickname: String?, organization: String?, isOrganization: Bool)] {
        let uncachedIdentifiers = identifiers.filter { !identifierMap.keys.contains($0) }

        if !uncachedIdentifiers.isEmpty {
            // Only check contact access if we have new identifiers to look up
            let status = CNContactStore.authorizationStatus(for: .contacts)
            let settingsURL = "x-apple.systempreferences:com.apple.preference.security?Privacy_Contacts"

            if status == .notDetermined {
                guard try await store.requestAccess(for: .contacts) else {
                    showLaunchBarNotification(
                        title: LocalizedStrings.contactAccessDenied,
                        message: LocalizedStrings.contactAccessSubtitle,
                        callbackURL: settingsURL
                    )
                    return [:]
                }
            }

            guard status == .authorized else {
                showLaunchBarNotification(
                    title: LocalizedStrings.contactAccessRequired,
                    message: LocalizedStrings.contactAccessSubtitle,
                    callbackURL: settingsURL
                )
                return [:]
            }

            let keys = [CNContactGivenNameKey, CNContactFamilyNameKey, CNContactOrganizationNameKey,
                        CNContactTypeKey, CNContactIdentifierKey, CNContactPhoneNumbersKey, CNContactEmailAddressesKey,
                        CNContactNicknameKey] as [CNKeyDescriptor]

            for identifier in uncachedIdentifiers {
                var predicate = CNContact.predicateForContacts(matching: CNPhoneNumber(stringValue: identifier))
                var contacts = try store.unifiedContacts(matching: predicate, keysToFetch: keys)

                if contacts.isEmpty && identifier.contains("@") {
                    predicate = CNContact.predicateForContacts(matchingEmailAddress: identifier)
                    contacts = try store.unifiedContacts(matching: predicate, keysToFetch: keys)
                }

                if let contact = contacts.first {
                    let contactId = contact.identifier
                    let isOrganization = contact.contactType == .organization
                    let fullName = [contact.givenName, contact.familyName]
                        .filter { !$0.isEmpty }
                        .joined(separator: " ")
                    let organization = contact.organizationName.isEmpty ? nil : contact.organizationName
                    let nickname = contact.nickname.isEmpty ? nil : contact.nickname

                    identifierMap[identifier] = contactId

                    for phoneNumber in contact.phoneNumbers {
                        let number = normalizePhoneNumber(phoneNumber.value.stringValue)
                        // Only add if not already mapped to a different contact
                        if identifierMap[number] == nil {
                            identifierMap[number] = contactId
                        }
                    }

                    for email in contact.emailAddresses {
                        let emailAddress = email.value as String
                        // Only add if not already mapped to a different contact
                        if identifierMap[emailAddress] == nil {
                            identifierMap[emailAddress] = contactId
                        }
                    }

                    contactDetails[contactId] = ContactInfo(
                        name: fullName.isEmpty ? nil : fullName,
                        nickname: nickname,
                        organization: organization,
                        isOrganization: isOrganization,
                        timestamp: Date()
                    )
                } else {
                    // For unknown identifiers, use the identifier itself as the contact ID
                    identifierMap[identifier] = identifier
                    contactDetails[identifier] = ContactInfo(
                        name: nil,
                        nickname: nil,
                        organization: nil,
                        isOrganization: false,
                        timestamp: Date()
                    )
                }
            }

            saveCache()
        }

        var result: [String: (name: String?, nickname: String?, organization: String?, isOrganization: Bool)] = [:]
        for identifier in identifiers {
            if let contactId = identifierMap[identifier],
               let details = contactDetails[contactId] {
                result[identifier] = (
                    name: details.name,
                    nickname: details.nickname,
                    organization: details.organization,
                    isOrganization: details.isOrganization
                )
            }
        }

        return result
    }

    func getContactId(for identifier: String) -> String? {
        return identifierMap[identifier]
    }

    func getDisplayName(isGroup: Bool, groupName: String?, participants: String?, contactInfo: [String: (name: String?, nickname: String?, organization: String?, isOrganization: Bool)]) -> String {
        if isGroup {
            if let name = groupName, !name.isEmpty {
                return name
            }

            if let participantsList = participants {
                let participantNames = participantsList
                    .split(separator: ",")
                    .map { identifier -> String in
                        let id = String(identifier.trimmingCharacters(in: .whitespaces))
                        if let contact = contactInfo[id] {
                            if contact.isOrganization {
                                return contact.organization.map { org in
                                    contact.name.map { name in "\(org) (\(name))" } ?? org
                                } ?? id
                            } else {
                                return contact.nickname.map { nick in
                                    contact.name.map { name in "\(nick) (\(name))" } ?? nick
                                } ?? (contact.name ?? id)
                            }
                        }
                        return id
                    }
                    .joined(separator: ", ")

                return participantNames.isEmpty ? "Group Chat" : participantNames
            }

            return "Group Chat"
        }

        // For individual chats
        if let identifier = participants {
            return contactInfo[identifier].map { contact in
                if contact.isOrganization {
                    return contact.organization.map { org in
                        contact.name.map { name in "\(org) (\(name))" } ?? org
                    } ?? identifier
                } else {
                    return contact.nickname.map { nick in
                        contact.name.map { name in "\(nick) (\(name))" } ?? nick
                    } ?? (contact.name ?? identifier)
                }
            } ?? identifier
        }

        return "Unknown Contact"
    }
}

// MARK: - Database Manager

class DatabaseManager {
    private var db: OpaquePointer?
    private let dbPath: String
    private var lastQueryTime: Date?
    private var cachedResults: [[String: Any]]?
    private let queryMinInterval: TimeInterval = 30 // 30 seconds between live queries

    enum DatabaseError: Error {
        case failedToOpenDatabase
        case queryFailed
    }

    init(path: String) throws {
        dbPath = path
        if sqlite3_open(dbPath, &db) != SQLITE_OK {
            throw DatabaseError.failedToOpenDatabase
        }
    }

    deinit {
        sqlite3_close(db)
    }

    func fetchRecentMessages() throws -> [[String: Any]] {
        // Use cache if available and recent
        if let lastQuery = lastQueryTime,
           let cached = cachedResults,
           Date().timeIntervalSince(lastQuery) < queryMinInterval {
            return cached
        }

        let query = """
        SELECT 
            message.text,
            HEX(message.attributedBody) as attributed_body,
            message.is_from_me,
            message.is_sent,
            message.is_read,
            message.error,
            message.date as message_date,
            chat.chat_identifier,
            chat.display_name,
            chat.service_name,
            chat.display_name as group_name,
            CASE WHEN chat.chat_identifier LIKE '%chat%' THEN 1 ELSE 0 END as is_group,
            GROUP_CONCAT(DISTINCT handle.id) as participants,
            message.fallback_hash,
            message.is_audio_message,
            message.cache_has_attachments
        FROM (
            SELECT chat_id, MAX(message.date) as max_date
            FROM message 
            JOIN chat_message_join ON message.ROWID = chat_message_join.message_id
            WHERE message.is_archive = 0
            AND message.is_spam = 0
            AND (message.text IS NOT NULL OR message.attributedBody IS NOT NULL OR message.is_audio_message = 1)
            GROUP BY chat_id
        ) latest
        JOIN message ON message.date = latest.max_date
        JOIN chat_message_join ON message.ROWID = chat_message_join.message_id 
            AND chat_message_join.chat_id = latest.chat_id
        JOIN chat ON chat.ROWID = latest.chat_id
        LEFT JOIN chat_handle_join ON chat.ROWID = chat_handle_join.chat_id
        LEFT JOIN handle ON chat_handle_join.handle_id = handle.ROWID
        WHERE chat.service_name IN ('iMessage', 'SMS')
        GROUP BY chat.ROWID
        ORDER BY message_date DESC
        LIMIT 20
        """

        var statement: OpaquePointer?
        defer { sqlite3_finalize(statement) }

        guard sqlite3_prepare_v2(db, query, -1, &statement, nil) == SQLITE_OK else {
            throw DatabaseError.queryFailed
        }

        var results: [[String: Any]] = []

        while sqlite3_step(statement) == SQLITE_ROW {
            var row: [String: Any] = [:]

            let isAudioMessage = sqlite3_column_int(statement, 14) != 0
            let rawText = (sqlite3_column_text(statement, 0).map({ String(cString: $0) }) ?? "").replacingOccurrences(of: "\u{FFFC}", with: "")

            let decodedAttributedText = rawText.isEmpty ?
                (sqlite3_column_text(statement, 1).map({ String(cString: $0) })
                    .flatMap { AttributedBodyDecoder.decodeAttributedBody($0, isAudioMessage: isAudioMessage) }) ?? ""
                : ""

            let messageText = !rawText.isEmpty ? rawText : decodedAttributedText

            row["text"] = messageText
            row["is_audio_message"] = isAudioMessage
            row["has_attachments"] = sqlite3_column_int(statement, 15) != 0

            // Extract boolean and date values
            row["is_from_me"] = sqlite3_column_int(statement, 2) != 0
            row["is_sent"] = sqlite3_column_int(statement, 3) != 0
            row["is_read"] = sqlite3_column_int(statement, 4) != 0
            row["error"] = sqlite3_column_int(statement, 5)
            row["message_date"] = sqlite3_column_int64(statement, 6)

            // Extract text fields
            [(7, "chat_identifier"), (8, "display_name"), (9, "service_name"),
             (10, "group_name"), (12, "participants"), (13, "fallback_hash")]
                .forEach { index, key in
                    if let value = sqlite3_column_text(statement, Int32(index)).map({ String(cString: $0) }) {
                        row[key] = value
                    }
                }

            row["is_group"] = sqlite3_column_int(statement, 11) != 0
            results.append(row)
        }

        // Update cache
        lastQueryTime = Date()
        cachedResults = results

        return results
    }
}

// MARK: - Pinned Chats Manager

struct PinnedChatsManager {
    static func getPinnedChats() -> [String] {
        let path = NSString(string: "~/Library/Preferences/com.apple.messages.pinning.plist").expandingTildeInPath
        guard let dict = NSDictionary(contentsOfFile: path) as? [String: Any],
              let pD = dict["pD"] as? [String: Any],
              let pinnedArray = pD["pP"] as? [String] else {
            return []
        }
        return pinnedArray
    }
}

// MARK: - Main Action

struct MessagesAction {
    private static let timeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .none
        formatter.timeStyle = .short
        return formatter
    }()

    private static let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        formatter.timeStyle = .none
        formatter.doesRelativeDateFormatting = true
        return formatter
    }()

    private static let epochOffset: TimeInterval = 978307200 // Constant for 2001-01-01 00:00:00

    private static func formatDate(timestamp: Int64) -> String {
        let date = Date(timeIntervalSince1970: TimeInterval(timestamp) / 1000000000 + epochOffset)
        let calendar = Calendar.current

        if calendar.isDateInToday(date) {
            return timeFormatter.string(from: date)
        } else {
            return dateFormatter.string(from: date)
        }
    }

    private static func isServiceMessage(_ identifier: String) -> Bool {
        return identifier.hasPrefix("s:mailto:")
    }

    private static func getMessageURL(identifier: String, fallbackHash: String?, isGroup: Bool = false, participants: String? = nil) -> String {
        if let hash = fallbackHash, hash.hasPrefix("s:mailto:") { return "messages://" }

        if isGroup, let participantsList = participants {
            let addresses = participantsList
                .split(separator: ",")
                .map { String($0.trimmingCharacters(in: .whitespaces)) }
                .joined(separator: ",")
            return "imessage://open?addresses=\(addresses)"
        }

        return "imessage://\(identifier)"
    }

    static func run() async throws {
        let dbPath = NSString(string: "~/Library/Messages/chat.db").expandingTildeInPath
        // let dbPath = NSString(string: "~/Desktop/chat.db").expandingTildeInPath // TEST: uncomment for testing with db copy
        let contactManager = ContactManager()
        let dbManager = try DatabaseManager(path: dbPath)

        // Fetch messages and prepare contact lookup
        let messages = try dbManager.fetchRecentMessages()
        let identifiersToLookup = Set(messages.flatMap { (message: [String: Any]) -> [String] in
            let identifier = message["chat_identifier"] as? String
            guard let id = identifier, !id.hasPrefix("s:mailto:"),
                  let participants = message["participants"] as? String else {
                return [identifier].compactMap { $0?.hasPrefix("s:mailto:") == true ? nil : $0 }
            }
            return participants.split(separator: ",").map(String.init)
        })

        // Batch lookup contacts - will only check permissions if needed
        let contactInfo = try await contactManager.fetchContactNames(for: Array(identifiersToLookup))

        // Get pinned chats
        let pinnedChats = PinnedChatsManager.getPinnedChats()

        // Process messages into results, separating groups and individual chats
        let results = messages.reduce(into: (groups: [[String: Any]](), individuals: [String: [String: Any]]())) { result, message in
            let identifier = message["chat_identifier"] as? String ?? ""
            let isGroup = message["is_group"] as? Bool ?? false
            let timestamp = message["message_date"] as? Int64 ?? 0

            // Check if this chat is pinned by checking if any identifier for this contact is pinned
            let isPinned = if let contactId = contactManager.getContactId(for: identifier) {
                pinnedChats.contains { pinnedIdentifier in
                    contactManager.getContactId(for: pinnedIdentifier) == contactId
                }
            } else {
                pinnedChats.contains(identifier)
            }

            let resultDict: [String: Any] = [
                "title": contactManager.getDisplayName(
                    isGroup: isGroup,
                    groupName: message["group_name"] as? String,
                    participants: message["participants"] as? String,
                    contactInfo: contactInfo
                ),
                "subtitle": {
                    let isFromMe = message["is_from_me"] as? Bool ?? false
                    let isSent = message["is_sent"] as? Bool ?? true
                    let error = message["error"] as? Int32 ?? 0

                    if let status = isFromMe ? (error != 0 ? LocalizedStrings.notSent : (!isSent ? LocalizedStrings.sending : nil)) : nil {
                        return status
                    }

                    let prefix = isFromMe ? "\(LocalizedStrings.you): " : ""
                    let text = (message["text"] as? String ?? "")
                        .replacingOccurrences(of: "\u{FFFC}", with: "")
                        .replacingOccurrences(of: "\n", with: " ")
                        .trimmingCharacters(in: .whitespacesAndNewlines)
                    let isAudio = message["is_audio_message"] as? Bool ?? false
                    let hasAttachments = message["has_attachments"] as? Bool ?? false

                    let messageContent = if hasAttachments && !isAudio {
                        text.isEmpty ? LocalizedStrings.attachment : "\(text) \(LocalizedStrings.attachment)"
                    } else if isAudio {
                        text.isEmpty ? LocalizedStrings.audioMessage : "\(text) \(LocalizedStrings.audioMessage)"
                    } else {
                        text
                    }

                    return "\(prefix)\(messageContent)"
                }(),
                "alwaysShowsSubtitle": true,
                "label": formatDate(timestamp: timestamp),
                "icon": {
                    let isFromMe = message["is_from_me"] as? Bool ?? false
                    let isSent = message["is_sent"] as? Bool ?? true
                    let error = message["error"] as? Int32 ?? 0
                    let isRead = message["is_read"] as? Bool ?? true
                    let serviceName = message["service_name"] as? String

                    if isPinned {
                        if isFromMe && error != 0 { return "alert" }
                        if isFromMe && !isSent { return "greyStarTemplate" }
                        return !isRead && !isFromMe ? "star_dot" : "star"
                    }

                    if !isFromMe {
                        return !isRead ?
                            (serviceName == "iMessage" ? "blue_dot" : "green_dot") :
                            (serviceName == "iMessage" ? "blue" : "green")
                    }

                    return error != 0 ? "alert" :
                        !isSent ? "greyTemplate" :
                        (serviceName == "iMessage" ? "blue" : "green")
                }(),
                "url": getMessageURL(identifier: identifier, fallbackHash: message["fallback_hash"] as? String, isGroup: isGroup, participants: message["participants"] as? String),
                "timestamp": timestamp,
                "isPinned": isPinned,
            ]

            if isGroup {
                result.groups.append(resultDict)
            } else {
                // Use contact ID as the key for individual chats
                let contactKey: String
                if let participants = message["participants"] as? String,
                   let firstParticipant = participants.split(separator: ",").first.map(String.init),
                   let contactId = contactManager.getContactId(for: firstParticipant) {
                    contactKey = contactId
                } else {
                    contactKey = identifier
                }

                // Keep only if it's newer than existing message
                if let existingTimestamp = result.individuals[contactKey]?["timestamp"] as? Int64,
                   existingTimestamp >= timestamp {
                    return
                }
                result.individuals[contactKey] = resultDict
            }
        }

        // Combine and sort results
        let getChatId = { (dict: [String: Any]) -> String in
            (dict["url"] as? String)?.replacingOccurrences(of: "imessage://", with: "") ?? ""
        }

        let sortedResults = (results.groups + Array(results.individuals.values))
            .sorted { a, b in
                switch (a["isPinned"] as? Bool ?? false, b["isPinned"] as? Bool ?? false) {
                case (true, true):
                    // For pinned chats, try to find their position in the pinned array
                    let aId = getChatId(a)
                    let bId = getChatId(b)

                    // Get contact IDs for both chats
                    let aContactId = contactManager.getContactId(for: aId)
                    let bContactId = contactManager.getContactId(for: bId)

                    // Find the first pinned identifier that matches either contact
                    let aIndex = pinnedChats.firstIndex { pinnedId in
                        if let pinnedContactId = contactManager.getContactId(for: pinnedId) {
                            return pinnedContactId == aContactId
                        }
                        return pinnedId == aId
                    } ?? Int.max

                    let bIndex = pinnedChats.firstIndex { pinnedId in
                        if let pinnedContactId = contactManager.getContactId(for: pinnedId) {
                            return pinnedContactId == bContactId
                        }
                        return pinnedId == bId
                    } ?? Int.max

                    return aIndex < bIndex
                case (true, false): return true
                case (false, true): return false
                case (false, false):
                    return (a["timestamp"] as? Int64 ?? 0) > (b["timestamp"] as? Int64 ?? 0)
                }
            }

        // Output JSON
        if let jsonString = String(
            data: try JSONSerialization.data(withJSONObject: sortedResults),
            encoding: .utf8
        ) {
            print(jsonString)
        }
    }
}

// MARK: - Script Execution

let semaphore = DispatchSemaphore(value: 0)

Task {
    do {
        try await MessagesAction.run()
    } catch {
        print("Error: \(error.localizedDescription)")
    }
    semaphore.signal()
}

semaphore.wait()
