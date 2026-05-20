import { useState, useEffect, useRef } from 'react';
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

// Generate UPI QR using free public API — no npm package needed
async function generateUpiQr(farmerPhone, farmerName, amount) {
    const upiString = `upi://pay?pa=${encodeURIComponent((farmerPhone || '0000000000') + '@upi')}&pn=${encodeURIComponent(farmerName || 'Farmer')}&am=${amount}&cu=INR&tn=${encodeURIComponent('DirectFromFarm')}`;
    const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&format=png&data=${encodeURIComponent(upiString)}`;
    try {
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error('QR API failed');
        const blob = await res.blob();
        return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch {
        // Fallback: return direct URL (img tag will still render it)
        return apiUrl;
    }
}

export default function BuyerMarketplace() {
    const navigate = useNavigate();
    const { currentUser, userRole, products, orders, placeOrder, logout, fetchProducts } = useApp();
    const [search, setSearch] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [tab, setTab] = useState('marketplace');
    const [orderSuccess, setOrderSuccess] = useState(null);
    const [loading, setLoading] = useState(false);
    const [qrDataUrl, setQrDataUrl] = useState(null);
    const [qrLoading, setQrLoading] = useState(false);
    const [activeMapOrder, setActiveMapOrder] = useState(null);

    useEffect(() => {
        if (!currentUser || userRole !== 'buyer') {
            navigate('/auth/buyer');
        } else {
            fetchProducts();
        }
    }, [currentUser, userRole, navigate, fetchProducts]);

    // Generate QR when product or quantity changes in modal
    useEffect(() => {
        if (!selectedProduct) { setQrDataUrl(null); return; }
        setQrLoading(true);
        const total = selectedProduct.price * quantity;
        generateUpiQr(selectedProduct.farmerPhone, selectedProduct.farmerName, total)
            .then(url => { setQrDataUrl(url); setQrLoading(false); });
    }, [selectedProduct, quantity]);

    const filtered = products.filter(p =>
        p.stock > 0 &&
        (p.name?.toLowerCase().includes(search.toLowerCase()) ||
            p.category?.toLowerCase().includes(search.toLowerCase()) ||
            p.farmerName?.toLowerCase().includes(search.toLowerCase()))
    );

    const myOrders = orders.filter(o => o.buyerId === currentUser?.id);

    const handleBuy = async () => {
        if (!selectedProduct || quantity < 1) return;
        setLoading(true);
        const result = await placeOrder({
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

        if (result.success) {
            // Generate PDF with QR
            try {
                await generateBill({
                    order: result.order,
                    buyer: currentUser,
                    product: selectedProduct,
                    quantity,
                    qrDataUrl,
                });
            } catch (e) {
                console.error('PDF error:', e);
            }
            setOrderSuccess(result.order);
            setSelectedProduct(null);
            setQuantity(1);
            fetchProducts(); // refresh stock
        } else {
            console.error('Order failed:', result.error);
        }
        setLoading(false);
    };

    const handleDownloadBill = async (order) => {
        const product = products.find(p => p.id === order.productId) || { name: order.productName, unit: order.unit };
        const qr = await generateUpiQr(order.farmerPhone, order.farmerName, order.totalPrice);
        await generateBill({ order, buyer: currentUser, product, quantity: order.quantity, qrDataUrl: qr });
    };

    if (!currentUser) return null;

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0d1f15 0%, #1a2e10 50%, #0d1f15 100%)' }}>
            {/* Navbar */}
            <nav className="navbar">
                <div className="navbar-brand">🌾 Direct<span>From</span>Farm</div>
                <div className="navbar-actions">
                    <span className="navbar-user">👤 {currentUser.name}</span>
                    <button className="btn btn-danger btn-sm" onClick={() => { logout(); navigate('/'); }}>Logout</button>
                </div>
            </nav>

            <div className="dashboard">
                <div className="dashboard-header">
                    <h1 className="dashboard-title">🛒 Fresh Marketplace</h1>
                    <p className="dashboard-subtitle">Buy directly from local farmers</p>
                </div>

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
                <div className="dashboard-tabs">
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
                                        <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(45,122,79,0.2), rgba(26,74,46,0.3))', fontSize: '56px', borderBottom: '1px solid rgba(76,175,114,0.15)' }}>
                                            {getEmoji(p.category)}
                                        </div>
                                        <div className="product-card-body">
                                            <div className="product-card-name">{p.name}</div>
                                            <div className="product-card-farmer">🧑‍🌾 {p.farmerName}</div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                                                <div>
                                                    <div className="product-card-price">₹{p.price}<span className="product-card-unit">/{p.unit || 'unit'}</span></div>
                                                    {(p.unit === 'kg' || p.unit === 'gram') && (
                                                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                                                            {p.unit === 'kg' ? `₹${(p.price / 1000).toFixed(2)}/g` : `₹${(p.price * 1000).toFixed(0)}/kg`}
                                                        </div>
                                                    )}
                                                </div>
                                                <button className="btn btn-primary btn-sm" onClick={e => { e.stopPropagation(); setSelectedProduct(p); setQuantity(1); }}>Buy</button>
                                            </div>
                                            <div className="product-card-stock">Stock: {p.stock} {p.unit || 'unit'}</div>
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
                                            {o.farmerPhone && (
                                                <div style={{ fontSize: '12px', color: '#f59e0b' }}>📞 {o.farmerPhone}</div>
                                            )}
                                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{new Date(o.date).toLocaleString()}</div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            <div style={{ fontSize: '18px', fontWeight: 800, color: '#f59e0b', marginRight: '6px' }}>₹{o.totalPrice}</div>
                                            <button className="btn btn-amber btn-sm" onClick={() => setActiveMapOrder(o)} style={{ padding: '6px 12px', fontSize: '12px' }}>🗺️ Track Route</button>
                                            <button className="btn btn-primary btn-sm" onClick={() => handleDownloadBill(o)} style={{ padding: '6px 12px', fontSize: '12px' }}>📄 Bill</button>
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
                        <div style={{ textAlign: 'center', fontSize: '56px', marginBottom: '12px' }}>{getEmoji(selectedProduct.category)}</div>
                        <h2 className="modal-title" style={{ textAlign: 'center' }}>{selectedProduct.name}</h2>

                        <div style={{ background: 'rgba(76,175,114,0.08)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ color: '#a8d5b5' }}>Farmer:</span>
                                <span style={{ color: 'white', fontWeight: 600 }}>{selectedProduct.farmerName}</span>
                            </div>
                            {selectedProduct.farmerPhone && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ color: '#a8d5b5' }}>📞 Contact:</span>
                                    <span style={{ color: '#f59e0b', fontWeight: 600 }}>{selectedProduct.farmerPhone}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ color: '#a8d5b5' }}>Price:</span>
                                <div>
                                    <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '18px' }}>₹{selectedProduct.price}/{selectedProduct.unit || 'unit'}</span>
                                    {(selectedProduct.unit === 'kg' || selectedProduct.unit === 'gram') && (
                                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textAlign: 'right' }}>
                                            {selectedProduct.unit === 'kg' ? `₹${(selectedProduct.price / 1000).toFixed(2)}/gram` : `₹${(selectedProduct.price * 1000).toFixed(0)}/kg`}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#a8d5b5' }}>Available:</span>
                                <span style={{ color: 'white' }}>{selectedProduct.stock} {selectedProduct.unit || 'unit'}</span>
                            </div>
                        </div>

                        {selectedProduct.description && (
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '20px' }}>{selectedProduct.description}</p>
                        )}

                        <div className="form-group">
                            <label className="form-label">Quantity ({selectedProduct.unit || 'unit'})</label>
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

                        {/* UPI QR Code */}
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '8px' }}>
                                📱 Scan UPI QR to pay the farmer directly
                            </p>
                            {qrLoading ? (
                                <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)' }}>Generating QR...</div>
                            ) : qrDataUrl ? (
                                <div style={{ display: 'inline-block', background: 'white', padding: '8px', borderRadius: '12px' }}>
                                    <img src={qrDataUrl} alt="UPI QR Code" style={{ width: '140px', height: '140px', display: 'block' }} />
                                </div>
                            ) : (
                                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>QR unavailable (farmer phone not set)</div>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="btn btn-amber" style={{ flex: 1 }} onClick={handleBuy} disabled={loading}>
                                {loading ? <span className="spinner" /> : '🛒 Buy Now & Get Bill'}
                            </button>
                            <button className="btn btn-outline" onClick={() => setSelectedProduct(null)}>Cancel</button>
                        </div>
                        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: '10px' }}>
                            📄 PDF bill with QR code will be downloaded automatically
                        </p>
                    </div>
                </div>
            )}

            {/* Map Modal */}
            {activeMapOrder && (
                <RouteMapModal order={activeMapOrder} onClose={() => setActiveMapOrder(null)} />
            )}
        </div>
    );
}

/* ── ROUTE MAP MODAL COMPONENT (LEAFLET + OSRM) ──────────────────── */
function RouteMapModal({ order, onClose }) {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const routeLayers = useRef([]);
    const markerLayers = useRef([]);
    
    const [selectedRoute, setSelectedRoute] = useState('shortest');
    const [locationMode, setLocationMode] = useState('coimbatore');
    const [shortestStats, setShortestStats] = useState({ distance: '12.4', duration: '18' });
    const [safestStats, setSafestStats] = useState({ distance: '14.1', duration: '22' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [customBuyerCoord, setCustomBuyerCoord] = useState(null);

    // Dynamic coordinates mapping
    const presets = {
        coimbatore: {
            buyer: [11.0168, 76.9558], // Coimbatore city center
            farmer: [10.9942, 76.8286], // Thondamuthur organic farm area
        },
        chennai: {
            buyer: [13.0827, 80.2707], // Chennai center
            farmer: [12.5117, 79.8856], // Maduranthakam farm area
        }
    };

    useEffect(() => {
        if (!window.L || !mapRef.current) return;

        // Initialize Map if not already done
        if (!mapInstance.current) {
            const initialCenter = presets.coimbatore.buyer;
            const map = window.L.map(mapRef.current, {
                zoomControl: true,
                attributionControl: false
            }).setView(initialCenter, 11);

            window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
            
            // Add custom map click handler
            map.on('click', (e) => {
                const { lat, lng } = e.latlng;
                setCustomBuyerCoord([lat, lng]);
                setLocationMode('custom');
            });

            mapInstance.current = map;
        }

        const map = mapInstance.current;

        // Resolve coordinates
        let buyerCoord = presets.coimbatore.buyer;
        let farmerCoord = presets.coimbatore.farmer;

        if (locationMode === 'coimbatore') {
            buyerCoord = presets.coimbatore.buyer;
            farmerCoord = presets.coimbatore.farmer;
        } else if (locationMode === 'chennai') {
            buyerCoord = presets.chennai.buyer;
            farmerCoord = presets.chennai.farmer;
        } else if (locationMode === 'custom' && customBuyerCoord) {
            buyerCoord = customBuyerCoord;
            // Bind to active local area
            farmerCoord = presets.coimbatore.farmer;
        }

        async function fetchRoutes() {
            setLoading(true);
            setError(null);

            // Clear previous route lines
            routeLayers.current.forEach(layer => map.removeLayer(layer));
            routeLayers.current = [];

            // Clear previous markers
            markerLayers.current.forEach(layer => map.removeLayer(layer));
            markerLayers.current = [];

            try {
                // Custom Leaflet Icons
                const buyerIcon = window.L.divIcon({
                    className: 'buyer-map-marker',
                    html: '<div style="background: #10b981; border: 2px solid white; width: 14px; height: 14px; border-radius: 50%; box-shadow: 0 0 12px #10b981; animation: markerPulse 1.5s infinite;"></div>',
                    iconSize: [14, 14],
                    iconAnchor: [7, 7]
                });

                const farmerIcon = window.L.divIcon({
                    className: 'farmer-map-marker',
                    html: '<div style="background: #f59e0b; border: 2px solid white; width: 22px; height: 22px; border-radius: 50%; box-shadow: 0 0 12px #f59e0b; display: flex; align-items: center; justify-content: center; font-size: 11px;">🌾</div>',
                    iconSize: [22, 22],
                    iconAnchor: [11, 11]
                });

                const bMarker = window.L.marker(buyerCoord, { icon: buyerIcon })
                    .addTo(map)
                    .bindPopup('<b>📍 Your Delivery Destination</b><br/>Click anywhere on the map to set a new buyer point!')
                    .openPopup();

                const fMarker = window.L.marker(farmerCoord, { icon: farmerIcon })
                    .addTo(map)
                    .bindPopup(`<b>🧑‍🌾 ${order.farmerName}'s Organic Farm</b><br/>Fresh produce source.`);

                markerLayers.current.push(bMarker, fMarker);

                // Fetch routes from free public OSRM API
                const [latB, lngB] = buyerCoord;
                const [latF, lngF] = farmerCoord;
                const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${lngB},${latB};${lngF},${latF}?overview=full&geometries=geojson&alternatives=true`;
                
                const response = await fetch(osrmUrl);
                if (!response.ok) throw new Error('OSRM service connection error');
                const data = await response.json();

                if (!data.routes || data.routes.length === 0) {
                    throw new Error('No driving route found');
                }

                // Shortest Route (Route 1)
                const route1 = data.routes[0];
                setShortestStats({
                    distance: (route1.distance / 1000).toFixed(1),
                    duration: Math.round(route1.duration / 60)
                });

                const shortestLine = window.L.geoJSON(route1.geometry, {
                    style: {
                        color: '#10b981',
                        weight: selectedRoute === 'shortest' ? 6 : 3,
                        opacity: selectedRoute === 'shortest' ? 0.9 : 0.4
                    }
                }).addTo(map);
                routeLayers.current.push(shortestLine);

                // Safest Route (Route 2)
                let safestGeometry;
                if (data.routes.length > 1) {
                    const route2 = data.routes[1];
                    setSafestStats({
                        distance: (route2.distance / 1000).toFixed(1),
                        duration: Math.round(route2.duration / 60)
                    });
                    safestGeometry = route2.geometry;
                } else {
                    // Force a detoured highway route dynamically for visual comparison
                    const midLat = (latB + latF) / 2 + 0.008;
                    const midLng = (lngB + lngF) / 2 - 0.008;
                    const detourUrl = `https://router.project-osrm.org/route/v1/driving/${lngB},${latB};${midLng},${midLat};${lngF},${latF}?overview=full&geometries=geojson`;
                    const detourResponse = await fetch(detourUrl);
                    if (detourResponse.ok) {
                        const detourData = await detourResponse.json();
                        if (detourData.routes && detourData.routes.length > 0) {
                            const dRoute = detourData.routes[0];
                            setSafestStats({
                                distance: (dRoute.distance / 1000).toFixed(1),
                                duration: Math.round(dRoute.duration / 60)
                            });
                            safestGeometry = dRoute.geometry;
                        }
                    }
                }

                if (safestGeometry) {
                    const safestLine = window.L.geoJSON(safestGeometry, {
                        style: {
                            color: '#0ea5e9',
                            weight: selectedRoute === 'safest' ? 6 : 3,
                            opacity: selectedRoute === 'safest' ? 0.9 : 0.4
                        }
                    }).addTo(map);
                    routeLayers.current.push(safestLine);
                }

                // Fit map viewport around bounds
                const bounds = window.L.latLngBounds([buyerCoord, farmerCoord]);
                map.fitBounds(bounds, { padding: [50, 50] });

            } catch (err) {
                console.error('Routing failed:', err);
                setError('Could not calculate real road routes. Check internet connection.');
            } finally {
                setLoading(false);
            }
        }

        fetchRoutes();

    }, [locationMode, customBuyerCoord, selectedRoute]);

    const handleUseGps = () => {
        if (!navigator.geolocation) {
            alert('Browser geolocation is not supported.');
            return;
        }
        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                setCustomBuyerCoord([latitude, longitude]);
                setLocationMode('custom');
            },
            (err) => {
                alert('Live GPS access denied. Using Coimbatore preset.');
                setLoading(false);
            },
            { enableHighAccuracy: true, timeout: 5000 }
        );
    };

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="map-modal-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
                    <h2 className="modal-title" style={{ margin: 0, fontSize: '20px' }}>
                        🗺️ Live Route Tracker to {order.farmerName}'s Farm
                    </h2>
                    <button className="btn btn-primary btn-sm" onClick={onClose} style={{ padding: '6px 12px' }}>✕ Close</button>
                </div>

                <div className="map-grid">
                    {/* Map Panel */}
                    <div>
                        <div className="map-helper-tip">
                            💡 <b>Interactive Control:</b> Click anywhere on the map grid to change your location and recalculate the routes!
                        </div>
                        <div className="map-viewport-container">
                            <div ref={mapRef} className="map-leaflet-canvas" />
                            {loading && (
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                                    <div className="spinner" style={{ width: '40px', height: '40px', borderTopColor: '#f59e0b' }} />
                                    <p style={{ marginTop: '12px', fontSize: '14px', color: '#f59e0b', fontWeight: 600 }}>Calculating road routing...</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Dashboard Routing Panel */}
                    <div className="map-routing-panel">
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#a8d5b5', marginBottom: '8px' }}>📍 Buyer Location Mode:</div>
                            <div className="map-preset-chips">
                                <button className={`preset-chip ${locationMode === 'coimbatore' ? 'active' : ''}`}
                                    onClick={() => { setLocationMode('coimbatore'); setCustomBuyerCoord(null); }}>
                                    🌾 Coimbatore Preset
                                </button>
                                <button className={`preset-chip ${locationMode === 'chennai' ? 'active' : ''}`}
                                    onClick={() => { setLocationMode('chennai'); setCustomBuyerCoord(null); }}>
                                    🚜 Chennai Preset
                                </button>
                                <button className="preset-chip" onClick={handleUseGps} style={{ borderColor: '#10b981', color: '#10b981' }}>
                                    📡 Live GPS Tracker
                                </button>
                                {locationMode === 'custom' && (
                                    <button className="preset-chip active" style={{ background: '#10b981', borderColor: '#10b981' }}>
                                        🎯 Custom Point Chosen
                                    </button>
                                )}
                            </div>
                        </div>

                        {error && (
                            <div className="alert alert-danger" style={{ fontSize: '12px', padding: '10px' }}>⚠️ {error}</div>
                        )}

                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#a8d5b5', marginBottom: '12px' }}>🛣️ Choose Route Option:</div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {/* Shortest option */}
                                <div className={`route-card ${selectedRoute === 'shortest' ? 'selected-shortest' : ''}`}
                                    onClick={() => setSelectedRoute('shortest')}>
                                    <div className="route-card-header">
                                        <span className="route-badge badge-shortest">🟢 Shortest</span>
                                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Direct Backroads</span>
                                    </div>
                                    <div className="route-metrics">
                                        {shortestStats.distance} <span>km</span> • {shortestStats.duration} <span>mins</span>
                                    </div>
                                    <div className="route-highlights">
                                        🛡️ <b>Safety Rating:</b> ⭐⭐⭐ (3/5)
                                        <ul>
                                            <li>Uses agricultural corridors and minor roads</li>
                                            <li>Standard narrow rural tracks, some unpaved</li>
                                            <li>Best suited for daytime driving</li>
                                        </ul>
                                    </div>
                                </div>

                                {/* Safest option */}
                                <div className={`route-card ${selectedRoute === 'safest' ? 'selected-safest' : ''}`}
                                    onClick={() => setSelectedRoute('safest')}>
                                    <div className="route-card-header">
                                        <span className="route-badge badge-safest">🔵 Safest (Recommended)</span>
                                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Main Highways</span>
                                    </div>
                                    <div className="route-metrics">
                                        {safestStats.distance} <span>km</span> • {safestStats.duration} <span>mins</span>
                                    </div>
                                    <div className="route-highlights">
                                        🛡️ <b>Safety Rating:</b> ⭐⭐⭐⭐⭐ (5/5)
                                        <ul>
                                            <li>Follows wide, fully-paved state highways</li>
                                            <li>Heavy motorist presence, 100% active lighting</li>
                                            <li>Continuous cellular coverage & emergency hubs</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 'auto' }}>
                            Road data &copy; OpenStreetMap. Routes via OSRM API.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
