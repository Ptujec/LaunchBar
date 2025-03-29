#!/usr/bin/env swift

/*
Search in Maps Action for LaunchBar
by Christian Bender (@ptujec)
2023-05-08

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*/

import Foundation
import MapKit

// Structures for What3Words API
struct Suggestion: Codable {
    let nearestPlace: String
    let words: String
}

struct ApiResponse: Codable {
    let suggestions: [Suggestion]
}

// Constants
let what3wordsRegex = try! NSRegularExpression(pattern: "(?:[a-züäöß]+\\.){2}[a-züäöß]+")
let dividers = [" to ": ("to", "My Location"), " nach ": ("nach", "My Location"), 
                " von ": ("nach", "Mein Standort"), " from ": ("to", "My Location")]

// Parse input and generate suggestions
func handleInput(_ input: String) {
    // Check for route query (contains divider)
    for (divider, (action, myLoc)) in dividers {
        if input.contains(divider) {
            let parts = input.components(separatedBy: divider)
            let isReversed = divider == " from " || divider == " von "
            let saddr = isReversed ? parts[1] : (parts[0].isEmpty ? myLoc : parts[0])
            let daddr = isReversed ? parts[0] : parts[1]
            
            let saddrIcon = saddr.range(of: what3wordsRegex.pattern, options: .regularExpression) != nil ? "w3wCircleTemplate" : "circleTemplate"
            let daddrIcon = daddr.range(of: what3wordsRegex.pattern, options: .regularExpression) != nil ? "w3wPinTemplate" : "pinTemplate"
            
            let output = [
                ["title": saddr, "icon": saddrIcon],
                ["title": action, "icon": "dotsTemplate"],
                ["title": daddr, "icon": daddrIcon]
            ]
            print(String(data: try! JSONSerialization.data(withJSONObject: output), encoding: .utf8)!)
            return
        }
    }
    
    // Handle single location query
    if let what3words = input.range(of: what3wordsRegex.pattern, options: .regularExpression) {
        fetchWhat3WordsSuggestions(String(input[what3words]))
    } else {
        fetchLocationSuggestions(input)
    }
}

// Location suggestions using MKLocalSearchCompleter
func fetchLocationSuggestions(_ query: String) {
    let searchCompleter = MKLocalSearchCompleter()
    let delegate = SearchCompleterDelegate()
    searchCompleter.delegate = delegate
    searchCompleter.queryFragment = query
    searchCompleter.resultTypes = .address
    RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.35))
}

class SearchCompleterDelegate: NSObject, MKLocalSearchCompleterDelegate {
    func completerDidUpdateResults(_ completer: MKLocalSearchCompleter) {
        let suggestions = Array(Set(completer.results.map { $0.title }))
            .map { ["title": $0, "icon": "pinTemplate"] }
        print(String(data: try! JSONSerialization.data(withJSONObject: suggestions), encoding: .utf8)!)
    }
    
    func completer(_ completer: MKLocalSearchCompleter, didFailWithError error: Error) {
        print("Error: \(error.localizedDescription)")
    }
}

// What3Words API suggestions
func fetchWhat3WordsSuggestions(_ what3words: String) {
    var components = URLComponents(string: "https://mapapi.what3words.com/api/autosuggest")!
    components.queryItems = [URLQueryItem(name: "input", value: what3words)]
    
    let semaphore = DispatchSemaphore(value: 0)
    URLSession.shared.dataTask(with: URLRequest(url: components.url!)) { data, _, error in
        defer { semaphore.signal() }
        
        guard let data = data, error == nil else {
            print("Error: \(error?.localizedDescription ?? "Unknown error")")
            return
        }
        
        do {
            let response = try JSONDecoder().decode(ApiResponse.self, from: data)
            let suggestions = response.suggestions.map {
                ["title": $0.words, "subtitle": $0.nearestPlace, "icon": "w3wPinTemplate"]
            }
            print(String(data: try JSONSerialization.data(withJSONObject: suggestions), encoding: .utf8)!)
        } catch {
            print("Error decoding JSON: \(error)")
        }
    }.resume()
    _ = semaphore.wait(timeout: .distantFuture)
}

// Main execution
handleInput(CommandLine.arguments[1])