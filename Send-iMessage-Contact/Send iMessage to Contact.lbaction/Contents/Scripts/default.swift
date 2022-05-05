#!/usr/bin/env swift

/*
 Send iMessage to Contact Action for LaunchBar
 by Christian Bender (@ptujec)
 2022-05-05

 Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

 Sources:
 - https://developer.apple.com/documentation/contacts
 - https://stackoverflow.com/questions/37039103/how-to-fetch-only-mobile-numbers-in-swift-using-cncontacts
 */

import AppKit
import Contacts
import Foundation

let arguments = Array(CommandLine.arguments.dropFirst())

let keysToFetch = [CNContactGivenNameKey, CNContactFamilyNameKey, CNContactPhoneNumbersKey] as [CNKeyDescriptor]

let store = CNContactStore()
do {
    let predicate = CNContact.predicateForContacts(matchingName: arguments[0])

    let contacts = try store.unifiedContacts(matching: predicate, keysToFetch: keysToFetch)
    // print(contacts[0])

    let numCount = contacts[0].phoneNumbers.count
    // print("Number count: \(numCount)")

    var number = ""

    if numCount > 1 {
        for num in contacts[0].phoneNumbers {
            if num.label!.contains("Mobil") {
                number = num.value.stringValue
            } else if num.label!.contains("iPhone") {
                number = num.value.stringValue
            }
        }
    } else if numCount == 1 {
        number = contacts[0].phoneNumbers[0].value.stringValue
    }

    if number != "" {
        number = number.replacingOccurrences(
            of: #"\s*"#,
            with: "",
            options: .regularExpression
        )

        let messageURL = "imessage://" + number as String
        let url = URL(string: messageURL)!
        NSWorkspace.shared.open(url)
    }

} catch {
    NSLog("Failed to fetch contact, error: \(error)")
}
