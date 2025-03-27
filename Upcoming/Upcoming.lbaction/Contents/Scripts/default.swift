#!/usr/bin/env swift

/*
 Upcoming Events Action for LaunchBar
 by Christian Bender (@ptujec)
 2025-03-25

 Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

 Known Issues:
 - recurring events won't open to the event in iCal because iCal would open on the first occurrence not on the current
*/

import AppKit
import EventKit
import Foundation

// MARK: - Types & Protocols

protocol CalendarDataProvider {
    func fetchEvents() async throws -> [[String: Any]]
}

protocol PreferencesManager {
    static func loadExcludedEvents() -> Set<String>
    static func loadCalendarPreferences() -> [String: Bool]
    static func isCalendarIncluded(_ calendar: EKCalendar) -> Bool
    static func toggleEvent(eventID: String) throws
}

// MARK: - Environment & Configuration

struct Environment {
    static let info = ProcessInfo.processInfo.environment
    static let isCommandKeyPressed = info["LB_OPTION_COMMAND_KEY"] == "1"
    static let isAlternateKeyPressed = info["LB_OPTION_ALTERNATE_KEY"] == "1"
    static let isControlKeyPressed = info["LB_OPTION_CONTROL_KEY"] == "1"

    static let actionPath = info["LB_ACTION_PATH"] ?? ""
    static let supportPath = info["LB_SUPPORT_PATH"] ?? ""
    static let preferencesPath = "\(supportPath)/Preferences.plist"

    static let defaultRangeDays = 3
    static let availableRanges = [1, 2, 3, 5, 7]

    static let lang = Locale.preferredLanguages[0]
    static let eventStore = EKEventStore()
    static let calendars = eventStore.calendars(for: .event)

    static let availableCalendarApps: [CalendarApp] = {
        var apps: [CalendarApp] = []
        if NSWorkspace.shared.urlForApplication(withBundleIdentifier: "com.flexibits.fantastical2.mac") != nil {
            apps.append(.fantastical)
        }
        if NSWorkspace.shared.urlForApplication(withBundleIdentifier: "com.busymac.busycal3") != nil {
            apps.append(.busyCal)
        }
        return apps
    }()

    static let primaryCalendarApp: CalendarApp = {
        if let savedApp = Preferences.loadPrimaryCalendarApp() {
            if savedApp == .ical || availableCalendarApps.contains(savedApp) {
                return savedApp
            }
        }
        return availableCalendarApps.first ?? .ical
    }()
}

enum CalendarApp: String {
    case fantastical
    case busyCal
    case ical

    var displayName: String {
        switch self {
        case .fantastical: return "Fantastical"
        case .busyCal: return "BusyCal"
        case .ical: return "Calendar"
        }
    }
}

// MARK: - Localization

struct LocalizedStrings {
    static let noEvents = Environment.lang.hasPrefix("de") ? "Keine Termine!" : "No events!"
    static let remainingDayFormat =
        Environment.lang.hasPrefix("de")
            ? "noch %d Tag%@"
            : "%d more day%@"
    static let daysFormat =
        Environment.lang.hasPrefix("de")
            ? "%d Tag%@"
            : "%d day%@"
    static let calendarAccessDenied =
        Environment.lang.hasPrefix("de")
            ? "Kalenderzugriff verweigert"
            : "Calendar Access Denied"
    static let calendarAccessDeniedSubtitle =
        Environment.lang.hasPrefix("de")
            ? "Bitte gewähren Sie den Zugriff in den Systemeinstellungen"
            : "Please enable in System Settings to view your events"
    static let calendarAccessRequired =
        Environment.lang.hasPrefix("de")
            ? "Kalenderzugriff erforderlich"
            : "Calendar Access Required"
    static let calendarAccessRequiredSubtitle =
        Environment.lang.hasPrefix("de")
            ? "Bitte gewähren Sie vollen Zugriff in Systemeinstellungen → Datenschutz & Sicherheit → Kalender"
            : "Please grant full access in System Settings → Privacy & Security → Calendars"

    // Time remaining strings
    static let inFuturePrefix = Environment.lang.hasPrefix("de") ? "in " : "in "
    static let remainingPrefix = Environment.lang.hasPrefix("de") ? "noch " : ""
    static let remainingSuffix = Environment.lang.hasPrefix("de") ? "" : " remaining"
    static let daySingular = Environment.lang.hasPrefix("de") ? "Tag" : "day"
    static let dayPlural = Environment.lang.hasPrefix("de") ? "Tage" : "days"
    static let hourSingular = Environment.lang.hasPrefix("de") ? "Stunde" : "hour"
    static let hourPlural = Environment.lang.hasPrefix("de") ? "Stunden" : "hours"
    static let minuteSingular = Environment.lang.hasPrefix("de") ? "Minute" : "min"
    static let minutePlural = Environment.lang.hasPrefix("de") ? "Minuten" : "mins"
    static let now = Environment.lang.hasPrefix("de") ? "jetzt" : "now"

    // Settings menu strings
    static let chooseCalendars = Environment.lang.hasPrefix("de") ? "Kalender auswählen" : "Choose Calendars"
    static let setRange = Environment.lang.hasPrefix("de") ? "Zeitraum festlegen" : "Set Range"
    static let openEventsIn = Environment.lang.hasPrefix("de") ? "Termine öffnen in…" : "Open Events In…"
    static let daySingularShort = Environment.lang.hasPrefix("de") ? "Tag" : "day"
    static let dayPluralShort = Environment.lang.hasPrefix("de") ? "Tage" : "days"
}

// MARK: - Utilities

struct Utils {
    static func isCompiledVersionAvailable(scriptName: String, in actionPath: String) -> Bool {
        return FileManager.default.fileExists(
            atPath: "\(actionPath)/Contents/Scripts/\(scriptName)")
    }

    static func getActionName() -> String {
        return isCompiledVersionAvailable(scriptName: "default", in: Environment.actionPath)
            ? "default" : "default.swift"
    }

    static func refreshInterface() {
        let task = Process()
        let isCompiled = isCompiledVersionAvailable(scriptName: "default", in: Environment.actionPath)

        if isCompiled {
            task.launchPath = "\(Environment.actionPath)/Contents/Scripts/default"
        } else {
            task.launchPath = "/usr/bin/env"
            task.arguments = ["swift", "\(Environment.actionPath)/Contents/Scripts/default.swift"]
        }

        task.environment = Environment.info

        do {
            try task.run()
        } catch {
            NSLog("Failed to refresh interface: \(error)")
        }
        exit(0)
    }

    static func createMenuItem(title: String, icon: String, type: String, additionalArgs: [String: String] = [:]) -> [String: Any] {
        var actionArgument = ["type": type]
        additionalArgs.forEach { actionArgument[$0] = $1 }

        return [
            "title": title,
            "icon": icon,
            "action": getActionName(),
            "actionArgument": actionArgument,
        ]
    }
}

// MARK: - Calendar Management

final class CalendarManager: CalendarDataProvider {
    func fetchEvents() async throws -> [[String: Any]] {
        let calendar = Calendar.current
        let now = Date()
        let startOfDay = calendar.startOfDay(for: now)
        let rangeFuture = calendar.date(byAdding: .day, value: Preferences.loadRangePreference(), to: startOfDay)!
        var results = [[String: Any]]()
        var foundFirstNonAllDay = false
        var commonCalendarId: String?

        let includedCalendars = Environment.calendars.filter(Preferences.isCalendarIncluded)
        let predicate = Environment.eventStore.predicateForEvents(
            withStart: startOfDay,
            end: rangeFuture,
            calendars: includedCalendars
        )
        let events = Environment.eventStore.events(matching: predicate)
            .filter { event in
                // Only show events that haven't ended yet
                guard let endDate = event.endDate else { return false }
                return endDate > now
            }
            .sorted { event1, event2 in
                event1.startDate! < event2.startDate!
            }

        for event in events {
            if !Environment.isCommandKeyPressed {
                guard !Preferences.loadExcludedEvents().contains(event.eventIdentifier) else {
                    continue
                }
            }

            // Track if all events share the same calendar
            if results.isEmpty {
                commonCalendarId = event.calendar.calendarIdentifier
            } else if commonCalendarId != event.calendar.calendarIdentifier {
                commonCalendarId = nil
            }

            let showTimeRemaining = !event.isAllDay && !foundFirstNonAllDay
            if showTimeRemaining {
                foundFirstNonAllDay = true
            }
            var eventDict = EventFormatter.formatEvent(event, showTimeRemaining: showTimeRemaining)
            eventDict["isAllDay"] = event.isAllDay
            results.append(eventDict)
        }

        // If all events have the same calendar, remove the labels
        if let _ = commonCalendarId, !results.isEmpty {
            results = results.map { var event = $0; event["label"] = ""; return event }
        }

        return results.isEmpty
            ? [["title": LocalizedStrings.noEvents, "icon": "alert.png"]]
            : results
    }

    private func dictSort(dict1: [String: Any], dict2: [String: Any]) -> Bool {
        guard let date1 = dict1["isoSortDate"] as? String,
              let date2 = dict2["isoSortDate"] as? String
        else { return false }
        return date1 < date2
    }
}

struct CalendarURLBuilder {
    static func buildURL(for app: CalendarApp, event: EKEvent) -> String {
        let isoDate = DateFormatter.isoDateFormatter.string(from: event.startDate!)
        let title = event.title ?? ""
        
        switch app {
        case .fantastical:
            var components = URLComponents(string: "x-fantastical3://show/")
            components?.queryItems = [
                URLQueryItem(name: "date", value: isoDate),
                URLQueryItem(name: "title", value: title),
            ]
            return components?.url?.absoluteString ?? ""
            
        case .busyCal:
            let encodedTitle = title.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed)?.replacingOccurrences(of: "/", with: "%2F") ?? title
            let encodedCalendar = event.calendar.title.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed)?.replacingOccurrences(of: "/", with: "%2F") ?? event.calendar.title
            let calendarPath = event.calendar.title.isEmpty ? "" : encodedCalendar
            return "busycalevent://find/\(calendarPath)/\(encodedTitle)/\(isoDate)"
            
        case .ical:
            return event.hasRecurrenceRules ? "ical://" : "ical://ekevent/\(event.calendarItemIdentifier)"
        }
    }
}

// MARK: - Preferences Management

struct Preferences: PreferencesManager {
    private static let excludedEventsKey = "excludedEvents"
    private static let excludedCalendarsKey = "excludedCalendars"
    private static let rangeDaysKey = "rangeDays"
    private static let primaryCalendarAppKey = "primaryCalendarApp"

    private static func loadPreferences() -> [String: Any] {
        if let data = try? Data(contentsOf: URL(fileURLWithPath: Environment.preferencesPath)),
           let dict = try? PropertyListSerialization.propertyList(from: data, format: nil) as? [String: Any] {
            return dict
        }
        return [:]
    }

    private static func savePreferences(_ preferences: [String: Any]) throws {
        let plistData = try PropertyListSerialization.data(fromPropertyList: preferences, format: .xml, options: 0)
        try plistData.write(to: URL(fileURLWithPath: Environment.preferencesPath))
    }

    static func toggleEvent(eventID: String) throws {
        var preferences = loadPreferences()
        var excludedEvents = Set((preferences[excludedEventsKey] as? [String]) ?? [])

        if excludedEvents.contains(eventID) {
            excludedEvents.remove(eventID)
        } else {
            excludedEvents.insert(eventID)
        }

        preferences[excludedEventsKey] = Array(excludedEvents)
        try savePreferences(preferences)
    }

    static func toggleCalendar(calendarID: String) throws {
        var preferences = loadPreferences()
        var excludedCalendars = Set((preferences[excludedCalendarsKey] as? [String]) ?? [])

        if excludedCalendars.contains(calendarID) {
            excludedCalendars.remove(calendarID)
        } else {
            excludedCalendars.insert(calendarID)
        }

        preferences[excludedCalendarsKey] = Array(excludedCalendars)
        try savePreferences(preferences)
    }

    static func loadCalendarPreferences() -> [String: Bool] {
        let preferences = loadPreferences()
        let excludedCalendars = Set((preferences[excludedCalendarsKey] as? [String]) ?? [])

        return Dictionary(
            uniqueKeysWithValues: Environment.calendars.map { calendar in
                (calendar.calendarIdentifier, !excludedCalendars.contains(calendar.calendarIdentifier))
            }
        )
    }

    static func loadExcludedEvents() -> Set<String> {
        let preferences = loadPreferences()
        return Set((preferences[excludedEventsKey] as? [String]) ?? [])
    }

    static func isCalendarIncluded(_ calendar: EKCalendar) -> Bool {
        return loadCalendarPreferences()[calendar.calendarIdentifier] ?? true
    }

    static func loadRangePreference() -> Int {
        let preferences = loadPreferences()
        if let range = preferences[rangeDaysKey] as? Int,
           Environment.availableRanges.contains(range) {
            return range
        }
        return Environment.defaultRangeDays
    }

    static func setRangePreference(_ days: Int) throws {
        guard Environment.availableRanges.contains(days) else { return }
        var preferences = loadPreferences()
        preferences[rangeDaysKey] = days
        try savePreferences(preferences)
    }

    static func loadPrimaryCalendarApp() -> CalendarApp? {
        let preferences = loadPreferences()
        if let appString = preferences[primaryCalendarAppKey] as? String {
            return CalendarApp(rawValue: appString)
        }
        return nil
    }

    static func setPrimaryCalendarApp(_ app: CalendarApp) throws {
        var preferences = loadPreferences()
        preferences[primaryCalendarAppKey] = app.rawValue
        try savePreferences(preferences)
    }
}

// MARK: - Event Formatting

struct EventFormatter {
    static func formatEvent(_ event: EKEvent, showTimeRemaining: Bool = false) -> [String: Any] {
        let startDate = event.startDate!
        let isoSortDate = ISO8601DateFormatter().string(from: startDate)
        
        let subtitle = createSubtitle(for: event, showTimeRemaining: showTimeRemaining)
        let iconPath = IconManager.generateColoredIcon(
            color: event.calendar.cgColor,
            calendarTitle: event.calendar.title,
            isAllDay: event.isAllDay
        )
        
        let actionArgument: [String: String] = [
            "type": "eventActions",
            "fantasticalURL": CalendarURLBuilder.buildURL(for: .fantastical, event: event),
            "busyCalURL": CalendarURLBuilder.buildURL(for: .busyCal, event: event),
            "icalURL": CalendarURLBuilder.buildURL(for: .ical, event: event),
            "eventID": event.eventIdentifier
        ]
        
        return [
            "title": event.title ?? "",
            "subtitle": subtitle,
            "alwaysShowsSubtitle": true,
            "icon": iconPath,
            "label": event.calendar.title,
            "isoSortDate": isoSortDate,
            "action": Utils.getActionName(),
            "actionArgument": actionArgument
        ]
    }
    
    private static func createSubtitle(for event: EKEvent, showTimeRemaining: Bool) -> String {
        let (baseSubtitle, dateFormatter) = getBaseSubtitle(startDate: event.startDate!, includeTime: !event.isAllDay)
        
        if event.isAllDay {
            return formatAllDayEventSubtitle(event, baseSubtitle: baseSubtitle, dateFormatter: dateFormatter)
        }
        
        return showTimeRemaining ? 
            formatTimeBasedEventSubtitle(event, baseSubtitle: baseSubtitle) :
            baseSubtitle
    }
    
    private static func getBaseSubtitle(startDate: Date, includeTime: Bool = true) -> (String, DateFormatter) {
        let dateFormatter = DateFormatter()
        dateFormatter.locale = .current
        dateFormatter.setLocalizedDateFormatFromTemplate("EEE d MMM")
        var subtitle = dateFormatter.string(from: startDate)
        
        if includeTime {
            let timeFormatter = DateFormatter()
            timeFormatter.locale = .current
            timeFormatter.setLocalizedDateFormatFromTemplate("jj:mm")
            subtitle += " " + timeFormatter.string(from: startDate)
        }
        
        return (subtitle, dateFormatter)
    }

    private static func formatAllDayEventSubtitle(_ event: EKEvent, baseSubtitle: String, dateFormatter: DateFormatter) -> String {
        guard let endDate = event.endDate else { return baseSubtitle }

        let calendar = Calendar.current
        let now = Date()

        if now > event.startDate! && now < endDate {
            let components = calendar.dateComponents([.day], from: now, to: endDate)
            if let days = components.day, days > 0 {
                let remainingDays = formatDayCount(days, isRemaining: true)
                return "\(baseSubtitle) (\(remainingDays))"
            }
        }

        let components = calendar.dateComponents([.day], from: event.startDate!, to: endDate)
        let numberOfDays = (components.day ?? 0)
        return numberOfDays == 0 ? baseSubtitle : "\(baseSubtitle) (\(formatDayCount(numberOfDays + 1, isTotal: true)))"
    }

    private static func formatTimeBasedEventSubtitle(
        _ event: EKEvent, baseSubtitle: String
    ) -> String {
        let now = Date()
        guard let endDate = event.endDate else { return baseSubtitle }

        let timeRemaining: String
        if now < event.startDate! {
            timeRemaining = calculateTimeRemaining(from: now, to: event.startDate!, isFuture: true)
        } else if now < endDate {
            timeRemaining = calculateTimeRemaining(from: now, to: endDate, isFuture: false)
        } else {
            return baseSubtitle
        }
        return "\(baseSubtitle) (\(timeRemaining))"
    }

    private static func formatDayCount(_ days: Int, isRemaining: Bool = false, isTotal: Bool = false) -> String {
        if isRemaining {
            return "\(LocalizedStrings.remainingPrefix)\(days) \(days == 1 ? LocalizedStrings.daySingular : LocalizedStrings.dayPlural)\(LocalizedStrings.remainingSuffix)"
        } else if isTotal {
            return "\(days) \(days == 1 ? LocalizedStrings.daySingular : LocalizedStrings.dayPlural)"
        }
        return "\(days) \(days == 1 ? LocalizedStrings.daySingular : LocalizedStrings.dayPlural)"
    }

    private static func calculateTimeRemaining(from: Date, to: Date, isFuture: Bool) -> String {
        let calendar = Calendar.current
        let components = calendar.dateComponents([.day, .hour, .minute], from: from, to: to)

        let prefix = isFuture ? LocalizedStrings.inFuturePrefix : LocalizedStrings.remainingPrefix
        let suffix = isFuture ? "" : LocalizedStrings.remainingSuffix

        if let days = components.day, days > 0 {
            return "\(prefix)\(days) \(days == 1 ? LocalizedStrings.daySingular : LocalizedStrings.dayPlural)\(suffix)"
        } else if let hours = components.hour, let minutes = components.minute {
            if hours >= 2 {
                return "\(prefix)\(hours) \(hours == 1 ? LocalizedStrings.hourSingular : LocalizedStrings.hourPlural)\(suffix)"
            } else if hours > 0 {
                if minutes > 0 {
                    return "\(prefix)\(hours) \(hours == 1 ? LocalizedStrings.hourSingular : LocalizedStrings.hourPlural) \(minutes) \(minutes == 1 ? LocalizedStrings.minuteSingular : LocalizedStrings.minutePlural)\(suffix)"
                } else {
                    return "\(prefix)\(hours) \(hours == 1 ? LocalizedStrings.hourSingular : LocalizedStrings.hourPlural)\(suffix)"
                }
            } else {
                return "\(prefix)\(minutes) \(minutes == 1 ? LocalizedStrings.minuteSingular : LocalizedStrings.minutePlural)\(suffix)"
            }
        }
        return LocalizedStrings.now
    }
}

// MARK: - Icon Generation

struct IconManager {
    static let iconSize = NSSize(width: 32, height: 32)
    static let shapeSize = NSSize(width: 16, height: 16)
    static let rectCornerRadius: CGFloat = 4.5

    static func generateColoredIcon(color: CGColor, calendarTitle: String, isAllDay: Bool = false)
        -> String {
        let components = color.components ?? [0, 0, 0, 1]
        let colorString = components.map { String(format: "%.3f", $0) }.joined(separator: "")
        let shapePrefix = isAllDay ? "rect" : "circle"
        let iconName = "\(shapePrefix)\(colorString).png"
        let iconPath = "\(Environment.supportPath)/\(iconName)"

        if FileManager.default.fileExists(atPath: iconPath) {
            return iconPath
        }

        // Create new icon
        let image = NSImage(size: iconSize)
        image.lockFocus()
        NSColor.clear.set()
        NSRect(origin: .zero, size: iconSize).fill()

        let shapeRect = NSRect(
            x: (iconSize.width - shapeSize.width) / 2,
            y: (iconSize.height - shapeSize.height) / 2,
            width: shapeSize.width,
            height: shapeSize.height
        )

        let shapePath =
            isAllDay
                ? NSBezierPath(
                    roundedRect: shapeRect, xRadius: rectCornerRadius, yRadius: rectCornerRadius)
                : NSBezierPath(ovalIn: shapeRect)

        (NSColor(cgColor: color) ?? NSColor.gray).set()
        shapePath.fill()
        image.unlockFocus()

        if let tiffData = image.tiffRepresentation,
           let bitmapImage = NSBitmapImageRep(data: tiffData),
           let pngData = bitmapImage.representation(using: .png, properties: [:]) {
            try? pngData.write(to: URL(fileURLWithPath: iconPath))
        }

        return iconPath
    }
}

// MARK: - Extensions

extension DateFormatter {
    static let isoDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    static let systemDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        let template = "MMMd jj:mm" // j for local time format (12/24 hour based on locale)
        let format = DateFormatter.dateFormat(fromTemplate: template, options: 0, locale: Locale.current)
        formatter.dateFormat = format?.replacingOccurrences(of: ", ", with: " ")
        return formatter
    }()
}

extension NSImage {
    func tinted(with color: NSColor) -> NSImage? {
        guard let cgImage = cgImage(forProposedRect: nil, context: nil, hints: nil) else {
            return nil
        }

        return NSImage(size: size, flipped: false) { bounds in
            guard let context = NSGraphicsContext.current?.cgContext else { return false }
            color.set()
            context.clip(to: bounds, mask: cgImage)
            context.fill(bounds)
            return true
        }
    }
}

// MARK: - Main Execution

struct UpcomingEventsAction {
    static func main() async throws {
        // MARK: - Authorization

        let status = EKEventStore.authorizationStatus(for: .event)

        if status != .fullAccess {
            if status == .notDetermined {
                guard try await Environment.eventStore.requestFullAccessToEvents() else {
                    print("""
                    [{  "title": "\(LocalizedStrings.calendarAccessDenied)",
                        "subtitle": "\(LocalizedStrings.calendarAccessDeniedSubtitle)",
                        "alwaysShowsSubtitle": true,
                        "icon": "alert",
                        "url": "x-apple.systempreferences:com.apple.preference.security?Privacy_Calendars"}]
                    """)
                    return
                }
            } else {
                print("""
                [{  "title": "\(LocalizedStrings.calendarAccessRequired)", 
                    "subtitle": "\(LocalizedStrings.calendarAccessRequiredSubtitle)",
                    "alwaysShowsSubtitle": true,
                    "icon": "alert",
                    "url": "x-apple.systempreferences:com.apple.preference.security?Privacy_Calendars"}]
                """)
                return
            }
        }

        var data: Any

        do {
            if let firstArg = Array(CommandLine.arguments.dropFirst()).first,
               let dict = try? JSONSerialization.jsonObject(
                   with: firstArg.data(using: .utf8)!, options: []) as? [String: String],
               let type = dict["type"] {
                switch type {
                case "calPref":
                    data = try handleCalendarPreference(dict)
                case "eventActions":
                    data = try await handleEventAction(dict)
                case "rangePref":
                    data = try handleRangePreference(dict)
                case "showCalendars":
                    data = getCalendarSelectionItems()
                case "showRanges":
                    data = getRangeSelectionItems()
                case "showCalendarApps":
                    data = getCalendarAppSelectionItems()
                case "calendarAppPref":
                    data = try handleCalendarAppPreference(dict)
                default:
                    data = try await CalendarManager().fetchEvents()
                }
            } else {
                data =
                    Environment.isAlternateKeyPressed
                        ? getSettingsMenu() : try await CalendarManager().fetchEvents()
            }

            if let jsonString = String(
                data: try JSONSerialization.data(withJSONObject: data), encoding: .utf8) {
                print(jsonString)
            }
        } catch {
            NSLog("Error: \(error.localizedDescription)")
        }
    }

    private static func handleCalendarPreference(_ data: [String: String]) throws -> [[String: Any]]
    {
        guard let id = data["id"] else {
            throw NSError(
                domain: "Calendar", code: 2,
                userInfo: [NSLocalizedDescriptionKey: "Invalid calendar preference data"])
        }

        try Preferences.toggleCalendar(calendarID: id)
        return getCalendarSelectionItems()
    }

    private static func hideLaunchBar() {
        let script = """
        tell application "LaunchBar" to hide
        """

        if let appleScript = NSAppleScript(source: script) {
            var error: NSDictionary?
            appleScript.executeAndReturnError(&error)
            if let error = error {
                NSLog("Failed to hide LaunchBar: \(error)")
            }
        }
    }

    private static func handleEventAction(_ data: [String: String]) async throws -> [[String: Any]]
    {
        guard let eventID = data["eventID"] else {
            throw NSError(
                domain: "Calendar", code: 3,
                userInfo: [NSLocalizedDescriptionKey: "Invalid event action data"])
        }

        if Environment.isControlKeyPressed {
            try Preferences.toggleEvent(eventID: eventID)
            Utils.refreshInterface()
            return []
        } else {
            let usePrimaryApp = !Environment.isCommandKeyPressed
            let url: String?

            if usePrimaryApp {
                switch Environment.primaryCalendarApp {
                case .fantastical:
                    url = data["fantasticalURL"]
                case .busyCal:
                    url = data["busyCalURL"]
                case .ical:
                    url = data["icalURL"]
                }
            } else {
                url = data["icalURL"]
            }

            if let urlString = url, let urlObject = URL(string: urlString) {
                hideLaunchBar()
                NSWorkspace.shared.open(urlObject)
            }
            exit(0)
        }
    }

    private static func getSettingsMenu() -> [[String: Any]] {
        let actionName = Utils.isCompiledVersionAvailable(scriptName: "default", in: Environment.actionPath)
            ? "default" : "default.swift"

        // Get current settings
        let prefs = Preferences.loadCalendarPreferences()
        let enabledCalendars = prefs.filter { $0.value }.count
        let totalCalendars = prefs.count

        var menuItems = [
            [
                "title": LocalizedStrings.chooseCalendars,
                "icon": "checklistTemplate",
                "badge": enabledCalendars == 1 ?
                    Environment.calendars.first { prefs[$0.calendarIdentifier] ?? false }?.title ?? "1" :
                    "\(enabledCalendars)/\(totalCalendars)",
                "action": actionName,
                "actionArgument": ["type": "showCalendars"],
                "actionReturnsItems": true,
            ],
            [
                "title": LocalizedStrings.setRange,
                "icon": "gridTemplate",
                "badge": formatDayCount(Preferences.loadRangePreference()),
                "action": actionName,
                "actionArgument": ["type": "showRanges"],
                "actionReturnsItems": true,
            ],
        ]

        if !Environment.availableCalendarApps.isEmpty {
            menuItems.append([
                "title": LocalizedStrings.openEventsIn,
                "icon": "appTemplate",
                "badge": Environment.primaryCalendarApp.displayName,
                "action": actionName,
                "actionArgument": ["type": "showCalendarApps"],
                "actionReturnsItems": true,
            ])
        }

        return menuItems
    }

    private static func getRangeSelectionItems() -> [[String: Any]] {
        let currentRange = Preferences.loadRangePreference()

        return Environment.availableRanges.map { days in
            Utils.createMenuItem(
                title: formatDayCount(days),
                icon: days == currentRange ? "checkTemplate" : "circleTemplate",
                type: "rangePref",
                additionalArgs: ["days": String(days)]
            )
        }
    }

    private static func handleRangePreference(_ data: [String: String]) throws -> [[String: Any]] {
        guard let daysString = data["days"],
              let days = Int(daysString) else {
            throw NSError(
                domain: "Calendar", code: 4,
                userInfo: [NSLocalizedDescriptionKey: "Invalid range preference data"])
        }

        try Preferences.setRangePreference(days)
        // return getRangeSelectionItems()
        return getSettingsMenu()
    }

    private static func getCalendarSelectionItems() -> [[String: Any]] {
        let prefs = Preferences.loadCalendarPreferences()

        return Environment.calendars.map { calendar in
            let isIncluded = prefs[calendar.calendarIdentifier] ?? true
            return Utils.createMenuItem(
                title: calendar.title,
                icon: isIncluded ? "checkTemplate" : "circleTemplate",
                type: "calPref",
                additionalArgs: [
                    "id": calendar.calendarIdentifier,
                    "include": String(!isIncluded),
                ]
            ).merging(["isIncluded": isIncluded, "label": getAccountName(for: calendar) ?? ""]) { _, new in new }
        }.sorted { a, b in
            if (a["isIncluded"] as? Bool) != (b["isIncluded"] as? Bool) {
                return (a["isIncluded"] as? Bool) ?? false
            }
            return (a["title"] as? String ?? "").localizedCaseInsensitiveCompare(
                b["title"] as? String ?? "") == .orderedAscending
        }
    }

    private static func getAccountName(for calendar: EKCalendar) -> String? {
        return calendar.source?.title
    }

    private static func getCalendarAppSelectionItems() -> [[String: Any]] {
        let currentApp = Environment.primaryCalendarApp

        return Environment.availableCalendarApps.map { app in
            Utils.createMenuItem(
                title: app.displayName,
                icon: currentApp == app ? "checkTemplate" : "circleTemplate",
                type: "calendarAppPref",
                additionalArgs: ["app": app.rawValue]
            )
        } + [
            Utils.createMenuItem(
                title: "Calendar",
                icon: currentApp == .ical ? "checkTemplate" : "circleTemplate",
                type: "calendarAppPref",
                additionalArgs: ["app": CalendarApp.ical.rawValue]
            ),
        ]
    }

    private static func handleCalendarAppPreference(_ data: [String: String]) throws -> [[String: Any]] {
        guard let appString = data["app"],
              let app = CalendarApp(rawValue: appString) else {
            throw NSError(
                domain: "Calendar", code: 5,
                userInfo: [NSLocalizedDescriptionKey: "Invalid calendar app preference data"])
        }

        try Preferences.setPrimaryCalendarApp(app)
        // return getCalendarAppSelectionItems()
        return getSettingsMenu()
    }

    private static func formatDayCount(_ days: Int, short: Bool = true) -> String {
        let daySuffix = days == 1 ? 
            (short ? LocalizedStrings.daySingularShort : LocalizedStrings.daySingular) :
            (short ? LocalizedStrings.dayPluralShort : LocalizedStrings.dayPlural)
        return String(format: "%d %@", days, daySuffix)
    }
}

// MARK: - Script Execution (needs to be at root level)

let semaphore = DispatchSemaphore(value: 0)

Task {
    try? await UpcomingEventsAction.main()
    semaphore.signal()
}

semaphore.wait()
