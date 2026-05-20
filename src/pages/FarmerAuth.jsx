import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Beams from '../components/Beams';
import { speakTamil } from '../utils/voiceUtils';
import { startListening, isSpeechSupported } from '../utils/speechRecognition';

const FARMER_FIELDS_EN = [
    { key: 'name', label: 'Full Name', placeholder: 'Enter your full name', type: 'text' },
    { key: 'phone', label: 'Phone Number', placeholder: 'Enter your phone number', type: 'tel' },
    { key: 'village', label: 'Village / Town', placeholder: 'Enter your village or town', type: 'text' },
    { key: 'district', label: 'District', placeholder: 'Enter your district', type: 'text' },
    { key: 'password', label: 'Password', placeholder: 'Create a password', type: 'password' },
];

const FARMER_FIELDS_TA = [
    { key: 'name', label: 'முழு பெயர்', placeholder: 'உங்கள் முழு பெயரை உள்ளிடவும்', type: 'text', voice: 'உங்கள் முழு பெயரை சொல்லுங்கள்' },
    { key: 'phone', label: 'தொலைபேசி எண்', placeholder: 'தொலைபேசி எண்ணை உள்ளிடவும்', type: 'tel', voice: 'உங்கள் தொலைபேசி எண்ணை சொல்லுங்கள்' },
    { key: 'village', label: 'கிராமம் / நகரம்', placeholder: 'உங்கள் கிராமம் அல்லது நகரம்', type: 'text', voice: 'உங்கள் கிராமம் அல்லது நகரத்தை சொல்லுங்கள்' },
    { key: 'district', label: 'மாவட்டம்', placeholder: 'உங்கள் மாவட்டம்', type: 'text', voice: 'உங்கள் மாவட்டத்தை சொல்லுங்கள்' },
    { key: 'password', label: 'கடவுச்சொல்', placeholder: 'கடவுச்சொல் உருவாக்கவும்', type: 'password', voice: 'ஒரு கடவுச்சொல்லை உருவாக்கவும்' },
];

// ── Validation helpers ─────────────────────────────────────
function validateSignupField(key, value, isTamil) {
    const t = (en, ta) => isTamil ? ta : en;
    switch (key) {
        case 'name':
            if (!value.trim()) return t('Full name is required', 'பெயர் தேவை');
            if (value.trim().length < 2) return t('Name must be at least 2 characters', 'பெயர் குறைந்தது 2 எழுத்து வேண்டும்');
            return '';
        case 'phone':
            if (!value) return t('Phone number is required', 'தொலைபேசி எண் தேவை');
            if (!/^\+?[0-9]{7,15}$/.test(value)) return t('Enter a valid phone number (7–15 digits)', 'சரியான தொலைபேசி எண் உள்ளிடவும் (7–15 இலக்கம்)');
            return '';
        case 'village':
            if (!value.trim()) return t('Village / Town is required', 'கிராமம் / நகரம் தேவை');
            return '';
        case 'district':
            if (!value.trim()) return t('District is required', 'மாவட்டம் தேவை');
            return '';
        case 'password':
            if (!value) return t('Password is required', 'கடவுச்சொல் தேவை');
            if (value.length < 6) return t('Password must be at least 6 characters', 'கடவுச்சொல் குறைந்தது 6 எழுத்து வேண்டும்');
            return '';
        default:
            return '';
    }
}

function validateLoginField(key, value, isTamil) {
    const t = (en, ta) => isTamil ? ta : en;
    switch (key) {
        case 'phone':
            if (!value) return t('Phone number is required', 'தொலைபேசி எண் தேவை');
            return '';
        case 'password':
            if (!value) return t('Password is required', 'கடவுச்சொல் தேவை');
            return '';
        default:
            return '';
    }
}

// Reusable inline error tag
const FieldError = ({ msg }) =>
    msg ? (
        <div style={{ color: '#ff6b6b', fontSize: '12px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            ⚠️ {msg}
        </div>
    ) : null;

export default function FarmerAuth() {
    const navigate = useNavigate();
    const { registerFarmer, loginFarmer } = useApp();
    const [mode, setMode] = useState('login');
    const [isTamil, setIsTamil] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [voiceActive, setVoiceActive] = useState(false);
    const [form, setForm] = useState({ name: '', phone: '', village: '', district: '', password: '' });
    const [fieldErrors, setFieldErrors] = useState({});
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [listeningField, setListeningField] = useState(null);
    const [micRetrying, setMicRetrying] = useState(false);
    const recognizerRef = useRef(null);
    const micErrorTimerRef = useRef(null);
    const inputRefs = useRef([]);

    const fields = isTamil ? FARMER_FIELDS_TA : FARMER_FIELDS_EN;

    // ── Field-level change with live validation ────────────
    const handleFieldChange = (key, value, isPhone = false) => {
        const cleaned = isPhone ? value.replace(/[^0-9+]/g, '') : value;
        setForm(p => ({ ...p, [key]: cleaned }));
        // Clear field error as user types (re-validate only if already shown)
        if (fieldErrors[key]) {
            const err = mode === 'login'
                ? validateLoginField(key, cleaned, isTamil)
                : validateSignupField(key, cleaned, isTamil);
            setFieldErrors(p => ({ ...p, [key]: err }));
        }
    };

    // Validate all signup fields and return errors object
    const validateAllSignup = () => {
        const errors = {};
        for (const f of fields) {
            const err = validateSignupField(f.key, form[f.key], isTamil);
            if (err) errors[f.key] = err;
        }
        return errors;
    };

    const validateAllLogin = () => {
        const errors = {};
        for (const key of ['phone', 'password']) {
            const err = validateLoginField(key, form[key], isTamil);
            if (err) errors[key] = err;
        }
        return errors;
    };

    const speakField = (idx) => {
        if (!isTamil) return;
        const field = FARMER_FIELDS_TA[idx];
        if (!field) return;
        setIsSpeaking(true);
        speakTamil(field.voice, { onEnd: () => { setIsSpeaking(false); setTimeout(() => inputRefs.current[idx]?.focus(), 300); } });
    };

    const startVoiceWizard = () => {
        setVoiceActive(true);
        setCurrentStep(0);
        setForm({ name: '', phone: '', village: '', district: '', password: '' });
        setFieldErrors({});
        setTimeout(() => speakField(0), 500);
    };

    const handleVoiceNext = () => {
        if (currentStep < fields.length - 1) {
            const next = currentStep + 1;
            setCurrentStep(next);
            speakField(next);
        } else {
            handleSignup();
        }
    };

    // ── Mic helpers ───────────────────────────────────────
    const showMicError = (msg) => {
        let displayMsg = msg;
        if (isTamil) {
            if (msg.includes('No internet') || msg.includes('network')) {
                displayMsg = 'இணைய இணைப்பு இல்லை அல்லது குரல் சேவை தற்காலிகமாக கிடைக்கவில்லை. தட்டச்சு செய்து உள்ளிடலாம்.';
            } else if (msg.includes('Microphone access denied') || msg.includes('not-allowed')) {
                displayMsg = 'மைக்ரோஃபோன் அனுமதி மறுக்கப்பட்டது. பிரவுசரில் மைக் அனுமதியை வழங்கவும்.';
            } else if (msg.includes('No speech detected') || msg.includes('no-speech')) {
                displayMsg = 'குரல் எதுவும் கேட்கவில்லை. தயவுசெய்து தெளிவாக பேசவும்.';
            } else if (msg.includes('No microphone found') || msg.includes('audio-capture')) {
                displayMsg = 'மைக்ரோஃபோன் எதுவும் கிடைக்கவில்லை. மைக்கை இணைக்கவும்.';
            } else if (msg.includes('Speech service not allowed') || msg.includes('service-not-allowed')) {
                displayMsg = 'குரல் சேவை அனுமதிக்கப்படவில்லை. Chrome பிரவுசரைப் பயன்படுத்தவும்.';
            }
        } else {
            if (msg.includes('No internet') || msg.includes('network')) {
                displayMsg = 'No internet or mic server unreachable. You can still type directly in the fields.';
            }
        }
        setError(displayMsg);
        clearTimeout(micErrorTimerRef.current);
        micErrorTimerRef.current = setTimeout(() => setError(''), 5000);
    };

    // Block non-numeric keystroke on phone fields
    const blockNonNumeric = (e) => {
        const allowed = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
            'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
        if (allowed.includes(e.key)) return;
        if (e.ctrlKey || e.metaKey) return;
        if (!/^[0-9+]$/.test(e.key)) e.preventDefault();
    };

    const sanitizePhonePaste = (e) => {
        e.preventDefault();
        const pasted = (e.clipboardData || window.clipboardData).getData('text');
        const digits = pasted.replace(/[^0-9+]/g, '');
        setForm(p => ({ ...p, phone: (p.phone + digits).slice(0, 15) }));
    };

    const startMic = (fieldKey) => {
        if (!isSpeechSupported()) {
            showMicError('Speech recognition not supported. Please use Chrome or Edge.');
            return;
        }
        recognizerRef.current?.stop();
        setListeningField(fieldKey);
        setMicRetrying(false);
        recognizerRef.current = startListening({
            lang: isTamil ? 'ta-IN' : 'en-IN',
            maxRetries: 2,
            isPhoneField: fieldKey === 'phone',
            onResult: (text) => {
                setForm(p => ({ ...p, [fieldKey]: text }));
                setMicRetrying(false);
                // Clear field error after mic fill
                setFieldErrors(p => ({ ...p, [fieldKey]: '' }));
            },
            onEnd: () => { setListeningField(null); setMicRetrying(false); },
            onError: (msg) => {
                setListeningField(null);
                setMicRetrying(false);
                showMicError(msg);
            },
        });
    };

    const stopMic = () => {
        recognizerRef.current?.stop();
        setListeningField(null);
        setMicRetrying(false);
    };

    // ── Auth handlers ─────────────────────────────────────
    const handleSignup = async () => {
        setError('');
        const errors = validateAllSignup();
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            setError(isTamil ? 'தவறான உள்ளீடுகளை சரி செய்யவும்' : 'Please fix the errors above');
            return;
        }
        setFieldErrors({});
        setLoading(true);
        const result = await registerFarmer({ ...form, tamilEnabled: isTamil });
        setLoading(false);
        if (result.success) {
            setSuccess(isTamil ? `வரவேற்கிறோம் ${result.user.name}! உள்நுழைக.` : `Welcome ${result.user.name}! Please login.`);
            setTimeout(() => { setMode('login'); setSuccess(''); setForm({ name: '', phone: '', village: '', district: '', password: '' }); }, 2000);
        } else {
            // Map backend errors to field-level errors where possible
            const msg = result.error || 'Registration failed';
            if (msg.toLowerCase().includes('phone')) {
                setFieldErrors({ phone: isTamil ? 'இந்த தொலைபேசி எண் ஏற்கனவே பதிவு செய்யப்பட்டது' : 'This phone number is already registered' });
            }
            setError(msg);
        }
    };

    const handleLogin = async () => {
        setError('');
        const errors = validateAllLogin();
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }
        setFieldErrors({});
        setLoading(true);
        const result = await loginFarmer(form.phone, form.password);
        setLoading(false);
        if (result.success) {
            navigate('/farmer/dashboard');
        } else {
            const msg = result.error || 'Invalid phone or password';
            setError(isTamil ? 'தொலைபேசி எண் அல்லது கடவுச்சொல் தவறானது' : msg);
            // Highlight both fields on login failure
            setFieldErrors({
                phone: isTamil ? 'சரிபார்க்கவும்' : 'Check your phone number',
                password: isTamil ? 'சரிபார்க்கவும்' : 'Check your password',
            });
        }
    };

    const toggleTamilAndSpeak = () => {
        const newTamil = !isTamil;
        setIsTamil(newTamil);
        setFieldErrors({});
        if (newTamil) {
            speakTamil('நல்வரவு! விவசாயி பதிவு பக்கத்திற்கு வரவேற்கிறோம்');
        } else {
            setVoiceActive(false);
        }
    };

    // Reusable mic button
    const MicBtn = ({ fieldKey, isPassword }) => {
        if (isPassword || !isSpeechSupported()) return null;
        const active = listeningField === fieldKey;
        return (
            <button
                type="button"
                onClick={() => active ? stopMic() : startMic(fieldKey)}
                style={{
                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                    background: active ? 'rgba(255,50,50,0.8)' : 'rgba(76,175,114,0.2)',
                    border: `1px solid ${active ? '#ff6b6b' : 'rgba(76,175,114,0.4)'}`,
                    borderRadius: '8px', padding: '4px 8px', cursor: 'pointer', color: 'white', fontSize: '14px',
                    animation: active ? 'pulse 1s infinite' : 'none',
                }}
                title={active ? 'Stop listening' : `Speak ${fieldKey}`}
            >
                {active ? '🔴' : '🎤'}
            </button>
        );
    };

    // Shared input style with red border on error
    const inputStyle = (key) => ({
        paddingRight: '44px',
        borderColor: fieldErrors[key] ? '#ff6b6b' : undefined,
        boxShadow: fieldErrors[key] ? '0 0 0 2px rgba(255,107,107,0.25)' : undefined,
    });

    return (
        <div className="page-wrapper">
            <div className="beams-bg">
                <Beams beamWidth={3} beamHeight={30} beamNumber={15} lightColor="#4caf72" speed={1.5} noiseIntensity={1.75} scale={0.2} rotation={30} />
            </div>

            <div className="auth-container">
                <div className="auth-card">
                    <div className="auth-logo">
                        <div style={{ fontSize: '40px' }}>👨‍🌾</div>
                        <h1>Direct<span>From</span>Farm</h1>
                        <p className={isTamil ? 'tamil' : ''}>{isTamil ? 'விவசாயி நுழைவு' : 'Farmer Portal'}</p>
                    </div>

                    {/* Tamil Toggle */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', gap: '10px' }}>
                        <button className={`tamil-toggle ${isTamil ? 'active' : ''}`} onClick={toggleTamilAndSpeak}>
                            🌐 {isTamil ? 'தமிழ் ON' : 'தமிழில் மாற்று'}
                        </button>
                        {isTamil && (
                            <button className={`voice-btn ${isSpeaking ? 'speaking' : ''}`} onClick={() => speakField(currentStep)}>
                                🎤 {isSpeaking ? 'படிக்கிறது...' : 'கேளு'}
                            </button>
                        )}
                    </div>

                    {/* Mode Tabs */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '4px' }}>
                        {['login', 'signup'].map(m => (
                            <button key={m} onClick={() => { setMode(m); setError(''); setFieldErrors({}); setVoiceActive(false); }}
                                style={{
                                    flex: 1, padding: '10px', border: 'none', borderRadius: '8px', cursor: 'pointer',
                                    background: mode === m ? 'linear-gradient(135deg, #2d7a4f, #1a4a2e)' : 'transparent',
                                    color: mode === m ? 'white' : 'rgba(255,255,255,0.5)',
                                    fontWeight: 600, fontSize: '14px', fontFamily: 'inherit', transition: 'all 0.3s'
                                }}
                                className={isTamil ? 'tamil' : ''}
                            >
                                {m === 'login' ? (isTamil ? 'உள்நுழை' : 'Login') : (isTamil ? 'பதிவு செய்' : 'Sign Up')}
                            </button>
                        ))}
                    </div>

                    {error && <div className="alert alert-error">{error}</div>}
                    {micRetrying && <div className="alert" style={{ background: 'rgba(76,175,114,0.15)', border: '1px solid #4caf72', color: '#a8d5b5' }}>🎤 Connecting to mic… retrying</div>}
                    {success && <div className="alert alert-success">{success}</div>}

                    {/* ── LOGIN FORM ── */}
                    {mode === 'login' && (
                        <div>
                            {[
                                { key: 'phone', label: isTamil ? 'தொலைபேசி எண்' : 'Phone Number', type: 'tel', placeholder: isTamil ? 'தொலைபேசி எண்' : 'Phone number' },
                                { key: 'password', label: isTamil ? 'கடவுச்சொல்' : 'Password', type: 'password', placeholder: isTamil ? 'கடவுச்சொல்' : 'Password' },
                            ].map(f => (
                                <div className="form-group" key={f.key}>
                                    <label className={`form-label ${isTamil ? 'tamil' : ''}`}>{f.label}</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            className={`form-input ${isTamil ? 'tamil' : ''}`}
                                            type={f.type}
                                            inputMode={f.key === 'phone' ? 'numeric' : undefined}
                                            placeholder={f.placeholder}
                                            value={form[f.key]}
                                            onChange={e => handleFieldChange(f.key, e.target.value, f.key === 'phone')}
                                            onKeyDown={f.key === 'phone'
                                                ? (e) => { blockNonNumeric(e); if (e.key === 'Enter') handleLogin(); }
                                                : (e) => e.key === 'Enter' && handleLogin()}
                                            onPaste={f.key === 'phone' ? sanitizePhonePaste : undefined}
                                            style={inputStyle(f.key)}
                                        />
                                        <MicBtn fieldKey={f.key} isPassword={f.type === 'password'} />
                                    </div>
                                    <FieldError msg={fieldErrors[f.key]} />
                                </div>
                            ))}
                            <button className="btn btn-primary btn-full btn-lg" onClick={handleLogin} disabled={loading}>
                                {loading ? <span className="spinner" /> : (isTamil ? '🌾 உள்நுழை' : '🌾 Login as Farmer')}
                            </button>
                            <button className="btn btn-outline btn-full" style={{ marginTop: '10px' }} onClick={() => navigate('/')}>
                                ← {isTamil ? 'திரும்பு' : 'Back'}
                            </button>
                        </div>
                    )}

                    {/* ── SIGNUP FORM ── */}
                    {mode === 'signup' && (
                        <div>
                            {isTamil && !voiceActive && (
                                <div style={{ background: 'rgba(76,175,114,0.1)', border: '1.5px solid #4caf72', borderRadius: '12px', padding: '16px', marginBottom: '20px', textAlign: 'center' }}>
                                    <p className="tamil" style={{ color: '#a8d5b5', fontSize: '14px', marginBottom: '10px' }}>
                                        🎤 குரல் வழிகாட்டி மூலம் பதிவு செய்யலாம்!
                                    </p>
                                    <button className="btn btn-primary btn-sm" onClick={startVoiceWizard}>
                                        🎤 குரல் வழிகாட்டி தொடங்கு
                                    </button>
                                </div>
                            )}

                            {voiceActive && isTamil && (
                                <div className="voice-wizard">
                                    <div className="voice-wizard-step tamil">படி {currentStep + 1} / {fields.length}</div>
                                    <div className="voice-wizard-question">{FARMER_FIELDS_TA[currentStep]?.voice}</div>
                                    <div className="voice-wizard-progress">
                                        {fields.map((_, i) => (
                                            <div key={i} className={`voice-wizard-dot ${i === currentStep ? 'active' : i < currentStep ? 'done' : ''}`} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {fields.map((field, idx) => (
                                <div className="form-group" key={field.key}
                                    style={{ display: voiceActive && isTamil && idx !== currentStep ? 'none' : 'block' }}>
                                    <label className={`form-label ${isTamil ? 'tamil' : ''}`}>{field.label}</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            ref={el => inputRefs.current[idx] = el}
                                            className={`form-input ${isTamil ? 'tamil' : ''}`}
                                            type={field.type}
                                            inputMode={field.key === 'phone' ? 'numeric' : undefined}
                                            placeholder={field.placeholder}
                                            value={form[field.key]}
                                            onChange={e => handleFieldChange(field.key, e.target.value, field.key === 'phone')}
                                            onKeyDown={field.key === 'phone'
                                                ? (e) => { blockNonNumeric(e); if (e.key === 'Enter' && voiceActive) handleVoiceNext(); }
                                                : (e) => { if (e.key === 'Enter' && voiceActive) handleVoiceNext(); }}
                                            onPaste={field.key === 'phone' ? sanitizePhonePaste : undefined}
                                            style={inputStyle(field.key)}
                                        />
                                        <MicBtn fieldKey={field.key} isPassword={field.type === 'password'} />
                                    </div>
                                    <FieldError msg={fieldErrors[field.key]} />
                                    {voiceActive && (
                                        <button className="btn btn-primary btn-sm" style={{ marginTop: '10px' }} onClick={handleVoiceNext} disabled={loading}>
                                            {loading ? <span className="spinner" /> : (currentStep < fields.length - 1
                                                ? (isTamil ? '➡ அடுத்தது' : '➡ Next')
                                                : (isTamil ? '✅ பதிவு செய்' : '✅ Register'))}
                                        </button>
                                    )}
                                </div>
                            ))}

                            {!voiceActive && (
                                <button className="btn btn-primary btn-full btn-lg" onClick={handleSignup} disabled={loading}>
                                    {loading ? <span className="spinner" /> : (isTamil ? '✅ பதிவு செய்' : '✅ Register as Farmer')}
                                </button>
                            )}
                            {success && <div className="alert alert-success" style={{ marginTop: '10px' }}>{success}</div>}
                            <button className="btn btn-outline btn-full" style={{ marginTop: '10px' }} onClick={() => navigate('/')}>
                                ← {isTamil ? 'திரும்பு' : 'Back'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
