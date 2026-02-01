"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Edit2, Trash2, AlertTriangle, Calendar, Package } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { pantryService } from '../../lib/services/pantry';
import { PantryItem, PantryItemInput, PantryCategory } from '../../lib/types';
import { NavHeader } from '@/lib/components/NavHeader';

export default function PantryPage() {
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [items, setItems] = useState<PantryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<PantryItem | null>(null);

    // Form state
    const [formData, setFormData] = useState<PantryItemInput>({
        name: '',
        category: 'other',
        quantity: 1,
        unit: 'pcs',
        expirationDate: ''
    });

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
            return;
        }

        if (isAuthenticated) {
            fetchItems();
        }
    }, [isAuthenticated, authLoading, router]);

    const fetchItems = async () => {
        try {
            setLoading(true);
            const data = await pantryService.getAll();
            setItems(data.items || []);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch pantry items:', err);
            setError('Failed to load pantry items');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Format date to ISO if present
            const payload = { ...formData };
            if (payload.expirationDate) {
                payload.expirationDate = new Date(payload.expirationDate).toISOString();
            } else {
                delete payload.expirationDate;
            }

            if (editingItem) {
                await pantryService.update(editingItem.id, payload);
            } else {
                await pantryService.create(payload);
            }
            setIsModalOpen(false);
            setEditingItem(null);
            resetForm();
            fetchItems();
        } catch (err) {
            console.error('Failed to save item:', err);
            setError('Failed to save item');
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this item?')) return;
        try {
            await pantryService.delete(id);
            fetchItems();
        } catch (err) {
            console.error('Failed to delete item:', err);
            setError('Failed to delete item');
        }
    };

    const openEditModal = (item: PantryItem) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            category: item.category,
            quantity: item.quantity,
            unit: item.unit,
            expirationDate: item.expirationDate ? new Date(item.expirationDate).toISOString().split('T')[0] : ''
        });
        setIsModalOpen(true);
    };

    const openAddModal = () => {
        setEditingItem(null);
        resetForm();
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            category: 'other',
            quantity: 1,
            unit: 'pcs',
            expirationDate: ''
        });
    };

    const getDaysUntilExpiration = (dateStr?: string) => {
        if (!dateStr) return null;
        const today = new Date();
        const expDate = new Date(dateStr);
        const diffTime = expDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const categories: PantryCategory[] = [
        'produce', 'proteins', 'dairy', 'grains', 'pantry',
        'spices', 'condiments', 'beverages', 'frozen', 'canned', 'baking', 'other'
    ];

    if (authLoading || (!isAuthenticated && loading)) {
        return <div className="flex justify-center items-center h-screen">Loading...</div>;
    }

    return (
        <>
            <NavHeader />
            <div className="container mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">My Pantry</h1>
                    <button
                        onClick={openAddModal}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <Plus size={20} />
                        Add Item
                    </button>
                </div>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                        {error}
                    </div>
                )}

                {/* Empty State */}
                {!loading && items.length === 0 && (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                        <Package size={48} className="mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">Your pantry is empty</h3>
                        <p className="text-gray-500 mt-2 mb-6">Start tracking your ingredients to reduce waste.</p>
                        <button
                            onClick={openAddModal}
                            className="text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                            Add your first item
                        </button>
                    </div>
                )}

                {/* Grid View */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items.map((item) => {
                        const daysUntilExp = getDaysUntilExpiration(item.expirationDate);
                        const isExpiringSoon = daysUntilExp !== null && daysUntilExp <= 7;
                        const isExpired = daysUntilExp !== null && daysUntilExp < 0;

                        return (
                            <div key={item.id} className={`bg-white rounded-xl shadow-sm border p-4 transition-shadow hover:shadow-md ${isExpired ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-semibold text-lg text-gray-900">{item.name}</h3>
                                        <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full capitalize">
                                            {item.category}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openEditModal(item)}
                                            className="text-gray-400 hover:text-emerald-600 p-1"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="text-gray-400 hover:text-red-600 p-1"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 text-sm text-gray-600 mt-4">
                                    <div className="flex items-center gap-1">
                                        <Package size={14} />
                                        <span>{item.quantity} {item.unit}</span>
                                    </div>
                                    {item.expirationDate && (
                                        <div className={`flex items-center gap-1 ${isExpiringSoon ? 'text-orange-600 font-medium' : ''} ${isExpired ? 'text-red-600 font-bold' : ''}`}>
                                            <Calendar size={14} />
                                            <span>
                                                {isExpired ? `Expired ${Math.abs(daysUntilExp!)} days ago` :
                                                    daysUntilExp === 0 ? 'Expires today' :
                                                        `Expires in ${daysUntilExp} days`}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                            <h2 className="text-2xl font-bold mb-6 text-gray-800">
                                {editingItem ? 'Edit Item' : 'Add New Item'}
                            </h2>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g., Milk, Eggs"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                            value={formData.quantity}
                                            onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                            value={formData.unit}
                                            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                            placeholder="Target lbs, pcs..."
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                    <select
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value as PantryCategory })}
                                    >
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Expiration Date</label>
                                    <input
                                        type="date"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                        value={formData.expirationDate}
                                        onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                                    />
                                </div>

                                <div className="flex justify-end gap-3 mt-8">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                                    >
                                        {editingItem ? 'Save Changes' : 'Add Item'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
