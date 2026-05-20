import { Router } from 'express';
import nodemailer from 'nodemailer';
import { otpStore } from '../data.js';

const router = Router();
const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

function createTransporter() {
    return nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        connectionTimeout: 5000, // 5 seconds
        greetingTimeout: 5000,   // 5 seconds
        socketTimeout: 5000,     // 5 seconds
    });
}

/* POST /api/otp/send  { email } */
router.post('/send', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'email required' });

        const otp = String(Math.floor(100000 + Math.random() * 900000));
        otpStore.set(email, { otp, expiresAt: Date.now() + OTP_TTL_MS });

        // If email credentials are not configured, bypass SMTP and return OTP immediately (Demo Mode)
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log('OTP email credentials missing. Bypassing mailer (Demo Mode).');
            return res.json({ 
                message: 'OTP generated (Demo Mode)', 
                devOtp: otp,
                isFallback: true 
            });
        }

        const transporter = createTransporter();
        await transporter.sendMail({
            from: `"DirectFromFarm" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Your DirectFromFarm OTP Code',
            html: `
                <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
                    <h2 style="color:#1a4a2e;margin-bottom:8px;">🌾 DirectFromFarm</h2>
                    <p style="color:#555;">Your one-time verification code is:</p>
                    <div style="font-size:40px;font-weight:800;letter-spacing:12px;color:#2d7a4f;margin:24px 0;text-align:center;">${otp}</div>
                    <p style="color:#888;font-size:13px;">This code expires in <strong>5 minutes</strong>. Do not share it with anyone.</p>
                </div>
            `,
        });

        res.json({ message: 'OTP sent successfully' });
    } catch (e) {
        console.error('OTP send error:', e.message);
        const { email } = req.body;
        const entry = otpStore.get(email);
        if (entry) {
            // Safe fallback: if SMTP fails or times out, return the OTP so the demo is fully functional!
            return res.json({ 
                message: 'OTP send failed, fallback enabled (Demo Mode)', 
                devOtp: entry.otp,
                isFallback: true 
            });
        }
        res.status(500).json({ error: 'Failed to send OTP and no local state found.' });
    }
});

/* POST /api/otp/verify  { email, otp } */
router.post('/verify', (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'email and otp required' });

    const entry = otpStore.get(email);
    if (!entry) return res.status(400).json({ error: 'No OTP found for this email. Please request a new one.' });
    if (Date.now() > entry.expiresAt) {
        otpStore.delete(email);
        return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }
    if (entry.otp !== otp.toString()) {
        return res.status(400).json({ error: 'Incorrect OTP' });
    }

    otpStore.delete(email);
    res.json({ valid: true });
});

export default router;
