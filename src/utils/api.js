/**
 * API utility for DirectFromFarm
 * Wraps fetch calls with JWT auth headers and base URL.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const TOKEN_KEY = 'dff_token';

export const api = {
    setToken(token) {
        localStorage.setItem(TOKEN_KEY, token);
    },
    clearToken() {
        localStorage.removeItem(TOKEN_KEY);
    },
    getToken() {
        return localStorage.getItem(TOKEN_KEY);
    },

    async request(method, path, body) {
        const token = localStorage.getItem(TOKEN_KEY);
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${BASE_URL}${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(data.error || `HTTP ${res.status}`);
        }
        return data;
    },

    get(path) { return this.request('GET', path); },
    post(path, body) { return this.request('POST', path, body); },
    put(path, body) { return this.request('PUT', path, body); },
    delete(path) { return this.request('DELETE', path); },
};
