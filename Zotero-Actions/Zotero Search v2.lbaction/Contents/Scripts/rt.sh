#!/bin/bash

text="$1"
url="$2"
annotation="$3"

# You can tweak that to influence the font and font size. This example will result in Helvetica Neue 14pt. 
# The space between "</a>" and "</font>" is important. Otherwise you will get some Times 12pt in there.

citation_text="$text"
if [ -n "$url" ]; then
    citation_text="<a href=\"$url\">$text</a>"
fi

if [ -n "$annotation" ]; then
    html="<font size=\"4\"><font face=\"helvetica neue\">\"$annotation\" $citation_text </font></font>"
else
    html="<font size=\"4\"><font face=\"helvetica neue\">$citation_text </font></font>"
fi

echo "$html" | textutil -inputencoding UTF-8 -format html -convert rtf -stdin -stdout | pbcopy

osascript -e 'tell application "System Events" to keystroke "v" using command down'
