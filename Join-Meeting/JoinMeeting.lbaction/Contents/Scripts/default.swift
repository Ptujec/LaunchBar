#!/usr/bin/env swift

/*
 Join Meeting Action for LaunchBar (Swift rewrite)
 by Christian Bender (@ptujec)
 2022-04-20
 https://github.com/Ptujec/LaunchBar/tree/master/Join-Meeting
 Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

 Helpful Sources:
 - https://docs.swift.org/swift-book/LanguageGuide/TheBasics.html
 - https://developer.apple.com/documentation/eventkit/ekcalendaritem
 - https://stackoverflow.com/questions/33618685/how-to-get-all-events-out-of-a-calendar-swift
 - https://gist.github.com/zmij/c80d6e947bcceaf85ba5c33cf3783d46
 - https://www.hackingwithswift.com/example-code/system/how-to-show-a-relative-date-and-time-using-relativedatetimeformatter

 TODO:
 - Fix NSLocalizedString use / environment … ask Marco
 */
import AppKit
import EventKit
import Foundation

// MARK: - Types & Protocols

protocol MeetingProvider {
    var name: String { get }
    var icon: String { get }
    func extractMeetingURL(from urlString: String) -> String?
    func extractMeetingURLFromNotes(_ notes: String) -> String?
}

// MARK: - Shared Resources

/// Global event store instance used for calendar access throughout the application
let eventStore = EKEventStore()

// MARK: - Localization

struct LocalizedStrings {
    private static let lang = Locale.preferredLanguages[0].components(separatedBy: "-")[0]
    
    static let noMeetings = lang == "de" 
        ? "Kein virtuelles Treffen geplant!" 
        : "No virtual meeting scheduled!"
    static let joinNow = lang == "de" 
        ? "Jetzt teilnehmen" 
        : "Join now"
    static let calendarAccessDenied =
        lang == "de"
        ? "Kalenderzugriff verweigert (⏎)"
        : "Calendar Access Denied (⏎)"
    static let calendarAccessRequired =
        lang == "de"
        ? "Kalenderzugriff erforderlich (⏎) "
        : "Calendar Access Required (⏎)"
    static let calendarAccessSubtitle =
        lang == "de"
        ? "Systemeinstellungen → Datenschutz & Sicherheit → Kalender"
        : "System Settings → Privacy & Security → Calendars"
}

// MARK: - Meeting Providers

struct ZoomProvider: MeetingProvider {
    let name = "Zoom"
    let icon = "videoTemplate"
    private let urlPattern = #"https:\/\/us02web.zoom.us\/j\/(\d+)(?:(?:\?pwd=)(.*))?"#
    
    func extractMeetingURL(from urlString: String) -> String? {
        guard urlString.contains("zoom.us") else { return nil }
        return urlString.replacingOccurrences(
            of: urlPattern,
            with: "zoommtg://zoom.us/join?confno=$1&pwd=$2",
            options: .regularExpression
        )
    }
    
    func extractMeetingURLFromNotes(_ notes: String) -> String? {
        guard notes.contains("zoom.us") else { return nil }
        let matched = RegexHelper.matches(for: urlPattern, in: notes)
        return matched.first?.replacingOccurrences(
            of: urlPattern,
            with: "zoommtg://zoom.us/join?confno=$1&pwd=$2",
            options: .regularExpression
        )
    }
}

struct TeamsProvider: MeetingProvider {
    let name = "Teams"
    let icon = "teamsTemplate"
    private let urlPattern = #"(https:\/\/teams\.microsoft\.com\/l\/meetup-join\/.*[\w@?^=%&/~+#-])"#
    
    func extractMeetingURL(from urlString: String) -> String? {
        guard urlString.contains("teams.microsoft") else { return nil }
        return urlString.replacingOccurrences(of: "https", with: "msteams")
    }
    
    func extractMeetingURLFromNotes(_ notes: String) -> String? {
        guard notes.contains("teams.microsoft") else { return nil }
        let matched = RegexHelper.matches(for: urlPattern, in: notes)
        return matched.first?.replacingOccurrences(of: "https", with: "msteams")
    }
}

// MARK: - Meeting URL Extraction

struct MeetingExtractor {
    private let providers: [MeetingProvider] = [
        ZoomProvider(),
        TeamsProvider()
    ]
    
    func extractMeetingURL(from event: EKEvent) -> (url: String, icon: String)? {
        // Check event URL first
        if let urlString = event.url?.absoluteString {
            for provider in providers {
                if let url = provider.extractMeetingURL(from: urlString) {
                    return (url, provider.icon)
                }
            }
        }
        
        // Then check notes
        if let notes = event.notes {
            for provider in providers {
                if let url = provider.extractMeetingURLFromNotes(notes) {
                    return (url, provider.icon)
                }
            }
        }
        
        return nil
    }
}

// MARK: - Helpers

struct RegexHelper {
    static func matches(for pattern: String, in text: String) -> [String] {
        do {
            let regex = try NSRegularExpression(pattern: pattern)
            let results = regex.matches(in: text,
                                     range: NSRange(text.startIndex..., in: text))
            return results.compactMap {
                Range($0.range, in: text).map { String(text[$0]) }
            }
        } catch let error {
            print("invalid regex: \(error.localizedDescription)")
            return []
        }
    }
}

// MARK: - Calendar Management

final class EventFetcher {
    func fetchEvents() async throws -> [[String: Any]] {
        return try await fetchUpcomingMeetings()
    }

    private func fetchUpcomingMeetings() async throws -> [[String: Any]] {
        var results = [[String: Any]]()
        let calendars = eventStore.calendars(for: .event)
        
        // Range calculations
        let calendar = Calendar.current
        let rangePast = calendar.date(byAdding: .hour, value: -2, to: Date())!
        let rangeFuture = calendar.date(byAdding: .minute, value: 30, to: Date())!

        for calendar in calendars {
            let predicate = eventStore.predicateForEvents(
                withStart: rangePast,
                end: rangeFuture,
                calendars: [calendar]
            )

            let events = eventStore.events(matching: predicate)
            for event in events {
                if let eventInfo = processEvent(event) {
                    results.append(eventInfo)
                }
            }
        }

        // MARK: - Handle single meeting
        if results.count == 1, let urlString = results[0]["url"] as? String {
            NSAppleScript(source: "tell application \"LaunchBar\" to hide")?.executeAndReturnError(nil)
            if let url = URL(string: urlString) {
                NSWorkspace.shared.open(url)
                exit(0)
            }
        }

        return results.isEmpty
            ? [["title": LocalizedStrings.noMeetings, "icon": "alert"]] 
            : results
    }

    private func processEvent(_ event: EKEvent) -> [String: Any]? {
        guard let endDate = event.endDate, endDate > Date() else { return nil }
        let extractor = MeetingExtractor()
        guard let meetingInfo = extractor.extractMeetingURL(from: event) else {
            return nil
        }

        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .full
        let relativeDate = formatter.localizedString(for: event.startDate, relativeTo: Date())

        return [
            "title": event.title!,
            "label": relativeDate,
            "badge": LocalizedStrings.joinNow,
            "url": meetingInfo.url,
            "icon": meetingInfo.icon,
        ]
    }
}

// MARK: - Main Execution

struct JoinMeetingAction {
    static func main() async throws {
        // MARK: - Authorization
        let status = EKEventStore.authorizationStatus(for: .event)
        if status == .notDetermined {
            guard try await eventStore.requestFullAccessToEvents() else {
                print(
                    """
                    [{  "title": "\(LocalizedStrings.calendarAccessDenied)",
                        "subtitle": "\(LocalizedStrings.calendarAccessSubtitle)",
                        "alwaysShowsSubtitle": true,
                        "icon": "alert",
                        "url": "x-apple.systempreferences:com.apple.preference.security?Privacy_Calendars"}]
                    """)
                return
            }
        }

        // Recheck the status after potential authorization request
        let currentStatus: EKAuthorizationStatus = EKEventStore.authorizationStatus(for: .event)
        guard currentStatus == .fullAccess else {
            print(
                """
                [{  "title": "\(LocalizedStrings.calendarAccessRequired)", 
                    "subtitle": "\(LocalizedStrings.calendarAccessSubtitle)",
                    "alwaysShowsSubtitle": true,
                    "icon": "alert",
                    "url": "x-apple.systempreferences:com.apple.preference.security?Privacy_Calendars"}]
                """)
            return
        }

        // Fetch and display meetings
        let eventFetcher = EventFetcher()
        let results = try await eventFetcher.fetchEvents()
        
        if let jsonString = String(
            data: try JSONSerialization.data(withJSONObject: results),
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
        try await JoinMeetingAction.main()
    } catch {
        NSLog("Error: \(error.localizedDescription)")
    }
    semaphore.signal()
}

semaphore.wait()