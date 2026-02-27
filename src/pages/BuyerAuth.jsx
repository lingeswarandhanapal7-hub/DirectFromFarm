import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Beams from '../components/Beams';

export default function BuyerAuth() {
    const navigate = useNavigate();
    const { registerBuyer, loginBuyer } = useApp();
    const [mode, setMode] = useState('login');
    const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSignup = () => {
        setError('');
        if (!form.name || !form.email || !form.password) {
            setError('Please fill all required fields');
            return;
        }
        const buyer = registerBuyer(form);
        setSuccess(`Welcome ${buyer.name}! Please login.`);
        setTimeout(() => { setMode('login'); setSuccess(''); setForm({ name: '', email: '', phone: '', password: '' }); }, 2000);
    };

    const handleLogin = () => {
        setError('');
        const buyer = loginBuyer(form.email, form.password);
        if (buyer) {
            navigate('/buyer/marketplace');
        } else {
            setError('Invalid email or password');
        }
    };

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
                            <button
                                key={m}
                                onClick={() => { setMode(m); setError(''); }}
                                style={{
                                    flex: 1, padding: '10px', border: 'none', borderRadius: '8px', cursor: 'pointer',
                                    background: mode === m ? 'linear-gradient(135deg, #d97706, #92400e)' : 'transparent',
                                    color: mode === m ? 'white' : 'rgba(255,255,255,0.5)',
                                    fontWeight: 600, fontSize: '14px', fontFamily: 'inherit', transition: 'all 0.3s'
                                }}
                            >
                                {m === 'login' ? 'Login' : 'Sign Up'}
                            </button>
                        ))}
                    </div>

                    {error && <div className="alert alert-error">{error}</div>}
                    {success && <div className="alert alert-success">{success}</div>}

                    {mode === 'login' && (
                        <div>
                            <div className="form-group">
                                <label className="form-label">Email Address</label>
                                <input className="form-input" type="email" placeholder="your@email.com"
                                    value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Password</label>
                                <input className="form-input" type="password" placeholder="Password"
                                    value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                                    onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                            </div>
                            <button className="btn btn-amber btn-full btn-lg" onClick={handleLogin}>
                                🛒 Login as Buyer
                            </button>
                            <button className="btn btn-outline btn-full" style={{ marginTop: '10px' }} onClick={() => navigate('/')}>
                                ← Back
                            </button>
                        </div>
                    )}

                    {mode === 'signup' && (
                        <div>
                            {[
                                { key: 'name', label: 'Full Name', type: 'text', placeholder: 'Your full name' },
                                { key: 'email', label: 'Email Address', type: 'email', placeholder: 'your@email.com' },
                                { key: 'phone', label: 'Phone Number', type: 'tel', placeholder: 'Phone number' },
                                { key: 'password', label: 'Password', type: 'password', placeholder: 'Create a password' },
                            ].map(f => (
                                <div className="form-group" key={f.key}>
                                    <label className="form-label">{f.label}</label>
                                    <input className="form-input" type={f.type} placeholder={f.placeholder}
                                        value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                                </div>
                            ))}
                            <button className="btn btn-amber btn-full btn-lg" onClick={handleSignup}>
                                ✅ Register as Buyer
                            </button>
                            <button className="btn btn-outline btn-full" style={{ marginTop: '10px' }} onClick={() => navigate('/')}>
                                ← Back
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
