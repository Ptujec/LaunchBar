#!/bin/sh
echo "$1" | textutil -inputencoding UTF-8 -format html -convert rtf -stdin -stdout | LC_CTYPE=UTF-8 pbcopy