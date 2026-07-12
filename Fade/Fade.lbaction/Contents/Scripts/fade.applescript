(*
Fade AppleScript for Fade LaunchBar Action
by Christian Bender (@ptujec)
2026-07-07

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE
*)

property FADE_STEPS : 15
property FADE_INTERVAL : 80

-- JavaScript for detecting playing media
property JS_CHECK_PLAYING : "(() => {
  const m = [...document.querySelectorAll('audio,video')].find(m => !m.paused && !m.ended && m.readyState > 0);
  return m ? 'playing' : '';
})()"

-- JavaScript for detecting any media (playing or not)
property JS_CHECK_MEDIA : "(() => {
  const m = [...document.querySelectorAll('audio,video')].find(m => m.readyState > 0);
  return m ? 'found' : '';
})()"

-- JavaScript for fade animation
property JS_FADE_HANDLER : "
(() => {
  const media = [...document.querySelectorAll('audio,video')].find(m => m.readyState > 0);
  if (!media) return 'no-media';

  const isPlaying = !media.paused && !media.ended;
  const steps = %STEPS%;
  const interval = %INTERVAL%;

  if (isPlaying) {
    const startVol = media.volume;
    const endVol = 0;
    let i = 0;
    const timer = setInterval(() => {
      i++;
      media.volume = startVol + (endVol - startVol) * (i / steps);
      if (i >= steps) {
        clearInterval(timer);
        media.volume = endVol;
        media.pause();
        media.volume = 1;
      }
    }, interval);
  } else {
    media.volume = 0;
    media.play().catch(() => {});
    let i = 0;
    const timer = setInterval(() => {
      i++;
      media.volume = (i / steps);
      if (i >= steps) {
        clearInterval(timer);
        media.volume = 1;
      }
    }, interval);
  }

  return isPlaying ? 'fading-out' : 'fading-in';
})()
"

on run {_music_running, _tab_url, _app, _running_browsers, _webkit_browsers}
	set _running_browsers to paragraphs of _running_browsers
	set _webkit_browsers to paragraphs of _webkit_browsers

	-- Music is running, check if it's playing
	if _music_running is "true" then
		tell application id "com.apple.Music"
			if player state is playing then
				my fadeMusicOut()
				return _tab_url & linefeed & "com.apple.Music"
			end if
		end tell
	end if

	-- Music not playing or not running, check _browsers for playing media
	set {_playing_tab, _browser} to my findPlayingTabInBrowsers(_tab_url, _running_browsers, _webkit_browsers)
	set _browser to _browser as string

	if _playing_tab is not missing value then
		set _tab_url to my fadeBrowserTab(_playing_tab, _browser, _webkit_browsers)
		return _tab_url & linefeed & _browser
	end if

	-- Nothing is playing, check if _browser was last app and URL exists
	if _app is not "com.apple.Music" and _tab_url is not "" and _tab_url is not missing value then
		set success to my fadeBrowserIn(_tab_url, _app, _webkit_browsers)
		if success then
			return _tab_url & linefeed & _app
		end if
	end if

	-- If Music was last app and Music is running, play Music
	if _app is "com.apple.Music" and _music_running is "true" then
		my fadeMusicIn()
		return "" & linefeed & "com.apple.Music"
	end if

	-- Tab URL doesn't exist or failed, find a tab that could be played
	set {_media_tab, _browser} to my findTabWithMedia(_running_browsers, _webkit_browsers)
	set _browser to _browser as text

	if _media_tab is not missing value then
		set _tab_url to my fadeBrowserTab(_media_tab, _browser, _webkit_browsers)
		return _tab_url & linefeed & _browser
	end if

	-- Fall back to Music if available
	if _music_running is "true" then
		my fadeMusicIn()
		return "" & linefeed & "com.apple.Music"
	end if

	return
end run

-- Find a playing tab in any browser, optionally matching a specific URL
on findPlayingTabInBrowsers(_tab_url, _running_browsers, _webkit_browsers)
	repeat with _browser in _running_browsers
		if _browser is in _webkit_browsers then
			set {_tab, _url} to my findPlayingTabInWebKit(_tab_url, _browser)
			if _tab is not missing value then return {_tab, _browser}
		else
			set {_tab, _url} to my findPlayingTabInChrome(_tab_url, _browser)
			if _tab is not missing value then return {_tab, _browser}
		end if
	end repeat
	return {missing value, missing value}
end findPlayingTabInBrowsers

-- Find playing tab in WebKit browser
on findPlayingTabInWebKit(_tab_url, _browser)
	tell application id _browser
		if not (exists front window) then return {missing value, missing value}

		if _tab_url is not "" and _tab_url is not missing value then
			set _clean_url to do shell script "printf %s " & quoted form of _tab_url & " | xargs"
			set _playing_tab to my findTabByCondition(_browser, "
(() => {
  try {
    if (window.location.href !== '" & _clean_url & "') return '';
    const m = [...document.querySelectorAll('audio,video')].find(m => !m.paused && !m.ended && m.readyState > 0);
    return m ? 'playing' : '';
  }
  catch(e) { return ''; }
})()
")
			if _playing_tab is not missing value then return {_playing_tab, _tab_url}
		end if

		set _playing_tab to my findTabByCondition(_browser, my JS_CHECK_PLAYING)
		return {_playing_tab, ""}
	end tell
end findPlayingTabInWebKit

-- Find playing tab in Chrome-based browser
on findPlayingTabInChrome(_tab_url, _browser)
	using terms from application "Chrome"
		tell application id _browser
			if not (exists of windows) then return {missing value, missing value}

			if _tab_url is not "" and _tab_url is not missing value then
				set _clean_url to do shell script "printf %s " & quoted form of _tab_url & " | xargs"
				repeat with w in windows
					repeat with t in tabs of w
						try
							if (URL of t) contains _clean_url then
								execute t javascript my JS_CHECK_PLAYING
								if the result is not "" then return {t, _tab_url}
							end if
						end try
					end repeat
				end repeat
			end if

			repeat with w in windows
				repeat with t in tabs of w
					execute t javascript my JS_CHECK_PLAYING
					if the result is not "" then return {t, ""}
				end repeat
			end repeat
		end tell
	end using terms from
	return {missing value, missing value}
end findPlayingTabInChrome

-- Find a tab with playable media (audio or video), regardless of playing state
on findTabWithMedia(_running_browsers, _webkit_browsers)
	repeat with _browser in _running_browsers
		if _browser is in _webkit_browsers then
			set _media_tab to my findTabByCondition(_browser, my JS_CHECK_MEDIA)
			if _media_tab is not missing value then return {_media_tab, _browser}
		else
			using terms from application "Chrome"
				tell application id _browser
					if (exists of windows) then
						repeat with w in windows
							repeat with t in tabs of w
								execute t javascript my JS_CHECK_MEDIA
								if the result is not "" then return {t, _browser}
							end repeat
						end repeat
					end if
				end tell
			end using terms from
		end if
	end repeat
	return {missing value, missing value}
end findTabWithMedia

-- Build fade script with current settings
on buildFadeScript()
	set _script to my JS_FADE_HANDLER
	set _script to my replaceText(_script, "%STEPS%", FADE_STEPS as text)
	set _script to my replaceText(_script, "%INTERVAL%", FADE_INTERVAL as text)
	return _script
end buildFadeScript

-- Generic tab finder with condition script
on findTabByCondition(_browser, conditionScript)
	using terms from application "Safari"
		tell application id _browser
			repeat with w in windows
				repeat with t in tabs of w
					try
						set result to do JavaScript conditionScript in t
						if result is not "" then
							return t
						end if
					end try
				end repeat
			end repeat
		end tell
	end using terms from
	return missing value
end findTabByCondition

-- Replace text in string
on replaceText(_text, _search, _replacement)
	set _old to AppleScript's text item delimiters
	set AppleScript's text item delimiters to _search
	set _items to text items of _text
	set AppleScript's text item delimiters to _replacement
	set _result to _items as text
	set AppleScript's text item delimiters to _old
	return _result
end replaceText

-- Fade a browser tab (in or out)
on fadeBrowserTab(_target_tab, _browser, _webkit_browsers)
	set _fade_script to my buildFadeScript()

	if _browser is in _webkit_browsers then
		using terms from application "Safari"
			tell application id _browser
				set _tab_url to URL of _target_tab
				do JavaScript _fade_script in _target_tab
				return _tab_url
			end tell
		end using terms from
	else
		using terms from application "Chrome"
			tell application id _browser
				set _tab_url to URL of _target_tab
				execute _target_tab javascript _fade_script
				return _tab_url
			end tell
		end using terms from
	end if
end fadeBrowserTab


-- Fade in a browser tab
on fadeBrowserIn(_tab_url, _browser, _webkit_browsers)
	set _fade_script to my buildFadeScript()

	if _browser is in _webkit_browsers then
		using terms from application "Safari"
			tell application id _browser
				if not (exists front window) then return false

				set _clean_url to do shell script "printf %s " & quoted form of _tab_url & " | xargs"
				set _target_tab to my findTabByCondition(_browser, "
(() => {
  try { return window.location.href === '" & _clean_url & "' ? 'match' : ''; }
  catch(e) { return ''; }
})()
")
				if _target_tab is missing value then return false

				do JavaScript _fade_script in _target_tab
				return true
			end tell
		end using terms from
	else
		using terms from application "Chrome"
			tell application id _browser
				if not (exists of windows) then return false

				set _clean_url to do shell script "printf %s " & quoted form of _tab_url & " | xargs"
				set _target_tab to missing value

				repeat with w in windows
					repeat with t in tabs of w
						try
							execute t javascript "(() => { try { return window.location.href === '" & _clean_url & "' ? 'match' : ''; } catch(e) { return ''; } })()"
							if the result is not "" then
								set _target_tab to t
								exit repeat
							end if
						end try
					end repeat
					if _target_tab is not missing value then exit repeat
				end repeat

				if _target_tab is missing value then return false

				execute _target_tab javascript _fade_script
				return true
			end tell
		end using terms from
	end if
end fadeBrowserIn

-- Fade out Music
on fadeMusicOut()
	tell application id "com.apple.Music"
		set currentvolume to the sound volume
		repeat
			-- Fade down
			repeat with i from currentvolume to 0 by -5
				set the sound volume to i
				delay 0.05
			end repeat
			pause
			-- Restore original volume
			set the sound volume to currentvolume
			exit repeat
		end repeat
	end tell
end fadeMusicOut

-- Fade in Music
on fadeMusicIn()
	tell application id "com.apple.Music"
		set currentvolume to the sound volume
		set the sound volume to 0
		play

		repeat with j from 0 to currentvolume by 5
			set the sound volume to j
			delay 0.05
		end repeat
	end tell
end fadeMusicIn
