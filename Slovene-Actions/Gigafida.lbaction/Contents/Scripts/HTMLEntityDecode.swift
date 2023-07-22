#!/usr/bin/env swift

import Foundation
import Cocoa

let arguments = Array(CommandLine.arguments[1 ..< CommandLine.arguments.count])

for arg in arguments
{
    print(CFXMLCreateStringByUnescapingEntities(nil, arg as CFString, nil) as String)
}
