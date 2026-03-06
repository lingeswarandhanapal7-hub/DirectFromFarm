/**
 * Web Speech API wrapper for Tamil (ta-IN) speech recognition.
 * Falls back to English if browser doesn't support recognition.
 * Includes automatic retry on transient network errors.
 */

const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition || null;

export function isSpeechSupported() {
    return !!SpeechRecognition;
}

// ── Tamil number word → digit conversion ────────────────────────────────────
const TAMIL_NUMBER_MAP = {
    // Tamil words
    'பூஜ்யம்': '0', 'சுழியம்': '0',
    'ஒன்று': '1', 'ஒன்': '1',
    'இரண்டு': '2', 'இரண்': '2',
    'மூன்று': '3', 'மூன்': '3',
    'நான்கு': '4',
    'ஐந்து': '5', 'ஐஞ்சு': '5',
    'ஆறு': '6',
    'ஏழு': '7',
    'எட்டு': '8',
    'ஒன்பது': '9', 'ஒம்பது': '9',
    // English words (spoken in Tamil context)
    'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
    'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
};

/**
 * Convert spoken Tamil/English number words in `text` to digits.
 * Non-digit characters not matching a number word are stripped.
 * @param {string} text
 * @returns {string} digits only
 */
export function convertTamilNumbersToDigits(text) {
    // Replace each known word with its digit
    let result = text;
    for (const [word, digit] of Object.entries(TAMIL_NUMBER_MAP)) {
        // Use global replace; words may repeat (e.g. "ஒன்று ஒன்று")
        result = result.split(word).join(digit);
    }
    // Keep only digit characters (strip spaces, punctuation, unrecognised words)
    return result.replace(/[^0-9]/g, '');
}

/**
 * Start listening for speech and return the recognized text.
 * Automatically retries once on transient 'network' errors.
 *
 * @param {object} options
 * @param {string}   options.lang      - BCP-47 language tag, default 'ta-IN'
 * @param {function} options.onResult  - called with the recognized string
 * @param {function} options.onEnd     - called when recognition ends (no error)
 * @param {function} options.onError   - called with a human-readable error message
 * @param {number}   options.maxRetries - how many times to retry on 'network' error (default 2)
 * @returns {{ stop: function }} control object – call .stop() to cancel
 */
export function startListening({
    lang = 'ta-IN',
    onResult,
    onEnd,
    onError,
    maxRetries = 2,
    isPhoneField = false,
} = {}) {
    if (!SpeechRecognition) {
        onError?.('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
        return { stop: () => { } };
    }

    let retries = 0;
    let stopped = false;
    let recognition = null;

    function createRecognition() {
        const rec = new SpeechRecognition();
        rec.lang = lang;
        rec.interimResults = false;
        rec.maxAlternatives = 1;
        rec.continuous = false;

        rec.onresult = (event) => {
            const raw = event.results[0]?.[0]?.transcript || '';
            const transcript = raw.trim();
            if (isPhoneField) {
                onResult?.(convertTamilNumbersToDigits(transcript));
            } else {
                onResult?.(transcript);
            }
        };

        rec.onerror = (event) => {
            const err = event.error || 'unknown';

            // Transient network glitch → retry automatically
            if (err === 'network' && retries < maxRetries && !stopped) {
                retries++;
                console.warn(`[Mic] Network error – retrying (${retries}/${maxRetries})…`);
                setTimeout(() => {
                    if (!stopped) {
                        recognition = createRecognition();
                        recognition.start();
                    }
                }, 800);
                return;
            }

            // Map raw error codes to friendly messages
            const messages = {
                'network': 'No internet or mic server unreachable. Please check your connection and try again.',
                'not-allowed': 'Microphone access denied. Please allow mic permission in your browser.',
                'no-speech': 'No speech detected. Please speak clearly and try again.',
                'audio-capture': 'No microphone found. Please connect a mic and try again.',
                'aborted': 'Mic was stopped.',
                'service-not-allowed': 'Speech service not allowed. Please use HTTPS or try Chrome.',
            };
            onError?.(messages[err] || `Mic error: ${err}`);
        };

        rec.onend = () => {
            if (!stopped) onEnd?.();
        };

        return rec;
    }

    recognition = createRecognition();

    try {
        recognition.start();
    } catch (e) {
        onError?.('Could not start microphone: ' + e.message);
    }

    return {
        stop() {
            stopped = true;
            try { recognition?.stop(); } catch (_) { }
        },
    };
}
