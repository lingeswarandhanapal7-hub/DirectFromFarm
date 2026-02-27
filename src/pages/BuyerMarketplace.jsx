import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { generateBill } from '../utils/pdfGenerator';

const PRODUCT_EMOJIS = {
    vegetables: '🥬', fruits: '🍎', grains: '🌾', dairy: '🥛', herbs: '🌿',
    default: '🛒'
};

function getEmoji(category = '') {
    const c = category.toLowerCase();
    for (const [key, emoji] of Object.entries(PRODUCT_EMOJIS)) {
        if (c.includes(key.slice(0, 4))) return emoji;
    }
    return PRODUCT_EMOJIS.default;
}

export default function BuyerMarketplace() {
    const navigate = useNavigate();
    const { currentUser, userRole, products, orders, placeOrder, logout } = useApp();
    const [search, setSearch] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [tab, setTab] = useState('marketplace');
    const [orderSuccess, setOrderSuccess] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!currentUser || userRole !== 'buyer') navigate('/auth/buyer');
    }, [currentUser, userRole, navigate]);

    const filtered = products.filter(p =>
        p.stock > 0 &&
        (p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.category?.toLowerCase().includes(search.toLowerCase()) ||
            p.farmerName?.toLowerCase().includes(search.toLowerCase()))
    );

    const myOrders = orders.filter(o => o.buyerId === currentUser?.id);

    const handleBuy = async () => {
        if (!selectedProduct || quantity < 1) return;
        setLoading(true);
        const order = placeOrder({
            productId: selectedProduct.id,
            productName: selectedProduct.name,
            farmerId: selectedProduct.farmerId,
            farmerName: selectedProduct.farmerName,
            farmerPhone: selectedProduct.farmerPhone,
            quantity,
            unit: selectedProduct.unit,
            pricePerUnit: selectedProduct.price,
            totalPrice: selectedProduct.price * quantity,
        });

        // Generate PDF
        try {
            await generateBill({ order, buyer: currentUser, product: selectedProduct, quantity });
        } catch (e) {
            console.error('PDF error:', e);
        }

        setLoading(false);
        setOrderSuccess(order);
        setSelectedProduct(null);
        setQuantity(1);
    };

    const handleDownloadBill = async (order) => {
        const product = products.find(p => p.id === order.productId) || { name: order.productName, unit: order.unit };
        await generateBill({ order, buyer: currentUser, product, quantity: order.quantity });
    };

    if (!currentUser) return null;

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0d1f15 0%, #1a2e10 50%, #0d1f15 100%)' }}>
            {/* Navbar */}
            <nav className="navbar">
                <div className="navbar-brand">🌾 Direct<span>From</span>Farm</div>
                <div className="navbar-actions">
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>👤 {currentUser.name}</span>
                    <button className="btn btn-danger btn-sm" onClick={() => { logout(); navigate('/'); }}>Logout</button>
                </div>
            </nav>

            <div className="dashboard">
                <div className="dashboard-header">
                    <h1 className="dashboard-title">🛒 Fresh Marketplace</h1>
                    <p className="dashboard-subtitle">Buy directly from local farmers</p>
                </div>

                {/* Order Success Banner */}
                {orderSuccess && (
                    <div className="alert alert-success" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>✅ Order placed! Bill downloaded. Farmer notified.</span>
                        <button className="btn btn-primary btn-sm" onClick={() => setOrderSuccess(null)}>✕</button>
                    </div>
                )}

                {/* Stats */}
                <div className="grid-3" style={{ marginBottom: '28px' }}>
                    {[
                        { value: products.filter(p => p.stock > 0).length, label: 'Available Products' },
                        { value: myOrders.length, label: 'My Orders' },
                        { value: `₹${myOrders.reduce((s, o) => s + o.totalPrice, 0)}`, label: 'Total Spent' },
                    ].map(s => (
                        <div className="stat-card" key={s.label}>
                            <div className="stat-value">{s.value}</div>
                            <div className="stat-label">{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                    {[
                        { key: 'marketplace', label: '🛒 Marketplace' },
                        { key: 'orders', label: `📦 My Orders (${myOrders.length})` },
                    ].map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            className={`btn ${tab === t.key ? 'btn-amber' : 'btn-outline'}`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Marketplace Tab */}
                {tab === 'marketplace' && (
                    <div>
                        {/* Search */}
                        <div style={{ marginBottom: '24px' }}>
                            <input className="form-input" placeholder="🔍 Search products, farmers, categories..."
                                value={search} onChange={e => setSearch(e.target.value)}
                                style={{ maxWidth: '480px', fontSize: '15px' }} />
                        </div>

                        {filtered.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">🌱</div>
                                <p className="empty-state-text">No products available yet. Check back soon!</p>
                            </div>
                        ) : (
                            <div className="grid-4">
                                {filtered.map(p => (
                                    <div className="product-card" key={p.id} onClick={() => { setSelectedProduct(p); setQuantity(1); }}>
                                        <div style={{
                                            height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: 'linear-gradient(135deg, rgba(45,122,79,0.2), rgba(26,74,46,0.3))',
                                            fontSize: '56px', borderBottom: '1px solid rgba(76,175,114,0.15)'
                                        }}>
                                            {getEmoji(p.category)}
                                        </div>
                                        <div className="product-card-body">
                                            <div className="product-card-name">{p.name}</div>
                                            <div className="product-card-farmer">🧑‍🌾 {p.farmerName}</div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                                                <div className="product-card-price">₹{p.price}<span className="product-card-unit">/{p.unit}</span></div>
                                                <button className="btn btn-primary btn-sm" onClick={e => { e.stopPropagation(); setSelectedProduct(p); setQuantity(1); }}>
                                                    Buy
                                                </button>
                                            </div>
                                            <div className="product-card-stock">Stock: {p.stock} {p.unit}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Orders Tab */}
                {tab === 'orders' && (
                    <div>
                        {myOrders.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">📦</div>
                                <p className="empty-state-text">No orders yet. Start shopping!</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {[...myOrders].reverse().map(o => (
                                    <div key={o.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                        <div>
                                            <div style={{ fontWeight: 700, color: 'white', fontSize: '16px' }}>{o.productName}</div>
                                            <div style={{ fontSize: '13px', color: '#a8d5b5' }}>From: {o.farmerName} • {o.quantity} {o.unit}</div>
                                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{new Date(o.date).toLocaleString()}</div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ fontSize: '20px', fontWeight: 800, color: '#f59e0b' }}>₹{o.totalPrice}</div>
                                            <button className="btn btn-primary btn-sm" onClick={() => handleDownloadBill(o)}>
                                                📄 Bill
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Buy Modal */}
            {selectedProduct && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelectedProduct(null)}>
                    <div className="modal-box">
                        <div style={{ textAlign: 'center', fontSize: '56px', marginBottom: '12px' }}>
                            {getEmoji(selectedProduct.category)}
                        </div>
                        <h2 className="modal-title" style={{ textAlign: 'center' }}>{selectedProduct.name}</h2>
                        <div style={{ background: 'rgba(76,175,114,0.08)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ color: '#a8d5b5' }}>Farmer:</span>
                                <span style={{ color: 'white', fontWeight: 600 }}>{selectedProduct.farmerName}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ color: '#a8d5b5' }}>Price:</span>
                                <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '18px' }}>₹{selectedProduct.price}/{selectedProduct.unit}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#a8d5b5' }}>Available:</span>
                                <span style={{ color: 'white' }}>{selectedProduct.stock} {selectedProduct.unit}</span>
                            </div>
                        </div>

                        {selectedProduct.description && (
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '20px' }}>{selectedProduct.description}</p>
                        )}

                        <div className="form-group">
                            <label className="form-label">Quantity ({selectedProduct.unit})</label>
                            <div className="qty-input">
                                <button className="qty-btn" onClick={() => setQuantity(q => Math.max(1, q - 1))}>−</button>
                                <div className="qty-display">{quantity}</div>
                                <button className="qty-btn" onClick={() => setQuantity(q => Math.min(selectedProduct.stock, q + 1))}>+</button>
                                <input className="form-input" type="number" min="1" max={selectedProduct.stock}
                                    value={quantity} onChange={e => setQuantity(Math.min(selectedProduct.stock, Math.max(1, Number(e.target.value))))}
                                    style={{ width: '80px' }} />
                            </div>
                        </div>

                        <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: '#fcd34d', fontWeight: 600 }}>Total Amount:</span>
                                <span style={{ color: '#f59e0b', fontSize: '24px', fontWeight: 800 }}>₹{selectedProduct.price * quantity}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="btn btn-amber" style={{ flex: 1 }} onClick={handleBuy} disabled={loading}>
                                {loading ? <span className="spinner" /> : '🛒 Buy Now & Get Bill'}
                            </button>
                            <button className="btn btn-outline" onClick={() => setSelectedProduct(null)}>Cancel</button>
                        </div>
                        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: '10px' }}>
                            📄 PDF bill will be downloaded automatically
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
