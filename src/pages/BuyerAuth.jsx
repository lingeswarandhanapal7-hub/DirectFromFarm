import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Beams from '../components/Beams';

// ── Validation helpers ─────────────────────────────────────
function validateSignupField(key, value) {
    switch (key) {
        case 'name':
            if (!value.trim()) return 'Full name is required';
            if (value.trim().length < 2) return 'Name must be at least 2 characters';
            return '';
        case 'email':
            if (!value.trim()) return 'Email address is required';
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address';
            return '';
        case 'phone':
            if (value && !/^\+?[0-9]{7,15}$/.test(value)) return 'Enter a valid phone number (7–15 digits)';
            return ''; // phone is optional for buyers
        case 'password':
            if (!value) return 'Password is required';
            if (value.length < 6) return 'Password must be at least 6 characters';
            return '';
        default:
            return '';
    }
}

function validateLoginField(key, value) {
    switch (key) {
        case 'email':
            if (!value.trim()) return 'Email address is required';
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address';
            return '';
        case 'password':
            if (!value) return 'Password is required';
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

export default function BuyerAuth() {
    const navigate = useNavigate();
    const { registerBuyer, loginBuyer, sendOtp, verifyOtp } = useApp();
    const [mode, setMode] = useState('login');
    const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
    const [fieldErrors, setFieldErrors] = useState({});
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    // OTP flow state
    const [otpStep, setOtpStep] = useState(false);
    const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
    const [otpCountdown, setOtpCountdown] = useState(0);
    const [devOtp, setDevOtp] = useState('');
    const otpRefs = useRef([]);
    const countdownRef = useRef(null);

    const startCountdown = () => {
        setOtpCountdown(300);
        if (countdownRef.current) clearInterval(countdownRef.current);
        countdownRef.current = setInterval(() => {
            setOtpCountdown(prev => {
                if (prev <= 1) { clearInterval(countdownRef.current); return 0; }
                return prev - 1;
            });
        }, 1000);
    };

    // ── Field change with live validation ─────────────────
    const handleFieldChange = (key, value) => {
        setForm(p => ({ ...p, [key]: value }));
        if (fieldErrors[key]) {
            const err = mode === 'login'
                ? validateLoginField(key, value)
                : validateSignupField(key, value);
            setFieldErrors(p => ({ ...p, [key]: err }));
        }
    };

    const validateAllSignup = () => {
        const errors = {};
        for (const key of ['name', 'email', 'phone', 'password']) {
            const err = validateSignupField(key, form[key]);
            if (err) errors[key] = err;
        }
        return errors;
    };

    const validateAllLogin = () => {
        const errors = {};
        for (const key of ['email', 'password']) {
            const err = validateLoginField(key, form[key]);
            if (err) errors[key] = err;
        }
        return errors;
    };

    const handleSignupRequest = async () => {
        setError('');
        const errors = validateAllSignup();
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            setError('Please fix the errors above');
            return;
        }
        setFieldErrors({});
        setLoading(true);
        const result = await sendOtp(form.email);
        setLoading(false);
        if (result.success) {
            setOtpStep(true);
            startCountdown();
            if (result.devOtp) setDevOtp(result.devOtp);
        } else {
            const msg = result.error || 'Failed to send OTP';
            if (msg.toLowerCase().includes('email')) {
                setFieldErrors({ email: 'This email address is already registered' });
            }
            setError(msg);
        }
    };

    const handleOtpInput = (idx, val) => {
        if (!/^\d*$/.test(val)) return;
        const updated = [...otpDigits];
        updated[idx] = val.slice(-1);
        setOtpDigits(updated);
        if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
    };

    const handleOtpKeyDown = (idx, e) => {
        if (e.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
            otpRefs.current[idx - 1]?.focus();
        }
    };

    const handleVerifyOtp = async () => {
        setError('');
        const otp = otpDigits.join('');
        if (otp.length < 6) { setError('Please enter the complete 6-digit OTP'); return; }
        setLoading(true);
        const verifyResult = await verifyOtp(form.email, otp);
        if (!verifyResult.success) {
            setLoading(false);
            setError(verifyResult.error || 'Invalid OTP. Please try again.');
            return;
        }
        const regResult = await registerBuyer(form);
        setLoading(false);
        if (regResult.success) {
            setOtpStep(false);
            setSuccess(`Welcome ${regResult.user.name}! Please login.`);
            setTimeout(() => { setMode('login'); setSuccess(''); setForm({ name: '', email: '', phone: '', password: '' }); }, 2000);
        } else {
            const msg = regResult.error || 'Registration failed';
            if (msg.toLowerCase().includes('email')) {
                setFieldErrors({ email: 'This email is already registered' });
            }
            setError(msg);
        }
    };

    const handleResendOtp = async () => {
        if (otpCountdown > 0) return;
        setLoading(true);
        const result = await sendOtp(form.email);
        setLoading(false);
        if (result.success) {
            setOtpDigits(['', '', '', '', '', '']);
            startCountdown();
            if (result.devOtp) setDevOtp(result.devOtp);
        } else {
            setError(result.error || 'Failed to resend OTP');
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
        const result = await loginBuyer(form.email, form.password);
        setLoading(false);
        if (result.success) {
            navigate('/buyer/marketplace');
        } else {
            setError(result.error || 'Invalid email or password');
            setFieldErrors({
                email: 'Check your email address',
                password: 'Check your password',
            });
        }
    };

    const fmtCountdown = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

    // Shared input style with red border on error
    const inputStyle = (key) => ({
        borderColor: fieldErrors[key] ? '#ff6b6b' : undefined,
        boxShadow: fieldErrors[key] ? '0 0 0 2px rgba(255,107,107,0.25)' : undefined,
    });

    return (
        <div className="page-wrapper">
            <div className="beams-bg">
                <Beams beamWidth={3} beamHeight={30} beamNumber={15} lightColor="#f59e0b" speed={1.5} noiseIntensity={1.75} scale={0.2} rotation={-30} />
            </div>

            <div className="auth-container">
                <div className="auth-card">
                    <div className="auth-logo">
                        <div style={{ fontSize: '40px' }}>🛒</div>
                        <h1>Direct<span>From</span>Farm</h1>
                        <p>Buyer Portal</p>
                    </div>

                    {/* Mode Tabs */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '4px' }}>
                        {['login', 'signup'].map(m => (
                            <button key={m} onClick={() => { setMode(m); setError(''); setFieldErrors({}); setOtpStep(false); setOtpDigits(['', '', '', '', '', '']); }}
                                style={{
                                    flex: 1, padding: '10px', border: 'none', borderRadius: '8px', cursor: 'pointer',
                                    background: mode === m ? 'linear-gradient(135deg, #d97706, #92400e)' : 'transparent',
                                    color: mode === m ? 'white' : 'rgba(255,255,255,0.5)',
                                    fontWeight: 600, fontSize: '14px', fontFamily: 'inherit', transition: 'all 0.3s',
                                }}>
                                {m === 'login' ? 'Login' : 'Sign Up'}
                            </button>
                        ))}
                    </div>

                    {error && <div className="alert alert-error">{error}</div>}
                    {success && <div className="alert alert-success">{success}</div>}

                    {/* ── LOGIN ── */}
                    {mode === 'login' && (
                        <div>
                            {[
                                { key: 'email', label: 'Email Address', type: 'email', placeholder: 'your@email.com' },
                                { key: 'password', label: 'Password', type: 'password', placeholder: 'Password' },
                            ].map(f => (
                                <div className="form-group" key={f.key}>
                                    <label className="form-label">{f.label}</label>
                                    <input
                                        className="form-input"
                                        type={f.type}
                                        placeholder={f.placeholder}
                                        value={form[f.key]}
                                        onChange={e => handleFieldChange(f.key, e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleLogin()}
                                        style={inputStyle(f.key)}
                                    />
                                    <FieldError msg={fieldErrors[f.key]} />
                                </div>
                            ))}
                            <button className="btn btn-amber btn-full btn-lg" onClick={handleLogin} disabled={loading}>
                                {loading ? <span className="spinner" /> : '🛒 Login as Buyer'}
                            </button>
                            <button className="btn btn-outline btn-full" style={{ marginTop: '10px' }} onClick={() => navigate('/')}>← Back</button>
                        </div>
                    )}

                    {/* ── SIGNUP — Step 1: form ── */}
                    {mode === 'signup' && !otpStep && (
                        <div>
                            {[
                                { key: 'name', label: 'Full Name', type: 'text', placeholder: 'Your full name' },
                                { key: 'email', label: 'Email Address', type: 'email', placeholder: 'your@email.com' },
                                { key: 'phone', label: 'Phone Number (Optional)', type: 'tel', placeholder: 'Phone number' },
                                { key: 'password', label: 'Password', type: 'password', placeholder: 'Create a password (min 6 chars)' },
                            ].map(f => (
                                <div className="form-group" key={f.key}>
                                    <label className="form-label">{f.label}</label>
                                    <input
                                        className="form-input"
                                        type={f.type}
                                        placeholder={f.placeholder}
                                        value={form[f.key]}
                                        onChange={e => handleFieldChange(f.key, e.target.value)}
                                        style={inputStyle(f.key)}
                                    />
                                    <FieldError msg={fieldErrors[f.key]} />
                                </div>
                            ))}
                            <button className="btn btn-amber btn-full btn-lg" onClick={handleSignupRequest} disabled={loading}>
                                {loading ? <span className="spinner" /> : '📧 Send Verification Code'}
                            </button>
                            <button className="btn btn-outline btn-full" style={{ marginTop: '10px' }} onClick={() => navigate('/')}>← Back</button>
                        </div>
                    )}

                    {/* ── SIGNUP — Step 2: OTP verification ── */}
                    {mode === 'signup' && otpStep && (
                        <div>
                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                <div style={{ fontSize: '36px', marginBottom: '8px' }}>📧</div>
                                <p style={{ color: 'white', fontWeight: 600, fontSize: '16px' }}>Check your email</p>
                                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
                                    We sent a 6-digit code to <strong style={{ color: '#f59e0b' }}>{form.email}</strong>
                                </p>
                                {devOtp && (
                                    <div style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: '8px', padding: '8px', marginTop: '10px' }}>
                                        <p style={{ color: '#f59e0b', fontSize: '12px' }}>🔧 Dev mode OTP: <strong style={{ fontSize: '20px', letterSpacing: '4px' }}>{devOtp}</strong></p>
                                    </div>
                                )}
                            </div>

                            {/* OTP boxes */}
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '24px' }}>
                                {otpDigits.map((d, i) => (
                                    <input key={i} ref={el => otpRefs.current[i] = el}
                                        type="text" inputMode="numeric" maxLength={1}
                                        value={d}
                                        onChange={e => handleOtpInput(i, e.target.value)}
                                        onKeyDown={e => handleOtpKeyDown(i, e)}
                                        style={{
                                            width: '44px', height: '52px', textAlign: 'center',
                                            fontSize: '24px', fontWeight: 700, borderRadius: '10px',
                                            border: `2px solid ${d ? '#f59e0b' : 'rgba(255,255,255,0.15)'}`,
                                            background: 'rgba(255,255,255,0.05)', color: 'white',
                                            outline: 'none', caretColor: '#f59e0b',
                                        }} />
                                ))}
                            </div>

                            {/* Countdown */}
                            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                                {otpCountdown > 0 ? (
                                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
                                        Code expires in <strong style={{ color: '#f59e0b' }}>{fmtCountdown(otpCountdown)}</strong>
                                    </span>
                                ) : (
                                    <button style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', fontSize: '14px', textDecoration: 'underline' }}
                                        onClick={handleResendOtp}>Resend OTP</button>
                                )}
                            </div>

                            <button className="btn btn-amber btn-full btn-lg" onClick={handleVerifyOtp} disabled={loading}>
                                {loading ? <span className="spinner" /> : '✅ Verify & Register'}
                            </button>
                            <button className="btn btn-outline btn-full" style={{ marginTop: '10px' }} onClick={() => { setOtpStep(false); setError(''); }}>
                                ← Change Details
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
