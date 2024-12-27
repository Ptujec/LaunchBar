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

import EventKit
import Foundation

// // Get the bundle for the current script
// let actionPath = ProcessInfo.processInfo.environment["LB_ACTION_PATH"] ?? ""

// // Safely unwrap the bundle
// guard let bundle = Bundle(path: actionPath) else {
//     NSLog("Failed to create bundle at path: \(actionPath)")
//     exit(1)
// }

// Get the preferred language
let lang = Locale.preferredLanguages[0].components(separatedBy: "-")[0]

// MARK: - Constants
struct Constants {
    static let zoomPattern = #"https:\/\/us02web.zoom.us\/j\/(\d+)(?:(?:\?pwd=)(.*))?"#
    static let teamsPattern =
        #"(https:\/\/teams\.microsoft\.com\/l\/meetup-join\/.*[\w@?^=%&/~+#-])"#

    struct Messages {
        static let noMeetings =
            lang == "de" ? "Kein virtuelles Treffen geplant!" : "No virtual meeting scheduled!"
        static let joinNow = lang == "de" ? "Jetzt teilnehmen" : "Join now"
    }
}

// MARK: - Meeting URL Extractor
struct MeetingURLExtractor {
    static func extractMeetingURL(from event: EKEvent) -> (url: String, icon: String)? {
        // Helper function for regex matching
        func matches(for pattern: String, in text: String) -> [String] {
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

        // First try the event URL
        if let urlString = event.url?.absoluteString {
            if urlString.contains("zoom.us") {
                let url = urlString.replacingOccurrences(
                    of: Constants.zoomPattern,
                    with: "zoommtg://zoom.us/join?confno=$1&pwd=$2",
                    options: .regularExpression
                )
                return (url, "videoTemplate")
            } else if urlString.contains("teams.microsoft") {
                let url = urlString.replacingOccurrences(
                    of: "https",
                    with: "msteams",
                    options: []
                )
                return (url, "teamsTemplate")
            }
        }

        // Then try the notes
        if let notes = event.notes {
            if notes.contains("zoom.us") {
                let matched = matches(for: Constants.zoomPattern, in: notes)
                if let match = matched.first {
                    let url = match.replacingOccurrences(
                        of: Constants.zoomPattern,
                        with: "zoommtg://zoom.us/join?confno=$1&pwd=$2",
                        options: .regularExpression
                    )
                    return (url, "videoTemplate")
                }
            } else if notes.contains("teams.microsoft") {
                let matched = matches(for: Constants.teamsPattern, in: notes)
                if let match = matched.first {
                    let url = match.replacingOccurrences(
                        of: "https",
                        with: "msteams",
                        options: []
                    )
                    return (url, "teamsTemplate")
                }
            }
        }

        return nil
    }
}

// MARK: - Event Fetcher
class EventFetcher {
    private let store = EKEventStore()

    func fetchEvents() async throws -> [[String: Any]] {
        try await requestAccessIfNeeded()
        return try await fetchUpcomingMeetings()
    }

    private func requestAccessIfNeeded() async throws {
        let status = EKEventStore.authorizationStatus(for: .event)
        guard status == .notDetermined else { return }

        let granted = await withCheckedContinuation { continuation in
            store.requestFullAccessToEvents { granted, _ in
                continuation.resume(returning: granted)
            }
        }

        guard granted else {
            throw NSError(
                domain: "Calendar", code: 1,
                userInfo: [NSLocalizedDescriptionKey: "Calendar access denied"])
        }
    }

    private func fetchUpcomingMeetings() async throws -> [[String: Any]] {
        var results = [[String: Any]]()
        // Get all calendars
        let calendars = store.calendars(for: .event)
        
        // Range calculations
        let calendar = Calendar.current
        let rangePast = calendar.date(byAdding: .hour, value: -2, to: Date())!
        let rangeFuture = calendar.date(byAdding: .minute, value: 30, to: Date())!

        for calendar in calendars {
            let predicate = store.predicateForEvents(
                withStart: rangePast,
                end: rangeFuture,
                calendars: [calendar]
            )

            let events = store.events(matching: predicate)
            for event in events {
                if let meetingInfo = processEvent(event) {
                    results.append(meetingInfo)
                }
            }
        }

        return results.isEmpty
            ? [["title": Constants.Messages.noMeetings, "icon": "alert"]] : results
    }

    private func processEvent(_ event: EKEvent) -> [String: Any]? {
        guard let endDate = event.endDate, endDate > Date() else { return nil }
        guard let meetingInfo = MeetingURLExtractor.extractMeetingURL(from: event) else {
            return nil
        }

        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .full
        let relativeDate = formatter.localizedString(for: event.startDate, relativeTo: Date())

        return [
            "title": event.title!,
            "label": relativeDate,
            "badge": Constants.Messages.joinNow,
            "url": meetingInfo.url,
            "icon": meetingInfo.icon,
        ]
    }
}

// MARK: - Main execution
var isComplete = false

Task {
    do {
        let eventFetcher = EventFetcher()
        let results = try await eventFetcher.fetchEvents()

        let jsonData = try JSONSerialization.data(withJSONObject: results)
        if let jsonString = String(data: jsonData, encoding: .utf8) {
            print(jsonString)
        }
    } catch {
        NSLog("Error: \(error.localizedDescription)")
    }
    isComplete = true
}

// Keep the script running until the task completes
while !isComplete {
    RunLoop.current.run(mode: .default, before: Date(timeIntervalSinceNow: 0.1))
}
