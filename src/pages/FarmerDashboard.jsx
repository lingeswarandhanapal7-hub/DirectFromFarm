import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { speakTamil, stopSpeech } from '../utils/voiceUtils';

const PRODUCT_FIELDS_EN = [
    { key: 'name', label: 'Product Name', placeholder: 'e.g. Tomatoes', type: 'text' },
    { key: 'category', label: 'Category', placeholder: 'e.g. Vegetables', type: 'text' },
    { key: 'price', label: 'Price per unit (₹)', placeholder: 'e.g. 50', type: 'number' },
    { key: 'unit', label: 'Unit', placeholder: 'e.g. kg, dozen, bunch', type: 'text' },
    { key: 'stock', label: 'Available Stock', placeholder: 'e.g. 100', type: 'number' },
    { key: 'description', label: 'Description', placeholder: 'Describe your product', type: 'text' },
];

const PRODUCT_FIELDS_TA = [
    { key: 'name', label: 'பொருளின் பெயர்', placeholder: 'எ.கா. தக்காளி', type: 'text', voice: 'உங்கள் பொருளின் பெயரை சொல்லுங்கள்' },
    { key: 'category', label: 'வகை', placeholder: 'எ.கா. காய்கறிகள்', type: 'text', voice: 'பொருளின் வகையை சொல்லுங்கள். எடுத்துக்காட்டாக காய்கறிகள் அல்லது பழங்கள்' },
    { key: 'price', label: 'விலை (₹)', placeholder: 'எ.கா. 50', type: 'number', voice: 'ஒரு யூனிட்டுக்கு விலை என்ன? ரூபாயில் சொல்லுங்கள்' },
    { key: 'unit', label: 'அலகு', placeholder: 'எ.கா. கிலோ, டஜன்', type: 'text', voice: 'அலகு என்ன? கிலோ, டஜன் அல்லது கட்டு என்று சொல்லுங்கள்' },
    { key: 'stock', label: 'கையிருப்பு அளவு', placeholder: 'எ.கா. 100', type: 'number', voice: 'எத்தனை அளவு கையிருப்பு உள்ளது?' },
    { key: 'description', label: 'விவரம்', placeholder: 'பொருளை விவரிக்கவும்', type: 'text', voice: 'உங்கள் பொருளை சுருக்கமாக விவரிக்கவும்' },
];



// Tamil voice messages for dashboard sections
const DASHBOARD_VOICE = {
    welcome: (name) => `வணக்கம் ${name}! உங்கள் விவசாயி கணக்கில் நல்வரவு.`,
    stats: (products, stock, orders, revenue) =>
        `உங்களிடம் ${products} பொருட்கள் உள்ளன. மொத்த கையிருப்பு ${stock}. புதிய ஆர்டர்கள் ${orders}. மொத்த வருமானம் ${revenue} ரூபாய்.`,
    tabProducts: 'என் பொருட்கள் பக்கம் திறக்கப்பட்டது.',
    tabNotifications: 'அறிவிப்புகள் பக்கம் திறக்கப்பட்டது.',
    noProducts: 'இன்னும் பொருட்கள் எதுவும் சேர்க்கவில்லை.',
    noNotifications: 'இன்னும் ஆர்டர்கள் எதுவும் இல்லை.',
    newOrder: (msg) => msg,
};

export default function FarmerDashboard() {
    const navigate = useNavigate();
    const { currentUser, userRole, isTamil, toggleTamil, farmerProducts, farmerNotifications, unreadCount, addProduct, logout, markNotificationRead } = useApp();
    const [tab, setTab] = useState('products');
    const [showAddModal, setShowAddModal] = useState(false);
    const [voiceStep, setVoiceStep] = useState(-1);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [productForm, setProductForm] = useState({ name: '', category: '', price: '', unit: '', stock: '', description: '' });
    const [success, setSuccess] = useState('');
    const welcomeSpokenRef = useRef(false);

    useEffect(() => {
        if (!currentUser || userRole !== 'farmer') navigate('/auth/farmer');
    }, [currentUser, userRole, navigate]);

    // Auto-speak welcome when Tamil mode is active and dashboard first loads
    useEffect(() => {
        if (isTamil && currentUser && !welcomeSpokenRef.current) {
            welcomeSpokenRef.current = true;
            setTimeout(() => {
                speakTamil(DASHBOARD_VOICE.welcome(currentUser.name), {
                    onStart: () => setIsSpeaking(true),
                    onEnd: () => setIsSpeaking(false),
                });
            }, 800);
        }
        if (!isTamil) {
            welcomeSpokenRef.current = false;
            stopSpeech();
            setIsSpeaking(false);
        }
    }, [isTamil, currentUser]);

    // Narrate dashboard stats aloud
    const speakDashboardStats = () => {
        const totalRevenue = farmerProducts.reduce((s, p) => s + (p.price * (p.soldCount || 0)), 0);
        const totalStock = farmerProducts.reduce((s, p) => s + (p.stock || 0), 0);
        const msg = DASHBOARD_VOICE.stats(
            farmerProducts.length,
            totalStock,
            unreadCount,
            totalRevenue
        );
        setIsSpeaking(true);
        speakTamil(msg, { onEnd: () => setIsSpeaking(false) });
    };

    // Switch tab with voice announcement
    const handleTabSwitch = (key) => {
        setTab(key);
        if (!isTamil) return;
        const msg = key === 'products' ? DASHBOARD_VOICE.tabProducts : DASHBOARD_VOICE.tabNotifications;
        setIsSpeaking(true);
        speakTamil(msg, { onEnd: () => setIsSpeaking(false) });
    };

    // Read notification aloud when clicked
    const handleNotificationClick = (n) => {
        markNotificationRead(n.id);
        if (isTamil && n.message) {
            setIsSpeaking(true);
            speakTamil(n.message, { onEnd: () => setIsSpeaking(false) });
        }
    };

    const fields = isTamil ? PRODUCT_FIELDS_TA : PRODUCT_FIELDS_EN;

    const speakStep = (idx) => {
        if (!isTamil) return;
        const field = PRODUCT_FIELDS_TA[idx];
        if (!field) return;
        setIsSpeaking(true);
        speakTamil(field.voice, { onEnd: () => setIsSpeaking(false) });
    };

    const startVoiceAdd = () => {
        setProductForm({ name: '', category: '', price: '', unit: '', stock: '', description: '' });
        setVoiceStep(0);
        setShowAddModal(true);
        setTimeout(() => speakStep(0), 600);
    };

    const handleVoiceNext = () => {
        if (voiceStep < fields.length - 1) {
            const next = voiceStep + 1;
            setVoiceStep(next);
            speakStep(next);
        } else {
            handleAddProduct();
        }
    };

    const handleAddProduct = () => {
        if (!productForm.name || !productForm.price || !productForm.stock) return;
        addProduct({ ...productForm, price: Number(productForm.price), stock: Number(productForm.stock) });
        setShowAddModal(false);
        setVoiceStep(-1);
        setProductForm({ name: '', category: '', price: '', unit: '', stock: '', description: '' });
        const msg = isTamil ? 'பொருள் வெற்றிகரமாக சேர்க்கப்பட்டது!' : 'Product added successfully!';
        setSuccess(msg);
        if (isTamil) speakTamil(msg);
        setTimeout(() => setSuccess(''), 3000);
    };

    const handleToggleTamil = () => {
        toggleTamil();
        if (!isTamil) {
            welcomeSpokenRef.current = false; // allow welcome to re-fire
            speakTamil('தமிழ் மொழி இயக்கப்பட்டது. நல்வரவு விவசாயி!');
        } else {
            stopSpeech();
        }
    };

    const handleLogout = () => { logout(); navigate('/'); };

    if (!currentUser) return null;

    const totalRevenue = farmerProducts.reduce((s, p) => s + (p.price * (p.soldCount || 0)), 0);

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0d1f15 0%, #132a1c 50%, #0d1f15 100%)' }}>
            {/* Navbar */}
            <nav className="navbar">
                <div className="navbar-brand">🌾 Direct<span>From</span>Farm</div>
                <div className="navbar-actions">
                    <button className={`tamil-toggle ${isTamil ? 'active' : ''}`} onClick={handleToggleTamil}>
                        🌐 {isTamil ? 'தமிழ் ON' : 'தமிழ்'}
                    </button>
                    {isTamil && (
                        <>
                            <button
                                className={`voice-btn ${isSpeaking ? 'speaking' : ''}`}
                                onClick={isSpeaking ? () => { stopSpeech(); setIsSpeaking(false); } : speakDashboardStats}
                                title={isSpeaking ? 'நிறுத்து' : 'டாஷ்போர்டை படிக்கவும்'}
                            >
                                {isSpeaking ? '⏹ நிறுத்து' : '🎤 கேளு'}
                            </button>
                        </>
                    )}
                    <button className="btn btn-outline btn-sm" style={{ position: 'relative' }} onClick={() => setTab('notifications')}>
                        🔔 {isTamil ? 'அறிவிப்புகள்' : 'Notifications'}
                        {unreadCount > 0 && <span className="badge" style={{ position: 'absolute', top: '-6px', right: '-6px' }}>{unreadCount}</span>}
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={handleLogout}>{isTamil ? 'வெளியேறு' : 'Logout'}</button>
                </div>
            </nav>

            <div className="dashboard">
                {/* Header */}
                <div className="dashboard-header">
                    <h1 className={`dashboard-title ${isTamil ? 'tamil' : ''}`}>
                        {isTamil ? `வணக்கம், ${currentUser.name}! 🌾` : `Welcome, ${currentUser.name}! 🌾`}
                    </h1>
                    <p className={`dashboard-subtitle ${isTamil ? 'tamil' : ''}`}>
                        {isTamil ? `${currentUser.village}, ${currentUser.district}` : `${currentUser.village || ''}, ${currentUser.district || ''}`}
                    </p>
                </div>

                {success && <div className="alert alert-success tamil">{success}</div>}

                {/* Stats */}
                <div className="grid-4" style={{ marginBottom: '32px' }}>
                    {[
                        { value: farmerProducts.length, label: isTamil ? 'பொருட்கள்' : 'Products' },
                        { value: farmerProducts.reduce((s, p) => s + (p.stock || 0), 0), label: isTamil ? 'மொத்த கையிருப்பு' : 'Total Stock' },
                        { value: unreadCount, label: isTamil ? 'புதிய ஆர்டர்கள்' : 'New Orders' },
                        { value: `₹${totalRevenue}`, label: isTamil ? 'மொத்த வருமானம்' : 'Revenue' },
                    ].map(s => (
                        <div className="stat-card" key={s.label}>
                            <div className="stat-value">{s.value}</div>
                            <div className={`stat-label ${isTamil ? 'tamil' : ''}`}>{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                    {[
                        { key: 'products', label: isTamil ? '🌿 என் பொருட்கள்' : '🌿 My Products' },
                        { key: 'notifications', label: isTamil ? `🔔 அறிவிப்புகள் ${unreadCount > 0 ? `(${unreadCount})` : ''}` : `🔔 Notifications ${unreadCount > 0 ? `(${unreadCount})` : ''}` },
                    ].map(t => (
                        <button key={t.key} onClick={() => handleTabSwitch(t.key)}
                            className={`btn ${tab === t.key ? 'btn-primary' : 'btn-outline'} ${isTamil ? 'tamil' : ''}`}>
                            {t.label}
                        </button>
                    ))}
                    <button className="btn btn-amber" style={{ marginLeft: 'auto' }} onClick={isTamil ? startVoiceAdd : () => { setVoiceStep(-1); setShowAddModal(true); }}>
                        <span className={isTamil ? 'tamil' : ''}>+ {isTamil ? 'பொருள் சேர்' : 'Add Product'}</span>
                    </button>
                </div>

                {/* Products Tab */}
                {tab === 'products' && (
                    <div>
                        {farmerProducts.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">🌱</div>
                                <p className={`empty-state-text ${isTamil ? 'tamil' : ''}`}>
                                    {isTamil ? 'இன்னும் பொருட்கள் சேர்க்கவில்லை. மேலே உள்ள பொத்தானை அழுத்தி சேர்க்கவும்.' : 'No products yet. Click "Add Product" to get started.'}
                                </p>
                            </div>
                        ) : (
                            <div className="grid-3">
                                {farmerProducts.map(p => (
                                    <div className="product-card" key={p.id}>
                                        <div style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(45,122,79,0.3), rgba(26,74,46,0.3))', borderBottom: '1px solid rgba(76,175,114,0.2)' }}>
                                            <div style={{ fontSize: '32px', textAlign: 'center' }}>
                                                {p.category?.toLowerCase().includes('fruit') ? '🍎' : p.category?.toLowerCase().includes('grain') ? '🌾' : '🥬'}
                                            </div>
                                        </div>
                                        <div className="product-card-body">
                                            <div className="product-card-name">{p.name}</div>
                                            <div className="product-card-farmer">{p.category}</div>
                                            <div className="product-card-price">₹{p.price} <span className="product-card-unit">/ {p.unit}</span></div>
                                            <div className="product-card-stock">
                                                {isTamil ? 'கையிருப்பு:' : 'Stock:'} {p.stock} {p.unit}
                                            </div>
                                            {p.description && <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>{p.description}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Notifications Tab */}
                {tab === 'notifications' && (
                    <div>
                        <h2 className={`section-title ${isTamil ? 'tamil' : ''}`}>
                            {isTamil ? '🔔 ஆர்டர் அறிவிப்புகள்' : '🔔 Order Notifications'}
                        </h2>
                        {farmerNotifications.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">🔕</div>
                                <p className={`empty-state-text ${isTamil ? 'tamil' : ''}`}>
                                    {isTamil ? 'இன்னும் ஆர்டர்கள் இல்லை' : 'No orders yet'}
                                </p>
                            </div>
                        ) : (
                            <>
                                {isTamil && (
                                    <p className="tamil" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px' }}>
                                        🎤 அறிவிப்பை தொட்டால் குரலில் படிக்கும்
                                    </p>
                                )}
                                {[...farmerNotifications].reverse().map(n => (
                                    <div key={n.id} className={`notif-card ${!n.read ? 'unread' : ''} ${n.isTamil ? 'tamil-text' : ''}`}
                                        onClick={() => handleNotificationClick(n)} style={{ cursor: 'pointer' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <p style={{ color: 'white', fontSize: '15px' }}>{n.message}</p>
                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0, marginLeft: '8px' }}>
                                                {!n.read && <span className="badge">புதியது</span>}
                                                {isTamil && <span style={{ fontSize: '16px' }} title="குரலில் கேளு">🔊</span>}
                                            </div>
                                        </div>
                                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '6px' }}>
                                            {new Date(n.date).toLocaleString()}
                                        </p>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Add Product Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAddModal(false)}>
                    <div className="modal-box">
                        <h2 className={`modal-title ${isTamil ? 'tamil' : ''}`}>
                            {isTamil ? '🌿 புதிய பொருள் சேர்' : '🌿 Add New Product'}
                        </h2>

                        {isTamil && voiceStep >= 0 && (
                            <div className="voice-wizard">
                                <div className="voice-wizard-step tamil">படி {voiceStep + 1} / {fields.length}</div>
                                <div className="voice-wizard-question">{PRODUCT_FIELDS_TA[voiceStep]?.voice}</div>
                                <div className="voice-wizard-progress">
                                    {fields.map((_, i) => (
                                        <div key={i} className={`voice-wizard-dot ${i === voiceStep ? 'active' : i < voiceStep ? 'done' : ''}`} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {fields.map((field, idx) => (
                            <div className="form-group" key={field.key}
                                style={{ display: voiceStep >= 0 && idx !== voiceStep ? 'none' : 'block' }}>
                                <label className={`form-label ${isTamil ? 'tamil' : ''}`}>{field.label}</label>
                                <input className={`form-input ${isTamil ? 'tamil' : ''}`} type={field.type} placeholder={field.placeholder}
                                    value={productForm[field.key]}
                                    onChange={e => setProductForm(p => ({ ...p, [field.key]: e.target.value }))}
                                    autoFocus={voiceStep === idx} />
                                {voiceStep >= 0 && (
                                    <button className="btn btn-primary btn-sm" style={{ marginTop: '10px' }} onClick={handleVoiceNext}>
                                        {voiceStep < fields.length - 1 ? (isTamil ? '➡ அடுத்தது' : 'Next') : (isTamil ? '✅ சேர்' : 'Add')}
                                    </button>
                                )}
                            </div>
                        ))}

                        {voiceStep < 0 && (
                            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleAddProduct}>
                                    {isTamil ? '✅ சேர்' : '✅ Add Product'}
                                </button>
                                <button className="btn btn-outline" onClick={() => setShowAddModal(false)}>
                                    {isTamil ? 'ரத்து' : 'Cancel'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
