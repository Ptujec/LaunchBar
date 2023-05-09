#!/usr/bin/env swift

/* 
Search in Maps Action for LaunchBar
by Christian Bender (@ptujec)
2023-05-08

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

import Foundation
import MapKit

let input = CommandLine.arguments[1]
parseInputAndGenerateJson(input)

func parseInput(_ input: String) -> (saddr: String?, daddr: String?, divider: String?) {
    let dividers = [" to ", " nach ", " von ", " from "]
    var saddr: String?
    var daddr: String?
    var divider: String?
    var myLoc: String? = "My Location"

    for div in dividers {
        if input.contains(div) {
            let parts = input.components(separatedBy: div)
            if div == " to " || div == " nach " {
                saddr = parts[0]
                daddr = parts[1]
                divider = div.trimmingCharacters(in: .whitespacesAndNewlines)
            } else {
                daddr = parts[0]
                saddr = parts[1]

                if div == " von " {
                    divider = "nach"
                    myLoc = "Mein Standort"
                } else {
                    divider = "to"
                }
            }
            break
        }
    }

    saddr = saddr?.isEmpty == true ? myLoc : saddr
    return (saddr, daddr, divider)
}

func parseInputAndGenerateJson(_ input: String) {
    let (saddr, daddr, divider) = parseInput(input)

    if let saddr = saddr, let daddr = daddr, let divider = divider {
        generateJsonWithDivider(saddr: saddr, daddr: daddr, divider: divider)
    } else {
        generateJsonWithoutDivider(input: input)
    }
}

func generateJsonWithDivider(saddr: String, daddr: String, divider: String) {
    let output = [
        ["title": saddr, "icon": "circleTemplate"],
        ["title": divider, "icon": "dotsTemplate"],
        ["title": daddr, "icon": "pinTemplate"],
    ]

    let jsonData = try! JSONSerialization.data(withJSONObject: output)
    let jsonString = String(data: jsonData, encoding: .utf8)!
    print(jsonString)
}

func generateJsonWithoutDivider(input: String) {
    // Location Suggestions
    let searchCompleter = MKLocalSearchCompleter()
    let searchCompleterDelegate = SearchCompleterDelegate()
    searchCompleter.delegate = searchCompleterDelegate
    searchCompleter.queryFragment = input
    searchCompleter.resultTypes = .address
    
    RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.35))
}

class SearchCompleterDelegate: NSObject, MKLocalSearchCompleterDelegate {
    func completerDidUpdateResults(_ completer: MKLocalSearchCompleter) {
        var suggestionResults = [[String: Any]]()
        var uniqueTitles = Set<String>()

        completer.results.forEach { suggestion in
            if !uniqueTitles.contains(suggestion.title) {
                uniqueTitles.insert(suggestion.title)
                suggestionResults.append(["title": suggestion.title, "icon": "pinTemplate"])
            }
        }

        let jsonData = try! JSONSerialization.data(withJSONObject: suggestionResults)
        let jsonString = String(data: jsonData, encoding: .utf8)!

        print(jsonString)
    }

    func completer(_ completer: MKLocalSearchCompleter, didFailWithError error: Error) {
        print("Error: \(error.localizedDescription)")
    }
}