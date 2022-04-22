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
- Fix daylight saving issue 
- Use NSLocalizedString

*/

import Foundation
import EventKit

let lang = Locale.preferredLanguages[0]
var resultJSON = [[String:Any]]()
var store = EKEventStore()
let calendars = store.calendars(for: .event)

for calendar in calendars {
    let rangePast = Date(timeIntervalSinceNow: -3600) // past hour TODO: Fix daylight saving (?)
    let rangeFuture = Date(timeIntervalSinceNow: 1260) // next 20 min
    let predicate =  store.predicateForEvents(withStart: rangePast, end: rangeFuture, calendars: [calendar])
    
    let events = store.events(matching: predicate)
    
    for event in events {
        
        let startDate = event.startDate    
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .full
        let relativeDate = formatter.localizedString(for: startDate!, relativeTo: Date())
        
        var meetingURL = ""
        var icon = "videoTemplate"
        
        let zoomREpattern = #"https:\/\/us02web.zoom.us\/j\/(\d+)(?:(?:\?pwd=)(.*))?"#
        let teamsREpattern = #"(https:\/\/teams\.microsoft\.com\/l\/meetup-join\/.*)>"#
        
        func matches(for regex: String, in text: String) -> [String] {
            
            do {
                let regex = try NSRegularExpression(pattern: regex)
                let results = regex.matches(in: text,
                                            range: NSRange(text.startIndex..., in: text))
                return results.flatMap {
                    Range($0.range, in: text).map { String(text[$0]) }
                }
            } catch let error {
                print("invalid regex: \(error.localizedDescription)")
                return []
            }
        }
        
        let urlString = event.url?.absoluteString
        
        if urlString != nil {
            if urlString!.contains("zoom.us") {
                meetingURL = urlString!.replacingOccurrences(
                    of: zoomREpattern,
                    with: "zoommtg://zoom.us/join?confno=$1&pwd=$2",
                    options: .regularExpression
                )
            } else if urlString!.contains("teams.microsoft") {
                icon = "teamsTemplate"
                meetingURL = urlString!.replacingOccurrences(
                    of: "https",
                    with: "msteams",
                    options: []
                )
            }
        } else {
            let notes = (event.notes ?? "")
            if notes.contains("zoom.us") {
                let matched = matches(for: zoomREpattern, in: notes)
                meetingURL = matched[0].replacingOccurrences(
                    of: zoomREpattern,
                    with: "zoommtg://zoom.us/join?confno=$1&pwd=$2",
                    options: .regularExpression
                )
                
            } else if notes.contains("teams.microsoft") {
                icon = "teamsTemplate"
                let matched = matches(for: teamsREpattern, in: notes)
                
                meetingURL = matched[0].replacingOccurrences(
                    of: "https",
                    with: "msteams",
                    options: []
                )

                meetingURL = meetingURL.replacingOccurrences(
                    of: ">",
                    with: "",
                    options: []
                )
            }
        }
        
        if meetingURL != "" {
            if lang.hasPrefix("de") {
                let eventJSON = [
                    "title" : event.title,
                    "subtitle" : relativeDate,
                    "badge" : "Teilnehmen", 
                    "url" : meetingURL,
                    "icon" : icon
                ]
                resultJSON.append(eventJSON)
            } else {
                let eventJSON = [
                    "title" : event.title,
                    "subtitle" : relativeDate,
                    "badge" : "Join now", 
                    "url" : meetingURL,
                    "icon" : icon
                ]
                resultJSON.append(eventJSON)
            }
        }
    }
}

if resultJSON.count == 0 {
    if lang.hasPrefix("de") {
        resultJSON.append ([
            "title" : "Kein virtuelles Treffen geplant!",
            "icon" : "alertTemplate"
        ])
    } else { 
        resultJSON.append ([
            "title" : "No virtual meeting scheduled!",
            "icon" : "alertTemplate"
        ])
    }
}

// Serialize to JSON
let jsonData = try JSONSerialization.data(withJSONObject: resultJSON)

// Convert to a string and print
if let JSONString = String(data: jsonData, encoding: String.Encoding.utf8) {
    print(JSONString)
}
