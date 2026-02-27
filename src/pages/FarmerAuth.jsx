import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Beams from '../components/Beams';
import { speakTamil } from '../utils/voiceUtils';

// Tamil translations for farmer signup fields
const FARMER_FIELDS_EN = [
    { key: 'name', label: 'Full Name', placeholder: 'Enter your full name', type: 'text' },
    { key: 'phone', label: 'Phone Number', placeholder: 'Enter your phone number', type: 'tel' },
    { key: 'village', label: 'Village / Town', placeholder: 'Enter your village or town', type: 'text' },
    { key: 'district', label: 'District', placeholder: 'Enter your district', type: 'text' },
    { key: 'password', label: 'Password', placeholder: 'Create a password', type: 'password' },
];

const FARMER_FIELDS_TA = [
    { key: 'name', label: 'முழு பெயர்', placeholder: 'உங்கள் முழு பெயரை உள்ளிடவும்', type: 'text', voice: 'உங்கள் முழு பெயரை சொல்லுங்கள்' },
    { key: 'phone', label: 'தொலைபேசி எண்', placeholder: 'உங்கள் தொலைபேசி எண்ணை உள்ளிடவும்', type: 'tel', voice: 'உங்கள் தொலைபேசி எண்ணை சொல்லுங்கள்' },
    { key: 'village', label: 'கிராமம் / நகரம்', placeholder: 'உங்கள் கிராமம் அல்லது நகரத்தை உள்ளிடவும்', type: 'text', voice: 'உங்கள் கிராமம் அல்லது நகரத்தை சொல்லுங்கள்' },
    { key: 'district', label: 'மாவட்டம்', placeholder: 'உங்கள் மாவட்டத்தை உள்ளிடவும்', type: 'text', voice: 'உங்கள் மாவட்டத்தை சொல்லுங்கள்' },
    { key: 'password', label: 'கடவுச்சொல்', placeholder: 'கடவுச்சொல் உருவாக்கவும்', type: 'password', voice: 'ஒரு கடவுச்சொல்லை உருவாக்கவும்' },
];



export default function FarmerAuth() {
    const navigate = useNavigate();
    const { registerFarmer, loginFarmer } = useApp();
    const [mode, setMode] = useState('login'); // 'login' | 'signup'
    const [isTamil, setIsTamil] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [voiceActive, setVoiceActive] = useState(false);
    const [form, setForm] = useState({ name: '', phone: '', village: '', district: '', password: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [voiceInfo, setVoiceInfo] = useState({ voices: [], loaded: false });
    const inputRefs = useRef([]);

    // Load available voices on mount for diagnostics
    useEffect(() => {
        const loadVoiceInfo = () => {
            const v = window.speechSynthesis?.getVoices() || [];
            if (v.length > 0) {
                setVoiceInfo({ voices: v, loaded: true });
            }
        };
        loadVoiceInfo();
        if (window.speechSynthesis) {
            window.speechSynthesis.onvoiceschanged = () => loadVoiceInfo();
        }
        return () => {
            if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null;
        };
    }, []);

    const fields = isTamil ? FARMER_FIELDS_TA : FARMER_FIELDS_EN;

    const speakField = (idx) => {
        if (!isTamil) return;
        const field = FARMER_FIELDS_TA[idx];
        if (!field) return;
        setIsSpeaking(true);
        speakTamil(field.voice, {
            onEnd: () => {
                setIsSpeaking(false);
                setTimeout(() => inputRefs.current[idx]?.focus(), 300);
            }
        });
    };

    const startVoiceWizard = () => {
        setVoiceActive(true);
        setCurrentStep(0);
        setForm({ name: '', phone: '', village: '', district: '', password: '' });
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

    const handleSignup = () => {
        setError('');
        if (!form.name || !form.phone || !form.password) {
            setError(isTamil ? 'அனைத்து தகவல்களையும் நிரப்பவும்' : 'Please fill all required fields');
            return;
        }
        const farmer = registerFarmer({ ...form, tamilEnabled: isTamil });
        setSuccess(isTamil ? `வரவேற்கிறோம் ${farmer.name}! உள்நுழைக.` : `Welcome ${farmer.name}! Please login.`);
        setTimeout(() => { setMode('login'); setSuccess(''); setForm({ name: '', phone: '', village: '', district: '', password: '' }); }, 2000);
    };

    const handleLogin = () => {
        setError('');
        const farmer = loginFarmer(form.phone, form.password);
        if (farmer) {
            navigate('/farmer/dashboard');
        } else {
            setError(isTamil ? 'தொலைபேசி எண் அல்லது கடவுச்சொல் தவறானது' : 'Invalid phone or password');
        }
    };

    const toggleTamilAndSpeak = () => {
        const newTamil = !isTamil;
        setIsTamil(newTamil);
        if (newTamil) {
            speakTamil('நல்வரவு! விவசாயி பதிவு பக்கத்திற்கு வரவேற்கிறோம்');
        }
    };

    return (
        <div className="page-wrapper">
            <div className="beams-bg">
                <Beams beamWidth={3} beamHeight={30} beamNumber={15} lightColor="#4caf72" speed={1.5} noiseIntensity={1.75} scale={0.2} rotation={30} />
            </div>

            <div className="auth-container">
                <div className="auth-card">
                    {/* Logo */}
                    <div className="auth-logo">
                        <div style={{ fontSize: '40px' }}>👨‍🌾</div>
                        <h1>Direct<span>From</span>Farm</h1>
                        <p className={isTamil ? 'tamil' : ''}>{isTamil ? 'விவசாயி நுழைவு' : 'Farmer Portal'}</p>
                    </div>

                    {/* Tamil Toggle */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', gap: '10px' }}>
                        <button
                            className={`tamil-toggle ${isTamil ? 'active' : ''}`}
                            onClick={toggleTamilAndSpeak}
                        >
                            🌐 {isTamil ? 'தமிழ் ON' : 'தமிழில் மாற்று'}
                        </button>
                        {isTamil && (
                            <button
                                className={`voice-btn ${isSpeaking ? 'speaking' : ''}`}
                                onClick={() => speakField(currentStep)}
                            >
                                🎤 {isSpeaking ? 'படிக்கிறது...' : 'கேளு'}
                            </button>
                        )}
                    </div>

                    {/* Voice Diagnostic Panel */}
                    <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(76,175,114,0.3)', borderRadius: '10px', padding: '12px', marginBottom: '16px', fontSize: '12px' }}>
                        <div style={{ color: '#4caf72', fontWeight: 700, marginBottom: '6px' }}>🔊 Voice Diagnostic</div>
                        {!voiceInfo.loaded ? (
                            <div style={{ color: 'rgba(255,255,255,0.5)' }}>Loading voices...</div>
                        ) : voiceInfo.voices.length === 0 ? (
                            <div style={{ color: '#ff6b6b' }}>❌ No voices found. Speech may not work in this browser.</div>
                        ) : (
                            <>
                                <div style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '6px' }}>
                                    {voiceInfo.voices.some(v => v.lang.startsWith('ta'))
                                        ? '✅ Tamil voice found!'
                                        : voiceInfo.voices.some(v => v.lang.startsWith('hi'))
                                            ? '⚠️ No Tamil voice — will use Hindi voice'
                                            : '⚠️ No Tamil/Hindi voice — will use English voice'}
                                </div>
                                <div style={{ color: 'rgba(255,255,255,0.4)', maxHeight: '60px', overflowY: 'auto', lineHeight: '1.6' }}>
                                    {voiceInfo.voices.filter(v => v.lang.match(/^(ta|hi|en-IN)/i)).map(v => (
                                        <span key={v.name} style={{ display: 'inline-block', background: 'rgba(76,175,114,0.15)', borderRadius: '4px', padding: '1px 6px', margin: '2px' }}>
                                            {v.name} ({v.lang})
                                        </span>
                                    ))}
                                </div>
                                <button
                                    style={{ marginTop: '8px', background: '#2d7a4f', color: 'white', border: 'none', borderRadius: '6px', padding: '4px 12px', cursor: 'pointer', fontSize: '12px' }}
                                    onClick={() => speakTamil('வணக்கம்! இது ஒரு சோதனை குரல்.', { onStart: () => setIsSpeaking(true), onEnd: () => setIsSpeaking(false) })}
                                >
                                    🔊 Test Voice Now
                                </button>
                            </>
                        )}
                    </div>

                    {/* Mode Tabs */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '4px' }}>
                        {['login', 'signup'].map(m => (
                            <button
                                key={m}
                                onClick={() => { setMode(m); setError(''); setVoiceActive(false); }}
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
                    {success && <div className="alert alert-success">{success}</div>}

                    {/* LOGIN FORM */}
                    {mode === 'login' && (
                        <div>
                            <div className="form-group">
                                <label className={`form-label ${isTamil ? 'tamil' : ''}`}>{isTamil ? 'தொலைபேசி எண்' : 'Phone Number'}</label>
                                <input className={`form-input ${isTamil ? 'tamil' : ''}`} type="tel" placeholder={isTamil ? 'தொலைபேசி எண்' : 'Phone number'}
                                    value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className={`form-label ${isTamil ? 'tamil' : ''}`}>{isTamil ? 'கடவுச்சொல்' : 'Password'}</label>
                                <input className={`form-input ${isTamil ? 'tamil' : ''}`} type="password" placeholder={isTamil ? 'கடவுச்சொல்' : 'Password'}
                                    value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                                    onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                            </div>
                            <button className="btn btn-primary btn-full btn-lg" onClick={handleLogin}>
                                {isTamil ? '🌾 உள்நுழை' : '🌾 Login as Farmer'}
                            </button>
                            <button className="btn btn-outline btn-full" style={{ marginTop: '10px' }} onClick={() => navigate('/')}>
                                ← {isTamil ? 'திரும்பு' : 'Back'}
                            </button>
                        </div>
                    )}

                    {/* SIGNUP FORM */}
                    {mode === 'signup' && (
                        <div>
                            {/* Voice Wizard Banner */}
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

                            {/* Voice Wizard Progress */}
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

                            {/* Form Fields */}
                            {fields.map((field, idx) => (
                                <div className="form-group" key={field.key}
                                    style={{ display: voiceActive && isTamil && idx !== currentStep ? 'none' : 'block' }}>
                                    <label className={`form-label ${isTamil ? 'tamil' : ''}`}>{field.label}</label>
                                    <input
                                        ref={el => inputRefs.current[idx] = el}
                                        className={`form-input ${isTamil ? 'tamil' : ''}`}
                                        type={field.type}
                                        placeholder={field.placeholder}
                                        value={form[field.key]}
                                        onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}
                                        onKeyDown={e => { if (e.key === 'Enter' && voiceActive) handleVoiceNext(); }}
                                    />
                                    {voiceActive && isTamil && (
                                        <button className="btn btn-primary btn-sm" style={{ marginTop: '10px' }} onClick={handleVoiceNext}>
                                            {currentStep < fields.length - 1 ? (isTamil ? '➡ அடுத்தது' : 'Next') : (isTamil ? '✅ பதிவு செய்' : 'Register')}
                                        </button>
                                    )}
                                </div>
                            ))}

                            {!voiceActive && (
                                <button className="btn btn-primary btn-full btn-lg" onClick={handleSignup}>
                                    {isTamil ? '✅ பதிவு செய்' : '✅ Register as Farmer'}
                                </button>
                            )}
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
