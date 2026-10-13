"""Instant chatbot answers with no model call: understanding the rider's message and replying from the app's data.

Works for English, Gujarati and Hindi, including Gujarati/Hindi typed in Latin letters. A few milliseconds.
Sections: station names in local scripts, message understanding (language, stations, intent), reply templates.
"""
import difflib
import re
from typing import Dict, List, Optional, Tuple

from metro import timetable
from metro.network import get_all_stations


# ==================================================================================================
# Station names in Gujarati and Hindi, plus extra English spellings riders actually type
# ==================================================================================================

# canonical -> (Gujarati, Hindi)
NAMES_LOCAL = {
    "APMC": ("એપીએમસી", "एपीएमसी"),
    "Jivraj Park": ("જીવરાજ પાર્ક", "जीवराज पार्क"),
    "Rajivnagar": ("રાજીવનગર", "राजीवनगर"),
    "Shreyas": ("શ્રેયસ", "श्रेयस"),
    "Paldi": ("પાલડી", "पालडी"),
    "Gandhigram": ("ગાંધીગ્રામ", "गांधीग्राम"),
    "Old High Court": ("ઓલ્ડ હાઈકોર્ટ", "ओल्ड हाईकोर्ट"),
    "Usmanpura": ("ઉસ્માનપુરા", "उस्मानपुरा"),
    "Vijaynagar": ("વિજયનગર", "विजयनगर"),
    "Vadaj": ("વાડજ", "वाडज"),
    "Ranip": ("રાણીપ", "राणिप"),
    "Sabarmati Railway Station": ("સાબરમતી રેલવે સ્ટેશન", "साबरमती रेलवे स्टेशन"),
    "AEC": ("એઈસી", "एईसी"),
    "Sabarmati": ("સાબરમતી", "साबरमती"),
    "Motera Stadium": ("મોટેરા સ્ટેડિયમ", "मोटेरा स्टेडियम"),
    "Koteshwar Road": ("કોટેશ્વર રોડ", "कोटेश्वर रोड"),
    "Thaltej Gam": ("થલતેજ ગામ", "थलतेज गाम"),
    "Thaltej": ("થલતેજ", "थलतेज"),
    "Doordarshan Kendra": ("દૂરદર્શન કેન્દ્ર", "दूरदर्शन केंद्र"),
    "Gurukul Road": ("ગુરુકુળ રોડ", "गुरुकुल रोड"),
    "Gujarat University": ("ગુજરાત યુનિવર્સિટી", "गुजरात यूनिवर्सिटी"),
    "Commerce Six Road": ("કોમર્સ સિક્સ રોડ", "कॉमर्स सिक्स रोड"),
    "SP Stadium": ("એસપી સ્ટેડિયમ", "एसपी स्टेडियम"),
    "Shahpur": ("શાહપુર", "शाहपुर"),
    "Ghee Kanta": ("ઘીકાંટા", "घीकांटा"),
    "Kalupur Railway Station": ("કાલુપુર રેલવે સ્ટેશન", "कालूपुर रेलवे स्टेशन"),
    "Kankaria East": ("કાંકરિયા ઈસ્ટ", "कांकरिया ईस्ट"),
    "Apparel Park": ("એપેરલ પાર્ક", "अपैरल पार्क"),
    "Amraivadi": ("અમરાઈવાડી", "अमराईवाड़ी"),
    "Rabari Colony": ("રબારી કોલોની", "रबारी कॉलोनी"),
    "Vastral": ("વસ્ત્રાલ", "वस्त्राल"),
    "Nirant Cross Road": ("નિરાંત ક્રોસ રોડ", "निरांत क्रॉस रोड"),
    "Vastral Gam": ("વસ્ત્રાલ ગામ", "वस्त्राल गाम"),
    "Vishvakarma College": ("વિશ્વકર્મા કોલેજ", "विश्वकर्मा कॉलेज"),
    "Tapovan Circle": ("તપોવન સર્કલ", "तपोवन सर्कल"),
    "Narmada Canal": ("નર્મદા કેનાલ", "नर्मदा कैनाल"),
    "Koba Circle": ("કોબા સર્કલ", "कोबा सर्कल"),
    "Juna Koba": ("જૂના કોબા", "जूना कोबा"),
    "Koba Gam": ("કોબા ગામ", "कोबा गाम"),
    "GNLU": ("જીએનએલયુ", "जीएनएलयू"),
    "Raysan": ("રાયસણ", "रायसण"),
    "Randesan": ("રાંદેસણ", "रांदेसण"),
    "Dholakuva Circle": ("ઢોલાકુવા સર્કલ", "ढोलाकुआ सर्कल"),
    "Infocity": ("ઇન્ફોસિટી", "इन्फोसिटी"),
    "Sector-1": ("સેક્ટર 1", "सेक्टर 1"),
    "Sector-10A": ("સેક્ટર 10A", "सेक्टर 10A"),
    "Sachivalaya": ("સચિવાલય", "सचिवालय"),
    "Akshardham": ("અક્ષરધામ", "अक्षरधाम"),
    "Juna Sachivalaya": ("જૂના સચિવાલય", "पुराना सचिवालय"),
    "Sector-16": ("સેક્ટર 16", "सेक्टर 16"),
    "Sector-24": ("સેક્ટર 24", "सेक्टर 24"),
    "Mahatma Mandir": ("મહાત્મા મંદિર", "महात्मा मंदिर"),
    "PDEU": ("પીડીઈયુ", "पीडीईयू"),
    "Gift City": ("ગિફ્ટ સિટી", "गिफ्ट सिटी"),
}

# Extra Latin spellings (lowercase). Canonical names are added automatically.
EXTRA_LATIN = {
    "Infocity": ["info city", "infosity"],
    "Gift City": ["giftcity", "gift", "gifty city"],
    "SP Stadium": ["s p stadium", "sp stadium", "sardar patel stadium"],
    "Motera Stadium": ["motera", "narendra modi stadium", "modi stadium"],
    "Old High Court": ["high court", "highcourt", "old highcourt"],
    "Kalupur Railway Station": ["kalupur", "kalupur station", "ahmedabad railway station"],
    "Sabarmati Railway Station": ["sabarmati station", "sabarmati railway"],
    "Kankaria East": ["kankaria", "kankaria lake"],
    "Ghee Kanta": ["gheekanta", "ghee-kanta"],
    "Mahatma Mandir": ["mahatmamandir", "mahatma mandir station"],
    "Sector-10A": ["sector 10a", "sector10a", "sector 10"],
    "Sector-1": ["sector 1", "sector1"],
    "Sector-16": ["sector 16", "sector16"],
    "Sector-24": ["sector 24", "sector24"],
    "Thaltej Gam": ["thaltej village"],
    "Vastral Gam": ["vastral village"],
    "Koba Gam": ["koba village"],
    "Gujarat University": ["gujarat uni", "gu"],
    "Commerce Six Road": ["commerce six roads", "commerce 6 road", "c6 road"],
    "Doordarshan Kendra": ["doordarshan", "dd kendra"],
    "Vishvakarma College": ["vishwakarma college", "vgec"],
    "Nirant Cross Road": ["nirant", "nirant crossroad"],
    "Amraivadi": ["amraiwadi", "amraivadi", "amrai wadi"],
    "Rabari Colony": ["rabari"],
    "Apparel Park": ["apparel"],
    "Dholakuva Circle": ["dholakuva", "dholakua circle"],
    "Juna Sachivalaya": ["old sachivalaya"],
    "Jivraj Park": ["jivrajpark", "jivraj"],
    "Koteshwar Road": ["koteshwar", "koteshwar rd"],
    "Tapovan Circle": ["tapovan"],
    "Narmada Canal": ["narmada kenal"],
}

# Lines in the rider's language.
LINE_LOCAL = {
    "Red Line": ("લાલ લાઇન", "लाल लाइन"),
    "Blue Line": ("વાદળી લાઇન", "नीली लाइन"),
    "Yellow Line": ("પીળી લાઇન", "पीली लाइन"),
    "Violet Line": ("જાંબલી લાઇન", "बैंगनी लाइन"),
}


# ==================================================================================================
# Understanding: language, stations mentioned, simple intents
# ==================================================================================================

# ---------------------------------------------------------------- text normalisation

# Fold long/short vowel variants so "ઇન્ફોસિટી" and "ઈન્ફોસિટી" compare equal.
_FOLD = str.maketrans({
    "ી": "િ", "ૂ": "ુ", "ઈ": "ઇ", "ઊ": "ઉ",  # Gujarati
    "ी": "ि", "ू": "ु", "ई": "इ", "ऊ": "उ", "ँ": "ं",  # Devanagari
    "़": None, "​": None, "‌": None, "‍": None,
})
_PUNCT = re.compile(r"[\s\-_.,;:!?()\[\]{}\"'/\\|]+")


def normalise(text: str) -> str:
    return _PUNCT.sub(" ", (text or "").lower().translate(_FOLD)).strip()


def _is_local(ch: str) -> bool:
    return "ऀ" <= ch <= "෿"


# ---------------------------------------------------------------- language

_GU_STRONG = {"bhadu", "bhaadu", "bhado", "bhada", "ketlu", "ketla", "ketlo", "thay", "thai", "javanu", "chhe", "kyan", "kyathi",
              "mane", "mare", "joiye", "shu", "sudhi", "kevi", "thi", "kem", "cho", "chho", "tamne", "amare", "aapo", "batavo"}
_HI_STRONG = {"kiraya", "kitna", "kitne", "kitni", "kaise", "kahan", "kahaan", "mujhe", "hai", "hain", "jana", "jaana", "tak", "kya",
              "chahiye", "batao", "bataiye", "hoga", "karna", "kaun", "kidhar", "namaste"}


def detect_language(text: str) -> str:
    """'gu', 'hi' or 'en'."""
    gu = sum("઀" <= c <= "૿" for c in text)
    hi = sum("ऀ" <= c <= "ॿ" for c in text)
    if gu or hi:
        return "gu" if gu >= hi else "hi"
    words = set(normalise(text).split())
    gu_score, hi_score = len(words & _GU_STRONG), len(words & _HI_STRONG)
    if gu_score == 0 and hi_score == 0:
        return "en"
    return "hi" if hi_score > gu_score else "gu"


# ---------------------------------------------------------------- stations

# Words that must never be fuzzy-matched to a station.
_NOT_STATIONS = {"metro", "station", "stations", "fare", "ticket", "route", "price", "from", "going", "where", "please", "which", "line",
                 "ahmedabad", "gandhinagar", "bhadu", "javanu", "ketlu", "thay", "stop", "stops", "travel", "reach", "cost", "time",
                 "timing", "timings", "card", "nearest", "nearby", "lines", "railway", "road", "circle", "park", "gam", "college"}

_latin_index: Dict[str, str] = {}
_local_index: List[Tuple[str, str]] = []  # (normalised local alias, canonical), longest first


def _build_indexes() -> None:
    stations = get_all_stations()
    for name in stations:
        aliases = {normalise(name), *(normalise(a) for a in EXTRA_LATIN.get(name, []))}
        for alias in list(aliases):
            if " " in alias:
                aliases.add(alias.replace(" ", ""))
        for alias in aliases:
            _latin_index.setdefault(alias, name)
        for local in NAMES_LOCAL.get(name, ()):
            _local_index.append((normalise(local), name))
    _local_index.sort(key=lambda pair: -len(pair[0]))


_build_indexes()
_latin_keys = list(_latin_index)


def find_stations(text: str) -> List[str]:
    """Canonical station names mentioned in `text`, in the order they appear (no duplicates)."""
    norm = normalise(text)
    taken: List[Tuple[int, int]] = []
    found: List[Tuple[int, str]] = []

    def free(start: int, end: int) -> bool:
        return all(end <= s or start >= e for s, e in taken)

    def take(start: int, end: int, name: str) -> None:
        taken.append((start, end))
        found.append((start, name))

    # Gujarati / Hindi script: substring match (suffixes like "થી" are glued to the name), longest alias first.
    if any(_is_local(c) for c in norm):
        for alias, name in _local_index:
            start = norm.find(alias)
            while start != -1:
                end = start + len(alias)
                glued_digit = alias[-1].isdigit() and end < len(norm) and norm[end].isdigit()
                if free(start, end) and not glued_digit:
                    take(start, end, name)
                    break
                start = norm.find(alias, start + 1)

    # Latin script: word n-grams, exact first, then fuzzy for typos.
    tokens = [(m.group(), m.start(), m.end()) for m in re.finditer(r"\S+", norm) if not any(_is_local(c) for c in m.group())]
    for fuzzy in (False, True):
        for n in (4, 3, 2, 1):
            for i in range(len(tokens) - n + 1):
                window = tokens[i:i + n]
                start, end = window[0][1], window[-1][2]
                if not free(start, end):
                    continue
                phrase = " ".join(t[0] for t in window)
                if not fuzzy:
                    name = _latin_index.get(phrase)
                else:
                    if len(phrase) < 5 or phrase in _NOT_STATIONS or (n == 1 and phrase in _NOT_STATIONS):
                        continue
                    close = [k for k in difflib.get_close_matches(phrase, _latin_keys, n=3, cutoff=0.8) if k[0] == phrase[0]]
                    name = _latin_index[close[0]] if close else None
                if name:
                    take(start, end, name)

    ordered: List[str] = []
    for _, name in sorted(found):
        if name not in ordered:
            ordered.append(name)
    # "to Y from X" reads backwards.
    if len(ordered) == 2 and re.search(r"\bto\b.+\bfrom\b", norm):
        ordered.reverse()
    return ordered


# ---------------------------------------------------------------- intents

_FARE = re.compile(
    r"\b(fare|fares|price|cost|charge|charges|rate|how much|ticket|tickets|bhadu|bhaadu|bhado|bhada|kiraya|kiraaya)\b"
    r"|ભાડ|ટિકિટ|કિંમત|किराया|टिकट|कीमत|दाम"
)
_DURATION = re.compile(r"\b(how long|duration|how much time|minutes|samay|vakht|vakhat|time lage|time lagse|lagse)\b|સમય|વાર લાગ|समय|कितनी देर")
# Words that clearly ask for directions or a line breakdown...
_ROUTE_STRONG = re.compile(
    r"\b(route|routes|direction|directions|which line|interchange|interchanges|change|transfer|stations? between|how many stations|distance|"
    r"how (do|to|can) (i |we )?(go|get|reach)|rasta|raasta|kaise)\b|રૂટ|રસ્તો|માર્ગ|અંતર|કઈ લાઇન|કેવી રીતે|"
    r"कैसे|मार्ग|रास्ता|दूरी|कौन सी लाइन"
)
# ...versus plain "going to" words, which accompany fare questions too ("javanu bhadu ketlu").
_ROUTE_WEAK = re.compile(r"\b(reach|travel|go|going|javanu|javu|jaay|jaye)\b|જવું|જવાનું|પહોંચ|जाना|जाएं|पहुँच|पहुंच")
_GREETING = re.compile(
    r"^(?:(?:hi+|hello+|hey+|namaste|namaskar|kem cho|kem chho|good (?:morning|afternoon|evening)|jai shree krishna)\b"
    r"|નમસ્તે|નમસ્કાર|કેમ છો|હેલો|हेलो|नमस्ते|नमस्कार)"
)
_NEARBY = re.compile(
    r"\b(nearest|nearby|near me|closest|najik|najeek|nazdik|nazdeek|paas)\b|નજીક|પાસે|नज़दीक|नजदीक|पास"
)
_STATION_WORD = re.compile(r"\b(station|stations|metro)\b|સ્ટેશન|મેટ્રો|स्टेशन|मेट्रो")


_FILLER = {"", "station", "metro", "metro station", "stn", "stop"}


def only_station(norm: str, station: str) -> bool:
    """True if the message is nothing but this station's name (plus words like 'station')."""
    aliases = {alias for alias, name in _latin_index.items() if name == station}
    aliases |= {alias for alias, name in _local_index if name == station}
    leftover = norm
    for alias in sorted(aliases, key=len, reverse=True):
        leftover = leftover.replace(alias, " ")
    return " ".join(leftover.split()) in _FILLER


def detect_intent(text: str, stations: List[str]) -> Optional[str]:
    """'greeting', 'nearby', 'fare' or 'route'; None means "let the language model handle it"."""
    norm = normalise(text)
    words = norm.split()

    if not stations and len(words) <= 4 and _GREETING.search(norm):
        return "greeting"
    if not stations and _NEARBY.search(norm) and _STATION_WORD.search(norm):
        return "nearby"
    if not stations or _DURATION.search(norm):
        return None

    wants_fare = bool(_FARE.search(norm))
    strong_route = bool(_ROUTE_STRONG.search(norm))
    wants_route = strong_route or bool(_ROUTE_WEAK.search(norm))
    if len(stations) >= 2:
        if strong_route or (wants_route and not wants_fare):
            return "route"
        if wants_fare:
            return "fare"
        # Just two stations ("paldi thaltej", "paldi to thaltej") is a journey query.
        if len(words) <= 6:
            return "route"
        return None
    # A lone station name ("paldi", "gift city station") is the start of a journey question.
    if only_station(norm, stations[0]):
        return "route"
    # One station and a fare/route word: the reply asks for the other end.
    return "route" if strong_route else "fare" if wants_fare else "route" if wants_route else None


# ==================================================================================================
# Replies in English, Gujarati and Hindi, built from route and fare data
# ==================================================================================================

_LANG_INDEX = {"gu": 0, "hi": 1}


def station_label(name: str, lang: str) -> str:
    if lang in _LANG_INDEX and name in NAMES_LOCAL:
        return NAMES_LOCAL[name][_LANG_INDEX[lang]]
    return name


def line_label(line: str, lang: str) -> str:
    if lang in _LANG_INDEX and line in LINE_LOCAL:
        return LINE_LOCAL[line][_LANG_INDEX[lang]]
    return line


def _km(distance: float) -> str:
    return f"{distance:.1f}".rstrip("0").rstrip(".")


# ---------------------------------------------------------------- one-line replies

GREETING = {
    "en": "Hi! I can help with metro fares, routes, timings, tickets and facilities. Try: \"Fare from Paldi to Thaltej\".",
    "gu": "નમસ્તે! હું મેટ્રોનું ભાડું, રૂટ, સમય, ટિકિટ અને સુવિધાઓ વિશે મદદ કરી શકું છું. પૂછો: \"પાલડીથી થલતેજ ભાડું કેટલું?\"",
    "hi": "नमस्ते! मैं मेट्रो का किराया, रूट, समय, टिकट और सुविधाओं में मदद कर सकता हूँ। पूछें: \"पालडी से थलतेज का किराया?\"",
}

NEARBY = {
    "en": "To find the stations closest to you, open /nearest-stations. It uses your location or any place you search for.",
    "gu": "તમારી સૌથી નજીકનું સ્ટેશન શોધવા /nearest-stations ખોલો. તે તમારા લોકેશન અથવા તમે શોધેલા સ્થળ પરથી શોધે છે.",
    "hi": "अपने सबसे नज़दीकी स्टेशन के लिए /nearest-stations खोलें। यह आपकी लोकेशन या खोजी गई जगह से स्टेशन ढूँढता है।",
}

ASK_OTHER_STATION = {
    "en": "I found {a}. Which station are you travelling to or from?",
    "gu": "મને {a} મળ્યું. તમે કયા સ્ટેશન સુધી (અથવા ક્યાંથી) જવા માંગો છો?",
    "hi": "मुझे {a} मिला। आप किस स्टेशन तक (या कहाँ से) जाना चाहते हैं?",
}

SAME_STATION = {
    "en": "Both stations are the same ({a}). Tell me a different destination.",
    "gu": "બંને સ્ટેશન એક જ છે ({a}). કૃપા કરીને અલગ સ્ટેશન જણાવો.",
    "hi": "दोनों स्टेशन एक ही हैं ({a})। कृपया अलग स्टेशन बताएं।",
}

FARE_UNAVAILABLE = {
    "en": "I couldn't find a fare for {a} to {b}. Check the fare at the station counter or on the Plan Journey page (/routes).",
    "gu": "{a}થી {b}નું ભાડું મળ્યું નથી. સ્ટેશન કાઉન્ટર પર અથવા /routes પેજ પર તપાસો.",
    "hi": "{a} से {b} का किराया नहीं मिला। स्टेशन काउंटर पर या /routes पेज पर देखें।",
}

DEGRADED = {
    "en": "The assistant is busy right now, so here is the closest information I have:",
    "gu": "સહાયક હાલમાં વ્યસ્ત છે, તેથી મારી પાસે સૌથી નજીકની માહિતી આ છે:",
    "hi": "सहायक अभी व्यस्त है, इसलिए मेरे पास सबसे करीबी जानकारी यह है:",
}

INTERRUPTED = {
    "en": "(The answer was cut off. Please ask again.)",
    "gu": "(જવાબ અધૂરો રહ્યો. કૃપા કરીને ફરી પૂછો.)",
    "hi": "(जवाब अधूरा रह गया। कृपया फिर से पूछें।)",
}


# ---------------------------------------------------------------- journey replies

def _facts(result: Dict, lang: str) -> str:
    km, stops, mins = _km(result["distance"]), len(result["route"]), timetable.journey_minutes(result["legs"])
    changes = ", ".join(station_label(s, lang) for s in result["interchanges"])
    if lang == "gu":
        text = f"અંતર લગભગ {km} કિમી, {stops} સ્ટેશન, આશરે {mins} મિનિટ."
        return text + (f" {changes} પર લાઇન બદલવી પડશે." if changes else " લાઇન બદલવાની જરૂર નથી.")
    if lang == "hi":
        text = f"दूरी लगभग {km} किमी, {stops} स्टेशन, लगभग {mins} मिनट।"
        return text + (f" {changes} पर लाइन बदलनी होगी।" if changes else " लाइन बदलने की जरूरत नहीं।")
    text = f"About {km} km, {stops} stations, roughly {mins} min."
    return text + (f" Change lines at {changes}." if changes else " No line change needed.")


def fare_reply(src: str, dst: str, fare: Optional[int], result: Dict, lang: str) -> str:
    a, b = station_label(src, lang), station_label(dst, lang)
    if fare is None:
        return FARE_UNAVAILABLE[lang].format(a=a, b=b)
    head = {
        "en": f"Fare from {a} to {b}: ₹{fare}.",
        "gu": f"{a}થી {b} સુધીનું ભાડું ₹{fare} છે.",
        "hi": f"{a} से {b} तक का किराया ₹{fare} है।",
    }[lang]
    return f"{head}\n{_facts(result, lang)}"


def route_reply(src: str, dst: str, fare: Optional[int], result: Dict, lang: str) -> str:
    a, b = station_label(src, lang), station_label(dst, lang)
    head = {
        "en": f"{a} to {b}" + (f", fare ₹{fare}." if fare is not None else "."),
        "gu": f"{a}થી {b}" + (f", ભાડું ₹{fare}." if fare is not None else "."),
        "hi": f"{a} से {b}" + (f", किराया ₹{fare}।" if fare is not None else "।"),
    }[lang]

    steps: List[str] = []
    for i, leg in enumerate(result["legs"], 1):
        line, start, end, stops = line_label(leg["line"], lang), station_label(leg["from"], lang), station_label(leg["to"], lang), leg["stops"]
        if lang == "gu":
            steps.append(f"{i}. {line}: {start}થી {end} ({stops} સ્ટોપ)")
        elif lang == "hi":
            steps.append(f"{i}. {line}: {start} से {end} ({stops} स्टॉप)")
        else:
            steps.append(f"{i}. {line}: {start} to {end} ({stops} stop{'s' if stops != 1 else ''})")

    km, count, mins = _km(result["distance"]), len(result["route"]), timetable.journey_minutes(result["legs"])
    tail = {
        "en": f"About {km} km, {count} stations, roughly {mins} min.",
        "gu": f"અંતર લગભગ {km} કિમી, {count} સ્ટેશન, આશરે {mins} મિનિટ.",
        "hi": f"दूरी लगभग {km} किमी, {count} स्टेशन, लगभग {mins} मिनट।",
    }[lang]
    if timetable.through_service(result["legs"]):
        steps.append({
            "en": "Through trains run all the way, so you can stay on board (times on /schedule).",
            "gu": "સીધી ટ્રેન આખા રૂટ પર જાય છે, ટ્રેન બદલવાની જરૂર નથી (સમય /schedule પર).",
            "hi": "सीधी ट्रेन पूरे रूट पर जाती है, ट्रेन बदलने की जरूरत नहीं (समय /schedule पर)।",
        }[lang])
    return "\n".join([head, *steps, tail])
