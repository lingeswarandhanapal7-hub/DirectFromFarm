import { Router } from 'express';
import { orders, products, buyers, notifications, saveDB } from '../data.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

/* POST /api/orders — place order (buyer auth) */
router.post('/', verifyToken, (req, res) => {
    if (req.user.role !== 'buyer') return res.status(403).json({ error: 'Buyers only' });

    const {
        productId, productName, farmerId, farmerName, farmerPhone,
        quantity, unit, pricePerUnit, totalPrice
    } = req.body;

    // Validate product and stock
    const product = products.get(String(productId));
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.stock < quantity) return res.status(400).json({ error: 'Insufficient stock' });

    // Deduct stock
    products.set(String(productId), { ...product, stock: product.stock - quantity });

    // Find buyer
    const buyerEntry = [...buyers.values()].find(b => b.id === req.user.id);

    const order = {
        id: Date.now(),
        buyerId: req.user.id,
        buyerName: buyerEntry?.name || '',
        buyerEmail: buyerEntry?.email || '',
        productId, productName,
        farmerId, farmerName, farmerPhone,
        quantity, unit, pricePerUnit, totalPrice,
        date: new Date().toISOString(),
    };
    orders.set(String(order.id), order);

    // Farmer notification
    const notif = {
        id: Date.now() + 1,
        farmerId,
        message: `New Order! ${buyerEntry?.name || 'A buyer'} bought ${quantity} ${unit} of ${productName}. Total: ₹${totalPrice}`,
        isTamil: false,
        orderId: order.id,
        read: false,
        date: new Date().toISOString(),
    };
    notifications.set(String(notif.id), notif);
    saveDB();

    res.json(order);
});

/* GET /api/orders/mine — buyer's own orders */
router.get('/mine', verifyToken, (req, res) => {
    if (req.user.role !== 'buyer') return res.status(403).json({ error: 'Buyers only' });
    const mine = [...orders.values()].filter(o => o.buyerId === req.user.id);
    res.json(mine);
});

/* GET /api/orders/notifications — farmer's notifications */
router.get('/notifications', verifyToken, (req, res) => {
    if (req.user.role !== 'farmer') return res.status(403).json({ error: 'Farmers only' });
    const mine = [...notifications.values()].filter(n => n.farmerId === req.user.id);
    res.json(mine);
});

/* PUT /api/orders/notifications/:id/read — mark notification read */
router.put('/notifications/:id/read', verifyToken, (req, res) => {
    const notif = notifications.get(req.params.id);
    if (!notif) return res.status(404).json({ error: 'Notification not found' });
    const updated = { ...notif, read: true };
    notifications.set(req.params.id, updated);
    saveDB();
    res.json(updated);
});

export default router;
