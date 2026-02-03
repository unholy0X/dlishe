'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Scale } from 'lucide-react';

interface User {
    id: string;
    name?: string;
    email?: string;
    preferredUnitSystem: string;
}

export default function SettingsPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [selectedUnit, setSelectedUnit] = useState<string>('metric');

    useEffect(() => {
        fetchUser();
    }, []);

    const fetchUser = async () => {
        try {
            const { data } = await api.get('/users/me');
            setUser(data.user);
            // Ensure we set a default if backend returns empty (though it should be defaulted in DB)
            setSelectedUnit(data.user.preferredUnitSystem || 'metric');
        } catch (error) {
            console.error('Failed to fetch user:', error);
            setMessage({ type: 'error', text: 'Failed to load user settings' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const { data } = await api.patch('/users/me/preferences', {
                preferredUnitSystem: selectedUnit,
            });
            setUser(data);
            setMessage({ type: 'success', text: 'Preferences saved successfully' });
        } catch (error) {
            console.error('Failed to save preferences:', error);
            setMessage({ type: 'error', text: 'Failed to save preferences' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-stone-50 flex items-center justify-center">
                <div className="animate-pulse text-stone-400">Loading settings...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-stone-50 text-stone-800 font-sans p-6 md:p-12">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="flex items-center mb-8">
                    <Link href="/" className="mr-4 p-2 rounded-full hover:bg-stone-200 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-stone-600" />
                    </Link>
                    <h1 className="text-3xl font-serif font-semibold text-stone-900">Settings</h1>
                </div>

                {/* Message Toast */}
                {message && (
                    <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                        }`}>
                        {message.text}
                    </div>
                )}

                {/* Unit System Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-8">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="p-3 bg-stone-100 rounded-full">
                            <Scale className="w-6 h-6 text-stone-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-medium text-stone-900">Unit System</h2>
                            <p className="text-stone-500 mt-1">
                                Choose your preferred unit system for recipes and shopping lists.
                                This will automatically convert ingredients to your standard.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                        <button
                            onClick={() => setSelectedUnit('metric')}
                            className={`relative p-4 rounded-xl border-2 transition-all text-left ${selectedUnit === 'metric'
                                    ? 'border-stone-800 bg-stone-50'
                                    : 'border-stone-200 hover:border-stone-300 bg-white'
                                }`}
                        >
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-semibold text-lg">Metric</span>
                                {selectedUnit === 'metric' && (
                                    <div className="w-4 h-4 rounded-full bg-stone-800" />
                                )}
                            </div>
                            <p className="text-sm text-stone-500">
                                Grams, Liters, Celsius
                            </p>
                        </button>

                        <button
                            onClick={() => setSelectedUnit('imperial')}
                            className={`relative p-4 rounded-xl border-2 transition-all text-left ${selectedUnit === 'imperial'
                                    ? 'border-stone-800 bg-stone-50'
                                    : 'border-stone-200 hover:border-stone-300 bg-white'
                                }`}
                        >
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-semibold text-lg">Imperial</span>
                                {selectedUnit === 'imperial' && (
                                    <div className="w-4 h-4 rounded-full bg-stone-800" />
                                )}
                            </div>
                            <p className="text-sm text-stone-500">
                                Ounces, Pounds, Gallons, Fahrenheit
                            </p>
                        </button>
                    </div>
                </div>

                {/* Save Button */}
                <div className="mt-8 flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-8 py-3 bg-stone-900 text-white rounded-full font-medium hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Saving...</span>
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                <span>Save Changes</span>
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
}
