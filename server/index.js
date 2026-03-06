import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '.env') });
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.js';
import otpRoutes from './routes/otp.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// 404 handler
app.use((req, res) => res.status(404).json({ error: `Route ${req.method} ${req.path} not found` }));

// Error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`\n🌾 DirectFromFarm API running on http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});
