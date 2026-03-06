import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { farmers, buyers, saveDB } from '../data.js';

const router = Router();
const SALT_ROUNDS = 10;

function makeToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
}

/* ── FARMER ─────────────────────────────────────────────── */

router.post('/farmer/register', async (req, res) => {
    try {
        const { name, phone, village, district, password, tamilEnabled } = req.body;
        if (!name || !phone || !password) {
            return res.status(400).json({ error: 'name, phone and password are required' });
        }
        if (farmers.has(phone)) {
            return res.status(409).json({ error: 'Phone already registered' });
        }
        const hashed = await bcrypt.hash(password, SALT_ROUNDS);
        const farmer = {
            id: Date.now(),
            name, phone, village, district, tamilEnabled: !!tamilEnabled,
            password: hashed,
            role: 'farmer',
            createdAt: new Date().toISOString(),
        };
        farmers.set(phone, farmer);
        saveDB();
        const { password: _, ...safe } = farmer;
        const token = makeToken({ id: farmer.id, phone, role: 'farmer' });
        res.json({ token, user: safe });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/farmer/login', async (req, res) => {
    try {
        const { phone, password } = req.body;
        const farmer = farmers.get(phone);
        if (!farmer) return res.status(401).json({ error: 'Invalid phone or password' });
        const ok = await bcrypt.compare(password, farmer.password);
        if (!ok) return res.status(401).json({ error: 'Invalid phone or password' });
        const { password: _, ...safe } = farmer;
        const token = makeToken({ id: farmer.id, phone, role: 'farmer' });
        res.json({ token, user: safe });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/* ── BUYER ──────────────────────────────────────────────── */

router.post('/buyer/register', async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'name, email and password are required' });
        }
        if (buyers.has(email)) {
            return res.status(409).json({ error: 'Email already registered' });
        }
        const hashed = await bcrypt.hash(password, SALT_ROUNDS);
        const buyer = {
            id: Date.now(),
            name, email, phone,
            password: hashed,
            role: 'buyer',
            createdAt: new Date().toISOString(),
        };
        buyers.set(email, buyer);
        saveDB();
        const { password: _, ...safe } = buyer;
        const token = makeToken({ id: buyer.id, email, role: 'buyer' });
        res.json({ token, user: safe });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/buyer/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const buyer = buyers.get(email);
        if (!buyer) return res.status(401).json({ error: 'Invalid email or password' });
        const ok = await bcrypt.compare(password, buyer.password);
        if (!ok) return res.status(401).json({ error: 'Invalid email or password' });
        const { password: _, ...safe } = buyer;
        const token = makeToken({ id: buyer.id, email, role: 'buyer' });
        res.json({ token, user: safe });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
