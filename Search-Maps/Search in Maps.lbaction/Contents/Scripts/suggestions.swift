#!/usr/bin/env swift

/*
Search in Maps Action for LaunchBar
by Christian Bender (@ptujec)
2023-05-08

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

import Foundation
import MapKit

struct Suggestion: Codable {
    let country: String
    let nearestPlace: String
    let words: String
    let rank: Int
    let language: String
}

struct ApiResponse: Codable {
    let suggestions: [Suggestion]
}

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
    // ... code for generating JSON with divider ...
    let output = [
        ["title": saddr, "icon": "circleTemplate"],
        ["title": divider, "icon": "dotsTemplate"],
        ["title": daddr, "icon": "pinTemplate"],
    ]

    let jsonData = try! JSONSerialization.data(withJSONObject: output)
    if let jsonString = String(data: jsonData, encoding: .utf8) {
        print(jsonString)
    }
}

func generateJsonWithoutDivider(input: String) {
    let what3wordsRegex = try! NSRegularExpression(pattern: "(?:[a-züäöß]+\\.){2}[a-züäöß]+")
    
    if let what3words = input.range(of: what3wordsRegex.pattern, options: .regularExpression) {
        showWhat3wordsSuggestions(what3words: String(input[what3words]))
    } else {
        // Location Suggestions
        let searchCompleter = MKLocalSearchCompleter()
        let searchCompleterDelegate = SearchCompleterDelegate()
        searchCompleter.delegate = searchCompleterDelegate
        searchCompleter.queryFragment = input
        searchCompleter.resultTypes = .address
        
        RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.35))
    }
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
        if let jsonString = String(data: jsonData, encoding: .utf8) {
            print(jsonString)
        }
    }

    func completer(_ completer: MKLocalSearchCompleter, didFailWithError error: Error) {
        print("Error: \(error.localizedDescription)")
    }
}

func showWhat3wordsSuggestions(what3words: String) {
    let requestURL = "https://mapapi.what3words.com/api/autosuggest?input=" + what3words.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)!
    let url = URL(string: requestURL)!
    var request = URLRequest(url: url)
    request.httpMethod = "GET"

    let semaphore = DispatchSemaphore(value: 0)

    URLSession.shared.dataTask(with: request) { data, _, error in
        if let error = error {
            print("Error fetching data: \(error)")
            return
        }
        guard let data = data else {
            print("No data received.")
            return
        }

        do {
            let decodedData = try JSONDecoder().decode(ApiResponse.self, from: data)
            let w3wSuggs = decodedData.suggestions

            var suggestions: [[String: Any]] = []

            for item in w3wSuggs {
                suggestions.append([
                    "title": item.words,
                    "subtitle": item.nearestPlace,
                    "icon": "w3wTemplate",
                ])
            }

            let jsonData = try JSONSerialization.data(withJSONObject: suggestions, options: [])
            if let jsonString = String(data: jsonData, encoding: .utf8) {
                print(jsonString)
            }
        } catch {
            print("Error decoding JSON: \(error)")
        }
        semaphore.signal()
    }.resume()
    _ = semaphore.wait(timeout: .distantFuture)
    //  RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.35))
}