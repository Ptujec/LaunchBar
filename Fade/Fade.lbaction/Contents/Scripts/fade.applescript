(*
Fade AppleScript for Fade LaunchBar Action
by Christian Bender (@ptujec)
2026-07-07

Copyright see: https://github.com/Ptujec/LaunchBar/blob/master/LICENSE

TODO: fix Safari other browser relationship
*)

property FADE_STEPS : 15
property FADE_INTERVAL : 80

on run {_music_running, _tab_url, _app, _running_browsers, _webkit_browsers}
	set _running_browsers to paragraphs of _running_browsers
	set _webkit_browsers to paragraphs of _webkit_browsers

	if _music_running is "true" then
		-- Music is running, check if it's playing
		tell application id "com.apple.Music"
			if player state is playing then
				-- Music is playing, fade it out
				my fadeMusicOut()
				return _tab_url & linefeed & "com.apple.Music"
			end if
		end tell
	end if

	-- Music not playing or not running, check _browsers for playing media
	set {_playing_tab, _browser} to my findPlayingTabInBrowsers(_tab_url, _running_browsers, _webkit_browsers)
	set _browser to _browser as string

	if _playing_tab is not missing value then
		-- Found playing media in a _browser, fade it out
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

	-- Fallback: return empty string
	return ""
end run

-- Find a playing tab in Safari, optionally matching a specific URL
on findPlayingTabInBrowsers(_tab_url, _running_browsers, _webkit_browsers)
	repeat with _browser in _running_browsers
		if _browser is in _webkit_browsers then
			tell application id _browser
				if (exists front window) then
					-- If _tab_url provided, try to find it with playing media first
					if _tab_url is not "" and _tab_url is not missing value then
						set _tab_url to do shell script "printf %s " & quoted form of _tab_url & " | xargs"
						set _playing_tab to my findTabByCondition(_browser, "
(() => {
  try {
    if (window.location.href !== '" & _tab_url & "') return '';
    const m = [...document.querySelectorAll('audio,video')].find(m => !m.paused && !m.ended && m.readyState > 0);
    return m ? 'playing' : '';
  }
  catch(e) { return ''; }
})()
")
						if _playing_tab is not missing value then return {_playing_tab, _browser}
					end if

					-- Look for any playing media
					set _playing_tab to my findTabByCondition(_browser, "
(() => {
  const m = [...document.querySelectorAll('audio,video')].find(m => !m.paused && !m.ended && m.readyState > 0);
  return m ? 'playing' : '';
})()
")
					if _playing_tab is not missing value then return {_playing_tab, _browser}
				end if
			end tell

		else
			-- Chromium-based _browsers (Chrome, Brave, Vivaldi, Helium)

			using terms from application "Chrome"
				tell application id _browser
					if (exists of windows) then
						-- If _tab_url provided, try to find it with playing media first
						if _tab_url is not "" and _tab_url is not missing value then
							set _tab_url to do shell script "printf %s " & quoted form of _tab_url & " | xargs"
							repeat with w in windows
								repeat with t in tabs of w
									try
										set _tab_url to URL of t
										if _tab_url contains _tab_url then
											execute t javascript "(() => { const m = [...document.querySelectorAll('audio,video')].find(m => !m.paused && !m.ended && m.readyState > 0); return m ? 'playing' : ''; })()"
											if the result is not "" then return {t, _browser}
										end if
									end try
								end repeat
							end repeat
						end if

						-- Look for any playing media
						repeat with w in windows
							repeat with t in tabs of w
								execute t javascript "(() => { const m = [...document.querySelectorAll('audio,video')].find(m => !m.paused && !m.ended && m.readyState > 0); return m ? 'playing' : ''; })()"
								if the result is not "" then return {t, _browser as string}
							end repeat
						end repeat
					end if
				end tell
			end using terms from
		end if
	end repeat

	return {missing value, missing value}
end findPlayingTabInBrowsers



-- Find a tab with playable media (audio or video), regardless of playing state
on findTabWithMedia(_running_browsers, _webkit_browsers)
	repeat with _browser in _running_browsers
		if _browser is in _webkit_browsers then
			tell application id _browser
				if (exists front window) then
					set _media_tab to my findTabByCondition(_browser, "
(() => {
  const m = [...document.querySelectorAll('audio,video')].find(m => m.readyState > 0);
  return m ? 'found' : '';
})()
")
					if _media_tab is not missing value then
						return {_media_tab, _browser}
					end if
				end if
			end tell
		else
			-- Chromium-based browsers
			using terms from application "Chrome"
				tell application id _browser
					if (exists of windows) then
						repeat with w in windows
							repeat with t in tabs of w
								execute t javascript "(() => { const m = [...document.querySelectorAll('audio,video')].find(m => m.readyState > 0); return m ? 'found' : ''; })()"
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

-- Fade out a Safari tab
on fadeBrowserTab(_target_tab, _browser, _webkit_browsers)
	if _browser is in _webkit_browsers then
		using terms from application "Safari"
			tell application id _browser
				set _tab_url to URL of _target_tab
				do JavaScript "
(() => {
  const media = [...document.querySelectorAll('audio,video')].find(m => m.readyState > 0);
  if (!media) return 'no-media';

  const isPlaying = !media.paused && !media.ended;
  const steps = " & FADE_STEPS & ";
  const interval = " & FADE_INTERVAL & ";

  if (isPlaying) {
    // Fade out
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
    // Fade in: play first, then fade in
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
" in _target_tab
				return _tab_url
			end tell
		end using terms from
	else
		using terms from application "Chrome"
			tell application id _browser
				set _tab_url to URL of _target_tab
				execute _target_tab javascript "
(() => {
  const media = [...document.querySelectorAll('audio,video')].find(m => m.readyState > 0);
  if (!media) return 'no-media';

  const isPlaying = !media.paused && !media.ended;
  const steps = " & FADE_STEPS & ";
  const interval = " & FADE_INTERVAL & ";

  if (isPlaying) {
    // Fade out
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
    // Fade in: play first, then fade in
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
				return _tab_url
			end tell
		end using terms from
	end if
end fadeBrowserTab


-- Fade in a Safari tab or other browser
on fadeBrowserIn(_tab_url, _browser, _webkit_browsers)
	if _browser is in _webkit_browsers then
		using terms from application "Safari"
			tell application id _browser
				if not (exists front window) then return false

				set _tab_url to do shell script "printf %s " & quoted form of _tab_url & " | xargs"
				set _target_tab to my findTabByCondition(_browser, "
(() => {
  try { return window.location.href === '" & _tab_url & "' ? 'match' : ''; }
  catch(e) { return ''; }
})()
")

				if _target_tab is missing value then return false

				do JavaScript "
(() => {
  const media = [...document.querySelectorAll('audio,video')].find(m => m.readyState > 0);
  if (!media) return 'no-media';

  media.volume = 0;
  media.play().catch(() => {});

  const steps = " & FADE_STEPS & ";
  const interval = " & FADE_INTERVAL & ";

  let i = 0;
  const timer = setInterval(() => {
    i++;
    media.volume = (i / steps);
    if (i >= steps) {
      clearInterval(timer);
      media.volume = 1;
    }
  }, interval);

  return 'fading-in';
})()
" in _target_tab
				return true
			end tell
		end using terms from
	else
		using terms from application "Chrome"
			tell application id _browser
				if not (exists of windows) then return false

				set _tab_url to do shell script "printf %s " & quoted form of _tab_url & " | xargs"
				set _target_tab to missing value

				repeat with w in windows
					repeat with t in tabs of w
						try
							execute t javascript "(() => { try { return window.location.href === '" & _tab_url & "' ? 'match' : ''; } catch(e) { return ''; } })()"
							if the result is not "" then
								set _target_tab to t
								exit repeat
							end if
						end try
					end repeat
					if _target_tab is not missing value then exit repeat
				end repeat

				if _target_tab is missing value then return false

				execute _target_tab javascript "
(() => {
  const media = [...document.querySelectorAll('audio,video')].find(m => m.readyState > 0);
  if (!media) return 'no-media';

  media.volume = 0;
  media.play().catch(() => {});

  const steps = " & FADE_STEPS & ";
  const interval = " & FADE_INTERVAL & ";

  let i = 0;
  const timer = setInterval(() => {
    i++;
    media.volume = (i / steps);
    if (i >= steps) {
      clearInterval(timer);
      media.volume = 1;
    }
  }, interval);

  return 'fading-in';
})()
"
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
