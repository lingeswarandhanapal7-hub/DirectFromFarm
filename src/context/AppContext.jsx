import { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'farmer' | 'buyer'
  const [isTamil, setIsTamil] = useState(false);

  // Persistent storage helpers
  const getStorage = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  };

  const [farmers, setFarmers] = useState(() => getStorage('dff_farmers', []));
  const [buyers, setBuyers] = useState(() => getStorage('dff_buyers', []));
  const [products, setProducts] = useState(() => getStorage('dff_products', []));
  const [orders, setOrders] = useState(() => getStorage('dff_orders', []));
  const [notifications, setNotifications] = useState(() => getStorage('dff_notifications', []));

  useEffect(() => { localStorage.setItem('dff_farmers', JSON.stringify(farmers)); }, [farmers]);
  useEffect(() => { localStorage.setItem('dff_buyers', JSON.stringify(buyers)); }, [buyers]);
  useEffect(() => { localStorage.setItem('dff_products', JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem('dff_orders', JSON.stringify(orders)); }, [orders]);
  useEffect(() => { localStorage.setItem('dff_notifications', JSON.stringify(notifications)); }, [notifications]);

  const registerFarmer = (data) => {
    const farmer = { ...data, id: Date.now(), role: 'farmer', tamilEnabled: false };
    setFarmers(prev => [...prev, farmer]);
    return farmer;
  };

  const registerBuyer = (data) => {
    const buyer = { ...data, id: Date.now(), role: 'buyer' };
    setBuyers(prev => [...prev, buyer]);
    return buyer;
  };

  const loginFarmer = (phone, password) => {
    const farmer = farmers.find(f => f.phone === phone && f.password === password);
    if (farmer) { setCurrentUser(farmer); setUserRole('farmer'); setIsTamil(farmer.tamilEnabled || false); return farmer; }
    return null;
  };

  const loginBuyer = (email, password) => {
    const buyer = buyers.find(b => b.email === email && b.password === password);
    if (buyer) { setCurrentUser(buyer); setUserRole('buyer'); return buyer; }
    return null;
  };

  const logout = () => { setCurrentUser(null); setUserRole(null); setIsTamil(false); };

  const addProduct = (product) => {
    const p = { ...product, id: Date.now(), farmerId: currentUser.id, farmerName: currentUser.name, farmerPhone: currentUser.phone };
    setProducts(prev => [...prev, p]);
    return p;
  };

  const updateProduct = (id, data) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
  };

  const placeOrder = (order) => {
    const o = { ...order, id: Date.now(), buyerId: currentUser.id, buyerName: currentUser.name, buyerEmail: currentUser.email, date: new Date().toISOString() };
    setOrders(prev => [...prev, o]);

    // Notify farmer
    const farmer = farmers.find(f => f.id === order.farmerId);
    const tamilMsg = farmer?.tamilEnabled;
    const msg = tamilMsg
      ? `புதிய ஆர்டர்! ${currentUser.name} ${order.productName} - ${order.quantity} ${order.unit} வாங்கியுள்ளார். மொத்தம்: ₹${order.totalPrice}`
      : `New Order! ${currentUser.name} bought ${order.quantity} ${order.unit} of ${order.productName}. Total: ₹${order.totalPrice}`;

    setNotifications(prev => [...prev, {
      id: Date.now(),
      farmerId: order.farmerId,
      message: msg,
      isTamil: tamilMsg,
      orderId: o.id,
      read: false,
      date: new Date().toISOString()
    }]);

    // Reduce stock
    updateProduct(order.productId, { stock: Math.max(0, (products.find(p => p.id === order.productId)?.stock || 0) - order.quantity) });

    return o;
  };

  const markNotificationRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const toggleTamil = () => {
    const newVal = !isTamil;
    setIsTamil(newVal);
    if (currentUser && userRole === 'farmer') {
      setFarmers(prev => prev.map(f => f.id === currentUser.id ? { ...f, tamilEnabled: newVal } : f));
      setCurrentUser(prev => ({ ...prev, tamilEnabled: newVal }));
    }
  };

  const farmerProducts = currentUser && userRole === 'farmer'
    ? products.filter(p => p.farmerId === currentUser.id)
    : products;

  const farmerNotifications = currentUser && userRole === 'farmer'
    ? notifications.filter(n => n.farmerId === currentUser.id)
    : [];

  const unreadCount = farmerNotifications.filter(n => !n.read).length;

  return (
    <AppContext.Provider value={{
      currentUser, userRole, isTamil, toggleTamil,
      farmers, buyers, products, orders, notifications,
      farmerProducts, farmerNotifications, unreadCount,
      registerFarmer, registerBuyer, loginFarmer, loginBuyer, logout,
      addProduct, updateProduct, placeOrder, markNotificationRead
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
