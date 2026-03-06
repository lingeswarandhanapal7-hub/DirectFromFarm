import { Router } from 'express';
import { products, farmers, saveDB } from '../data.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

/* GET /api/products — public, all products with stock > 0 */
router.get('/', (req, res) => {
    const list = [...products.values()];
    res.json(list);
});

/* GET /api/products/mine — farmer's own products (auth) */
router.get('/mine', verifyToken, (req, res) => {
    if (req.user.role !== 'farmer') return res.status(403).json({ error: 'Farmers only' });
    const mine = [...products.values()].filter(p => p.farmerId === req.user.id);
    res.json(mine);
});

/* POST /api/products — add product (farmer auth) */
router.post('/', verifyToken, (req, res) => {
    if (req.user.role !== 'farmer') return res.status(403).json({ error: 'Farmers only' });

    // Find farmer data for name and phone
    const farmerEntry = [...farmers.values()].find(f => f.id === req.user.id);
    const product = {
        id: Date.now(),
        farmerId: req.user.id,
        farmerName: farmerEntry?.name || '',
        farmerPhone: farmerEntry?.phone || '',
        ...req.body,
        price: Number(req.body.price),
        stock: Number(req.body.stock),
        createdAt: new Date().toISOString(),
    };
    products.set(String(product.id), product);
    saveDB();
    res.json(product);
});

/* PUT /api/products/:id — update product (farmer auth, own only) */
router.put('/:id', verifyToken, (req, res) => {
    if (req.user.role !== 'farmer') return res.status(403).json({ error: 'Farmers only' });
    const product = products.get(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.farmerId !== req.user.id) return res.status(403).json({ error: 'Not your product' });

    const updated = {
        ...product,
        ...req.body,
        price: req.body.price !== undefined ? Number(req.body.price) : product.price,
        stock: req.body.stock !== undefined ? Number(req.body.stock) : product.stock,
        farmerId: product.farmerId, // cannot be overridden
        id: product.id,
    };
    products.set(req.params.id, updated);
    saveDB();
    res.json(updated);
});

/* DELETE /api/products/:id — remove product (farmer auth, own only) */
router.delete('/:id', verifyToken, (req, res) => {
    if (req.user.role !== 'farmer') return res.status(403).json({ error: 'Farmers only' });
    const product = products.get(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.farmerId !== req.user.id) return res.status(403).json({ error: 'Not your product' });
    products.delete(req.params.id);
    saveDB();
    res.json({ success: true });
});

export default router;
