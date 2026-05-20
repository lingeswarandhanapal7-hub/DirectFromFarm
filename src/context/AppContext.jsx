import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

const AppContext = createContext(null);

const getStorage = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => getStorage('dff_currentUser', null));
  const [userRole, setUserRole] = useState(() => getStorage('dff_role', null));
  const [isTamil, setIsTamil] = useState(() => {
    const user = getStorage('dff_currentUser', null);
    return user ? (user.tamilEnabled || false) : false;
  });

  // Local state (synced from backend)
  const [products, setProducts] = useState(() => getStorage('dff_products', []));
  const [orders, setOrders] = useState(() => getStorage('dff_orders', []));
  const [notifications, setNotifications] = useState(() => getStorage('dff_notifications', []));

  // Persist user session
  useEffect(() => { localStorage.setItem('dff_currentUser', JSON.stringify(currentUser)); }, [currentUser]);
  useEffect(() => { localStorage.setItem('dff_role', JSON.stringify(userRole)); }, [userRole]);
  useEffect(() => { localStorage.setItem('dff_products', JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem('dff_orders', JSON.stringify(orders)); }, [orders]);
  useEffect(() => { localStorage.setItem('dff_notifications', JSON.stringify(notifications)); }, [notifications]);

  // ─── Fetch helpers ──────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    try {
      const data = await api.get('/api/products');
      setProducts(data);
    } catch (e) {
      console.warn('Could not fetch products from backend, using local cache:', e.message);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const data = await api.get('/api/orders/mine');
      setOrders(data);
    } catch (e) {
      console.warn('Could not fetch orders:', e.message);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.get('/api/orders/notifications');
      setNotifications(data);
    } catch (e) {
      console.warn('Could not fetch notifications:', e.message);
    }
  }, []);

  // Load products on mount and when user changes
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (!currentUser) return;
    if (userRole === 'buyer') fetchOrders();
    if (userRole === 'farmer') fetchNotifications();
  }, [currentUser, userRole, fetchOrders, fetchNotifications]);

  // ─── Auth ────────────────────────────────────────────────────────
  const registerFarmer = async (data) => {
    try {
      const { token, user } = await api.post('/api/auth/farmer/register', data);
      api.setToken(token);
      return { success: true, user };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const registerBuyer = async (data) => {
    try {
      const { token, user } = await api.post('/api/auth/buyer/register', data);
      api.setToken(token);
      return { success: true, user };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const loginFarmer = async (phone, password) => {
    try {
      const { token, user } = await api.post('/api/auth/farmer/login', { phone, password });
      api.setToken(token);
      setCurrentUser(user);
      setUserRole('farmer');
      setIsTamil(user.tamilEnabled || false);
      return { success: true, user };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const loginBuyer = async (email, password) => {
    try {
      const { token, user } = await api.post('/api/auth/buyer/login', { email, password });
      api.setToken(token);
      setCurrentUser(user);
      setUserRole('buyer');
      return { success: true, user };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const logout = () => {
    api.clearToken();
    setCurrentUser(null);
    setUserRole(null);
    setIsTamil(false);
    setOrders([]);
    setNotifications([]);
    localStorage.removeItem('dff_currentUser');
    localStorage.removeItem('dff_role');
  };

  // ─── Products ────────────────────────────────────────────────────
  const addProduct = async (product) => {
    try {
      const p = await api.post('/api/products', product);
      setProducts(prev => [...prev, p]);
      return { success: true, product: p };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const updateProduct = async (id, data) => {
    try {
      const updated = await api.put(`/api/products/${id}`, data);
      setProducts(prev => prev.map(p => p.id === id ? updated : p));
      return { success: true, product: updated };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const deleteProduct = async (id) => {
    try {
      await api.delete(`/api/products/${id}`);
      setProducts(prev => prev.filter(p => p.id !== id));
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  // ─── Orders ──────────────────────────────────────────────────────
  const placeOrder = async (order) => {
    try {
      const o = await api.post('/api/orders', order);
      setOrders(prev => [...prev, o]);
      // Update local product stock
      setProducts(prev => prev.map(p =>
        p.id === order.productId
          ? { ...p, stock: Math.max(0, p.stock - order.quantity) }
          : p
      ));
      return { success: true, order: o };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  // ─── Notifications ───────────────────────────────────────────────
  const markNotificationRead = async (id) => {
    try {
      await api.put(`/api/orders/notifications/${id}/read`, {});
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch {
      // Optimistic update even if backend fails
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }
  };

  // ─── Tamil toggle ────────────────────────────────────────────────
  const toggleTamil = () => {
    const newVal = !isTamil;
    setIsTamil(newVal);
    if (currentUser && userRole === 'farmer') {
      setCurrentUser(prev => ({ ...prev, tamilEnabled: newVal }));
    }
  };

  // ─── OTP ─────────────────────────────────────────────────────────
  const sendOtp = async (email) => {
    try {
      const data = await api.post('/api/otp/send', { email });
      return { success: true, ...data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const verifyOtp = async (email, otp) => {
    try {
      const data = await api.post('/api/otp/verify', { email, otp });
      return { success: true, ...data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  // ─── Derived state ───────────────────────────────────────────────
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
      products, orders, notifications,
      farmerProducts, farmerNotifications, unreadCount,
      registerFarmer, registerBuyer, loginFarmer, loginBuyer, logout,
      addProduct, updateProduct, deleteProduct, placeOrder,
      markNotificationRead, sendOtp, verifyOtp,
      fetchProducts, fetchOrders, fetchNotifications,
    }}>
      {children}
    </AppContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useApp = () => useContext(AppContext);
