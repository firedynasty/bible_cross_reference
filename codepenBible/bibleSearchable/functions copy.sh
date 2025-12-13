#!/bin/bash
# Bible reading functions for terminal
# Source this file: source functions.sh

BIBLE_JSON="/Users/stanleytan/Documents/25-technical/01-github/vercel_bible_current/build/en_web.json"
BIBLE_AUDIO_DIR="$HOME/bible"

# Book name to abbreviation mapping
_bible_abbrev() {
  local input=$(echo "$1" | tr '[:upper:]' '[:lower:]' | sed 's/^ *//;s/ *$//')
  case "$input" in
    genesis|gen) echo "gn" ;;
    exodus|exo|exod) echo "ex" ;;
    leviticus|lev) echo "lv" ;;
    numbers|num) echo "nm" ;;
    deuteronomy|deut|deu) echo "dt" ;;
    joshua|josh|jos) echo "js" ;;
    judges|judg) echo "jud" ;;
    ruth) echo "rt" ;;
    "1 samuel"|"1samuel"|"1sam"|"1 sam"|"first samuel"|"i samuel") echo "1sm" ;;
    "2 samuel"|"2samuel"|"2sam"|"2 sam"|"second samuel"|"ii samuel") echo "2sm" ;;
    "1 kings"|"1kings"|"1kgs"|"1 kgs"|"first kings"|"i kings") echo "1kgs" ;;
    "2 kings"|"2kings"|"2kgs"|"2 kgs"|"second kings"|"ii kings") echo "2kgs" ;;
    "1 chronicles"|"1chronicles"|"1chr"|"1 chr"|"first chronicles"|"i chronicles") echo "1ch" ;;
    "2 chronicles"|"2chronicles"|"2chr"|"2 chr"|"second chronicles"|"ii chronicles") echo "2ch" ;;
    ezra) echo "ezr" ;;
    nehemiah|neh) echo "ne" ;;
    esther|est) echo "et" ;;
    job) echo "job" ;;
    psalms|psalm|psa|ps) echo "ps" ;;
    proverbs|prov|pro) echo "prv" ;;
    ecclesiastes|eccl|ecc) echo "ec" ;;
    "song of solomon"|"song of songs"|"song"|"sos"|"songs") echo "so" ;;
    isaiah|isa) echo "is" ;;
    jeremiah|jer) echo "jr" ;;
    lamentations|lam) echo "lm" ;;
    ezekiel|ezek|eze) echo "ez" ;;
    daniel|dan) echo "dn" ;;
    hosea|hos) echo "ho" ;;
    joel) echo "jl" ;;
    amos) echo "am" ;;
    obadiah|oba|ob) echo "ob" ;;
    jonah|jon) echo "jn" ;;
    micah|mic) echo "mi" ;;
    nahum|nah) echo "na" ;;
    habakkuk|hab) echo "hk" ;;
    zephaniah|zeph|zep) echo "zp" ;;
    haggai|hag) echo "hg" ;;
    zechariah|zech|zec) echo "zc" ;;
    malachi|mal) echo "ml" ;;
    matthew|matt|mat) echo "mt" ;;
    mark|mrk) echo "mk" ;;
    luke|luk) echo "lk" ;;
    john|joh|jn) echo "jo" ;;
    acts|act) echo "act" ;;
    romans|rom) echo "rm" ;;
    "1 corinthians"|"1corinthians"|"1cor"|"1 cor"|"first corinthians"|"i corinthians") echo "1co" ;;
    "2 corinthians"|"2corinthians"|"2cor"|"2 cor"|"second corinthians"|"ii corinthians") echo "2co" ;;
    galatians|gal) echo "gl" ;;
    ephesians|eph) echo "eph" ;;
    philippians|phil|php) echo "ph" ;;
    colossians|col) echo "cl" ;;
    "1 thessalonians"|"1thessalonians"|"1thess"|"1 thess"|"first thessalonians"|"i thessalonians") echo "1ts" ;;
    "2 thessalonians"|"2thessalonians"|"2thess"|"2 thess"|"second thessalonians"|"ii thessalonians") echo "2ts" ;;
    "1 timothy"|"1timothy"|"1tim"|"1 tim"|"first timothy"|"i timothy") echo "1tm" ;;
    "2 timothy"|"2timothy"|"2tim"|"2 tim"|"second timothy"|"ii timothy") echo "2tm" ;;
    titus|tit) echo "tt" ;;
    philemon|phm|phlm) echo "phm" ;;
    hebrews|heb) echo "hb" ;;
    james|jas|jam) echo "jm" ;;
    "1 peter"|"1peter"|"1pet"|"1 pet"|"first peter"|"i peter") echo "1pe" ;;
    "2 peter"|"2peter"|"2pet"|"2 pet"|"second peter"|"ii peter") echo "2pe" ;;
    "1 john"|"1john"|"1jn"|"1 jn"|"first john"|"i john") echo "1jo" ;;
    "2 john"|"2john"|"2jn"|"2 jn"|"second john"|"ii john") echo "2jo" ;;
    "3 john"|"3john"|"3jn"|"3 jn"|"third john"|"iii john") echo "3jo" ;;
    jude) echo "jd" ;;
    revelation|rev|revelations) echo "re" ;;
    *) echo "$input" ;;
  esac
}

# Map book name to audio folder and file pattern
# Returns: folder|prefix|format
# format: 01 = two digit, 1 = single digit, none = no chapter number
_bible_audio_map() {
  local input=$(echo "$1" | tr '[:upper:]' '[:lower:]' | sed 's/^ *//;s/ *$//')
  case "$input" in
    genesis|gen|gn) echo "genesis|genesis|01" ;;
    exodus|exo|exod|ex) echo "exodus|exodus|01" ;;
    leviticus|lev|lv) echo "leviticus|Leviticus|01" ;;
    numbers|num|nm) echo "Numbers|Numbers|01" ;;
    deuteronomy|deut|deu|dt) echo "Deuteronomy|Deuteronomy|01" ;;
    joshua|josh|jos|js) echo "Joshua|Joshua|01" ;;
    judges|judg|jud) echo "Judges|Judges|01" ;;
    ruth|rt) echo "Ruth|Ruth|1" ;;
    "1 samuel"|"1samuel"|"1sam"|"1 sam"|"first samuel"|"i samuel"|1sm) echo "1_Samuel|FirstSamuel|01" ;;
    "2 samuel"|"2samuel"|"2sam"|"2 sam"|"second samuel"|"ii samuel"|2sm) echo "2_Samuel|SecondSamuel|01" ;;
    "1 kings"|"1kings"|"1kgs"|"1 kgs"|"first kings"|"i kings"|1kgs) echo "1_Kings|FirstKings|01" ;;
    "2 kings"|"2kings"|"2kgs"|"2 kgs"|"second kings"|"ii kings"|2kgs) echo "2_Kings|SecondKings|01" ;;
    "1 chronicles"|"1chronicles"|"1chr"|"1 chr"|"first chronicles"|"i chronicles"|1ch) echo "1_Chronicles|FirstChronicles|01" ;;
    "2 chronicles"|"2chronicles"|"2chr"|"2 chr"|"second chronicles"|"ii chronicles"|2ch) echo "2_Chronicles|SecondChronicles|01" ;;
    ezra|ezr) echo "Ezra|Ezra|01" ;;
    nehemiah|neh|ne) echo "Nehemiah|Nehemiah|01" ;;
    esther|est|et) echo "Esther|Esther|01" ;;
    job) echo "Job|Job|01" ;;
    psalms|psalm|psa|ps) echo "Psalms|Psalms|01" ;;
    proverbs|prov|pro|prv) echo "proverbs|Proverbs|01" ;;
    ecclesiastes|eccl|ecc|ec) echo "Ecclesiastes|Ecc|01" ;;
    "song of solomon"|"song of songs"|"song"|"sos"|"songs"|so) echo "Song_of_Solomon|Song|1" ;;
    isaiah|isa|is) echo "Isaiah|Isaiah|01" ;;
    jeremiah|jer|jr) echo "Jeremiah|Jeremiah|01" ;;
    lamentations|lam|lm) echo "Lamentations|Lamentations|1" ;;
    ezekiel|ezek|eze|ez) echo "Ezekiel|Ezekiel|01" ;;
    daniel|dan|dn) echo "Daniel|Daniel|01" ;;
    hosea|hos|ho) echo "Hosea|Hosea|01" ;;
    joel|jl) echo "joel|Joel|1" ;;
    amos|am) echo "amos|Amos|1" ;;
    obadiah|oba|ob) echo "Obadiah|Obadiah|none" ;;
    jonah|jon|jn) echo "Jonah|Jonah|1" ;;
    micah|mic|mi) echo "Micah|Micah|1" ;;
    nahum|nah|na) echo "Nahum|Nahum|1" ;;
    habakkuk|hab|hk) echo "Habakkuk|Habakkuk|1" ;;
    zephaniah|zeph|zep|zp) echo "Zephaniah|Zephaniah|1" ;;
    haggai|hag|hg) echo "Haggai|Haggai|1" ;;
    zechariah|zech|zec|zc) echo "Zechariah|Zechariah|01" ;;
    malachi|mal|ml) echo "Malachi|Malachi|1" ;;
    matthew|matt|mat|mt) echo "Matthew|matthew|01" ;;
    mark|mrk|mk) echo "Mark|Mark|01" ;;
    luke|luk|lk) echo "Luke|luke|01" ;;
    john|joh|jo) echo "john|john|01" ;;
    acts|act) echo "Acts|Acts|01" ;;
    romans|rom|rm) echo "Romans|romans|01" ;;
    "1 corinthians"|"1corinthians"|"1cor"|"1 cor"|"first corinthians"|"i corinthians"|1co) echo "1_Corinthians|1_Corinthians|01" ;;
    "2 corinthians"|"2corinthians"|"2cor"|"2 cor"|"second corinthians"|"ii corinthians"|2co) echo "2_Corinthians|2_corinthians|01" ;;
    galatians|gal|gl) echo "Galatians|galatians|1" ;;
    ephesians|eph) echo "Ephesians|ephesians|1" ;;
    philippians|phil|php|ph) echo "Philippians|philippians|1" ;;
    colossians|col|cl) echo "Colossians|colossians|1" ;;
    "1 thessalonians"|"1thessalonians"|"1thess"|"1 thess"|"first thessalonians"|"i thessalonians"|1ts) echo "1_Thessalonians|1_thessalonians|1" ;;
    "2 thessalonians"|"2thessalonians"|"2thess"|"2 thess"|"second thessalonians"|"ii thessalonians"|2ts) echo "2_Thessalonians|2_thessalonians|1" ;;
    "1 timothy"|"1timothy"|"1tim"|"1 tim"|"first timothy"|"i timothy"|1tm) echo "1_Timothy|1_timothy|1" ;;
    "2 timothy"|"2timothy"|"2tim"|"2 tim"|"second timothy"|"ii timothy"|2tm) echo "2_Timothy|2_timothy|1" ;;
    titus|tit|tt) echo "Titus|titus|1" ;;
    philemon|phm|phlm) echo "Philemon|57002 0_KJV_Bible-Philemon|none" ;;
    hebrews|heb|hb) echo "Hebrews|hebrews|01" ;;
    james|jas|jam|jm) echo "James|james|1" ;;
    "1 peter"|"1peter"|"1pet"|"1 pet"|"first peter"|"i peter"|1pe) echo "1_Peter|1-peter|1" ;;
    "2 peter"|"2peter"|"2pet"|"2 pet"|"second peter"|"ii peter"|2pe) echo "2_Peter|2-peter|1" ;;
    "1 john"|"1john"|"1jn"|"1 jn"|"first john"|"i john"|1jo) echo "1_John|1-john|1" ;;
    "2 john"|"2john"|"2jn"|"2 jn"|"second john"|"ii john"|2jo) echo "2_John|63007 0_KJV_Bible-2John|none" ;;
    "3 john"|"3john"|"3jn"|"3 jn"|"third john"|"iii john"|3jo) echo "3_john|64003 0_KJV_Bible-3John|none" ;;
    jude|jd) echo "Jude|Jude|1" ;;
    revelation|rev|revelations|re) echo "Revelation|Revelation|01" ;;
    *) echo "" ;;
  esac
}

# List all books
bible_books() {
  echo "Genesis (gen), Exodus (exo), Leviticus (lev), Numbers (num), Deuteronomy (deut)"
  echo "Joshua (josh), Judges (judg), Ruth, 1 Samuel (1sam), 2 Samuel (2sam)"
  echo "1 Kings (1kgs), 2 Kings (2kgs), 1 Chronicles (1chr), 2 Chronicles (2chr)"
  echo "Ezra, Nehemiah (neh), Esther (est), Job, Psalms (ps), Proverbs (prov)"
  echo "Ecclesiastes (ecc), Song of Solomon (song), Isaiah (isa), Jeremiah (jer)"
  echo "Lamentations (lam), Ezekiel (ezek), Daniel (dan), Hosea (hos), Joel, Amos"
  echo "Obadiah (oba), Jonah (jon), Micah (mic), Nahum (nah), Habakkuk (hab)"
  echo "Zephaniah (zeph), Haggai (hag), Zechariah (zech), Malachi (mal)"
  echo "Matthew (matt), Mark, Luke, John, Acts, Romans (rom)"
  echo "1 Corinthians (1cor), 2 Corinthians (2cor), Galatians (gal), Ephesians (eph)"
  echo "Philippians (phil), Colossians (col), 1 Thessalonians (1thess), 2 Thessalonians (2thess)"
  echo "1 Timothy (1tim), 2 Timothy (2tim), Titus (tit), Philemon (phm), Hebrews (heb)"
  echo "James (jas), 1 Peter (1pet), 2 Peter (2pet), 1 John (1jn), 2 John (2jn), 3 John (3jn)"
  echo "Jude, Revelation (rev)"
}

# State file for tracking current position
BIBLE_STATE="$HOME/.bible_state"
BIBLE_AUDIO_STATE="$HOME/.bible_audio_state"

# Get total chapters for a book
_bible_chapters() {
  local abbrev=$(_bible_abbrev "$1")
  jq -r --arg b "$abbrev" '.[] | select(.abbrev==$b) | .chapters | length' "$BIBLE_JSON"
}

# Read a chapter: bible genesis 1, bible gen 1, bible gn 1
# Also: bible next, bible prev
bible() {
  local book="$1"
  local chapter="${2:-1}"

  # Handle next/prev commands
  if [[ "$book" == "next" || "$book" == "prev" ]]; then
    if [[ ! -f "$BIBLE_STATE" ]]; then
      echo "No previous reading. Use: bible genesis 1"
      return 1
    fi
    source "$BIBLE_STATE"
    local total=$(_bible_chapters "$BIBLE_BOOK")
    if [[ "$book" == "next" ]]; then
      chapter=$((BIBLE_CHAPTER + 1))
      if [[ $chapter -gt $total ]]; then
        echo "End of $BIBLE_BOOK (chapter $total is the last)"
        return 1
      fi
    else
      chapter=$((BIBLE_CHAPTER - 1))
      if [[ $chapter -lt 1 ]]; then
        echo "Already at chapter 1"
        return 1
      fi
    fi
    book="$BIBLE_BOOK"
  fi

  local abbrev=$(_bible_abbrev "$book")

  # Save state
  echo "BIBLE_BOOK=\"$abbrev\"" > "$BIBLE_STATE"
  echo "BIBLE_CHAPTER=$chapter" >> "$BIBLE_STATE"

  # Display chapter
  echo "--- $abbrev $chapter ---"
  jq -r --arg b "$abbrev" --argjson c "$((chapter-1))" \
    '.[] | select(.abbrev==$b) | .chapters[$c] | to_entries | .[] | "\(.key+1). \(.value)"' \
    "$BIBLE_JSON" | fold -s -w 80 | less
}

# Search the Bible: bible_search "In the beginning"
bible_search() {
  jq -r --arg q "$1" \
    '.[] | .abbrev as $book | .chapters | to_entries[] | .key as $ch | .value | to_entries[] | select(.value | test($q; "i")) | "\($book) \($ch+1):\(.key+1) - \(.value)"' \
    "$BIBLE_JSON" | head -20
}

# Play Bible audio: bibleaudio genesis 1, bibleaudio gen 1
# Also: bibleaudio next, bibleaudio prev, bibleaudio stop
bibleaudio() {
  local book="$1"
  local chapter="${2:-1}"

  # Handle stop command
  if [[ "$book" == "stop" ]]; then
    pkill -f "afplay.*$BIBLE_AUDIO_DIR" 2>/dev/null && echo "Stopped playback" || echo "No audio playing"
    return 0
  fi

  # Handle next/prev commands
  if [[ "$book" == "next" || "$book" == "prev" ]]; then
    if [[ ! -f "$BIBLE_AUDIO_STATE" ]]; then
      echo "No previous audio. Use: bibleaudio genesis 1"
      return 1
    fi
    source "$BIBLE_AUDIO_STATE"

    if [[ "$book" == "next" ]]; then
      chapter=$((BIBLE_AUDIO_CHAPTER + 1))
    else
      chapter=$((BIBLE_AUDIO_CHAPTER - 1))
      if [[ $chapter -lt 1 ]]; then
        echo "Already at chapter 1"
        return 1
      fi
    fi
    book="$BIBLE_AUDIO_BOOK"
  fi

  # Get audio mapping
  local mapping=$(_bible_audio_map "$book")
  if [[ -z "$mapping" ]]; then
    echo "Unknown book: $book"
    echo "Use 'bible_books' to see available books"
    return 1
  fi

  local folder=$(echo "$mapping" | cut -d'|' -f1)
  local prefix=$(echo "$mapping" | cut -d'|' -f2)
  local format=$(echo "$mapping" | cut -d'|' -f3)

  # Build the file path
  local audio_file
  if [[ "$format" == "none" ]]; then
    audio_file="$BIBLE_AUDIO_DIR/$folder/${prefix}.mp3"
  elif [[ "$format" == "01" ]]; then
    audio_file="$BIBLE_AUDIO_DIR/$folder/${prefix}$(printf "%02d" $chapter).mp3"
  else
    audio_file="$BIBLE_AUDIO_DIR/$folder/${prefix}${chapter}.mp3"
  fi

  # Check if file exists
  if [[ ! -f "$audio_file" ]]; then
    echo "Audio file not found: $audio_file"
    # Try to list available files
    echo "Available chapters in $folder:"
    ls "$BIBLE_AUDIO_DIR/$folder/" 2>/dev/null | head -10
    return 1
  fi

  # Save state
  echo "BIBLE_AUDIO_BOOK=\"$book\"" > "$BIBLE_AUDIO_STATE"
  echo "BIBLE_AUDIO_CHAPTER=$chapter" >> "$BIBLE_AUDIO_STATE"

  # Stop any currently playing audio
  pkill -f "afplay.*$BIBLE_AUDIO_DIR" 2>/dev/null

  # Play the audio
  echo "Playing: $folder $chapter"
  echo "File: $audio_file"
  echo "(Press Ctrl+C to stop, or use 'bibleaudio stop')"

  afplay "$audio_file"
}

# Play audio in background
bibleaudio_bg() {
  local book="$1"
  local chapter="${2:-1}"

  # Stop any currently playing audio first
  pkill -f "afplay.*$BIBLE_AUDIO_DIR" 2>/dev/null

  # Get audio mapping
  local mapping=$(_bible_audio_map "$book")
  if [[ -z "$mapping" ]]; then
    echo "Unknown book: $book"
    return 1
  fi

  local folder=$(echo "$mapping" | cut -d'|' -f1)
  local prefix=$(echo "$mapping" | cut -d'|' -f2)
  local format=$(echo "$mapping" | cut -d'|' -f3)

  local audio_file
  if [[ "$format" == "none" ]]; then
    audio_file="$BIBLE_AUDIO_DIR/$folder/${prefix}.mp3"
  elif [[ "$format" == "01" ]]; then
    audio_file="$BIBLE_AUDIO_DIR/$folder/${prefix}$(printf "%02d" $chapter).mp3"
  else
    audio_file="$BIBLE_AUDIO_DIR/$folder/${prefix}${chapter}.mp3"
  fi

  if [[ ! -f "$audio_file" ]]; then
    echo "Audio file not found: $audio_file"
    return 1
  fi

  # Save state
  echo "BIBLE_AUDIO_BOOK=\"$book\"" > "$BIBLE_AUDIO_STATE"
  echo "BIBLE_AUDIO_CHAPTER=$chapter" >> "$BIBLE_AUDIO_STATE"

  echo "Playing in background: $folder $chapter"
  afplay "$audio_file" &
  echo "Use 'bibleaudio stop' to stop playback"
}
