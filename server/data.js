import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_FILE = join(__dirname, 'db.json');

// Load existing data or start fresh
function loadDB() {
    if (existsSync(DB_FILE)) {
        try {
            const raw = readFileSync(DB_FILE, 'utf-8');
            const parsed = JSON.parse(raw);
            return {
                farmers: new Map(parsed.farmers || []),
                buyers: new Map(parsed.buyers || []),
                products: new Map(parsed.products || []),
                orders: new Map(parsed.orders || []),
                notifications: new Map(parsed.notifications || []),
            };
        } catch {
            console.warn('⚠️  db.json corrupt, starting fresh');
        }
    }
    return {
        farmers: new Map(),
        buyers: new Map(),
        products: new Map(),
        orders: new Map(),
        notifications: new Map(),
    };
}

const db = loadDB();

// In-memory OTP store (no persistence needed – expires in 5 min)
export const otpStore = new Map(); // email → { otp, expiresAt }

function saveDB() {
    const serializable = {
        farmers: [...db.farmers.entries()],
        buyers: [...db.buyers.entries()],
        products: [...db.products.entries()],
        orders: [...db.orders.entries()],
        notifications: [...db.notifications.entries()],
    };
    try {
        writeFileSync(DB_FILE, JSON.stringify(serializable, null, 2));
    } catch (e) {
        console.error('Failed to save db.json:', e.message);
    }
}

export const farmers = db.farmers;
export const buyers = db.buyers;
export const products = db.products;
export const orders = db.orders;
export const notifications = db.notifications;
export { saveDB };
