#!/bin/bash

text="$1"
url="$2"

# You can tweak that to influence the font and font size. This example will result in Helvetica Neue 14pt. 
# The space between "</a>" and "</font>" is important. Otherwise you will get some Times 12pt in there.

html="<font size=\"4\"><font face=\"helvetica neue\"><a href=\"$url\">$text</a> </font></font>"

echo "$html" | textutil -inputencoding UTF-8 -format html -convert rtf -stdin -stdout | pbcopy

osascript -e 'tell application "System Events" to keystroke "v" using command down'
