"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const res = await api.post('/auth/login', { email, password });
            const { user, accessToken } = res.data;
            login(accessToken, user);
            router.push('/');
        } catch (err: any) {
            setError(err.response?.data?.error?.message || 'Login failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
            <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-warm border border-stone-200">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-display font-medium text-text-primary mb-2">Welcome Back</h1>
                    <p className="text-text-muted">Sign in to access DishFlow Dashboard</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-honey-300 focus:border-honey-300 outline-none transition"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-honey-300 focus:border-honey-300 outline-none transition"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-honey-400 hover:bg-honey-500 text-white font-medium py-2.5 rounded-lg transition-colors shadow-honey"
                    >
                        Sign In
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-text-muted">
                    Don't have an account?{' '}
                    <Link href="/register" className="text-honey-400 hover:text-honey-500 font-medium">
                        Register for free
                    </Link>
                </div>
            </div>
        </div>
    );
}
