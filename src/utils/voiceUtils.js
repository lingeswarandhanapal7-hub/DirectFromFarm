/**
 * Tamil Voice Utility
 * Handles Web Speech API with Tamil voice detection and fallback
 */

// Cache voices once loaded
let _voices = [];
let _voicesLoaded = false;

function loadVoices() {
    return new Promise((resolve) => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            _voices = voices;
            _voicesLoaded = true;
            resolve(voices);
            return;
        }
        // Voices not ready yet — wait for the event
        window.speechSynthesis.onvoiceschanged = () => {
            _voices = window.speechSynthesis.getVoices();
            _voicesLoaded = true;
            resolve(_voices);
        };
        // Safety timeout: 3 seconds
        setTimeout(() => {
            if (!_voicesLoaded) {
                _voices = window.speechSynthesis.getVoices();
                _voicesLoaded = true;
                resolve(_voices);
            }
        }, 3000);
    });
}

// Get the best available voice for Tamil
export function getTamilVoice(voices) {
    const v = voices || _voices;
    return (
        v.find(x => x.lang === 'ta-IN') ||
        v.find(x => x.lang === 'ta') ||
        v.find(x => x.lang.startsWith('ta')) ||
        // Fallback: Hindi (widely available on Windows)
        v.find(x => x.lang === 'hi-IN') ||
        v.find(x => x.lang.startsWith('hi')) ||
        // Last resort: Indian English
        v.find(x => x.lang === 'en-IN') ||
        v.find(x => x.lang.startsWith('en')) ||
        null
    );
}

// Check if Tamil voice is available
export function hasTamilVoice() {
    return _voices.some(v => v.lang.startsWith('ta'));
}

// List all available voices (for debugging)
export function listVoices() {
    return _voices;
}

/**
 * Speak text with best available voice
 * @param {string} text - Text to speak
 * @param {object} options
 * @param {function} options.onStart - Called when speech starts
 * @param {function} options.onEnd   - Called when speech ends
 * @param {function} options.onError - Called on error
 */
export async function speakTamil(text, { onStart, onEnd, onError } = {}) {
    if (!window.speechSynthesis) {
        console.warn('[Voice] Speech synthesis not supported');
        onError?.('not-supported');
        return;
    }

    // Stop anything currently playing
    window.speechSynthesis.cancel();

    // Wait until voices are loaded
    const voices = await loadVoices();
    const voice = getTamilVoice(voices);

    console.log('[Voice] Available voices:', voices.map(v => `${v.name} (${v.lang})`));
    console.log('[Voice] Selected voice:', voice ? `${voice.name} (${voice.lang})` : 'none — using browser default');

    const utt = new SpeechSynthesisUtterance(text);

    if (voice) {
        utt.voice = voice;
        utt.lang = voice.lang;
    } else {
        utt.lang = 'ta-IN';
    }

    utt.rate = 0.85;
    utt.pitch = 1.0;
    utt.volume = 1.0;

    utt.onstart = () => {
        console.log('[Voice] Speech started');
        onStart?.();
    };

    utt.onend = () => {
        console.log('[Voice] Speech ended');
        onEnd?.();
    };

    utt.onerror = (e) => {
        console.error('[Voice] Speech error:', e.error);
        onError?.(e.error);
    };

    // Chrome bug: speech can pause silently after ~15s
    const resumeTimer = setInterval(() => {
        if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
        }
    }, 10000);

    utt.onend = () => {
        clearInterval(resumeTimer);
        console.log('[Voice] Speech ended');
        onEnd?.();
    };

    window.speechSynthesis.speak(utt);
}

/**
 * Stop all speech
 */
export function stopSpeech() {
    window.speechSynthesis?.cancel();
}
