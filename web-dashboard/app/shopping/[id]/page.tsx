"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    Plus, ArrowLeft, MoreVertical, Archive, Trash2,
    CheckSquare, Square, ChefHat, Package, Sparkles
} from 'lucide-react';
import { useAuth } from "@clerk/nextjs";
import { shoppingService } from '../../../lib/services/shopping';
import { ShoppingList, ShoppingItem, ShoppingItemInput, PantryCategory } from '../../../lib/types';
import { VALID_CATEGORIES } from '../../../lib/categories';
import Link from 'next/link';
import AnalyzeListModal from './AnalyzeListModal';

export default function ShoppingListDetailPage() {
    const { isSignedIn: isAuthenticated, isLoaded: authLoaded, getToken } = useAuth();
    const router = useRouter();
    const params = useParams();
    const listId = params.id as string;

    const [list, setList] = useState<ShoppingList | null>(null);
    const [items, setItems] = useState<ShoppingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Analyze Modal
    const [isAnalyzeModalOpen, setIsAnalyzeModalOpen] = useState(false);

    // Add Item Modal
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newItem, setNewItem] = useState<ShoppingItemInput>({
        name: '',
        quantity: 1,
        unit: 'pcs',
        category: 'produce'
    });

    useEffect(() => {
        if (isAuthenticated && listId) {
            fetchListDetails();
        }
    }, [isAuthenticated, listId, router]);

    const fetchListDetails = async () => {
        try {
            setLoading(true);
            const token = await getToken();
            if (!token) return;
            const listData = await shoppingService.getOne(listId, token, true) as any;
            // Depending on backend return, listData might be ShoppingListWithItems
            // Or if I didn't cast, TS complains. Casting to any or implicit assumption.
            // Backend returns ShoppingListWithItems which has "items" field.
            setList(listData);
            setItems(listData.items || []);
            setError(null);
        } catch (err: any) {
            console.error('Failed to fetch list:', err);
            // Handle 404
            if (err.response && err.response.status === 404) {
                setError('List not found');
            } else {
                setError('Failed to load shopping list');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleToggleCheck = async (itemId: string) => {
        // Optimistic update
        const originalItems = [...items];
        setItems(items.map(item =>
            item.id === itemId ? { ...item, isChecked: !item.isChecked } : item
        ));

        try {
            const token = await getToken();
            if (token) await shoppingService.toggleCheck(listId, itemId, token);
        } catch (err) {
            console.error('Failed to toggle item:', err);
            setItems(originalItems); // Revert
            // Optional: show toast
        }
    };

    const handleDeleteItem = async (itemId: string) => {
        if (!window.confirm('Remove this item?')) return;
        try {
            const token = await getToken();
            if (token) await shoppingService.deleteItem(listId, itemId, token);
            setItems(items.filter(i => i.id !== itemId));
        } catch (err) {
            console.error('Failed to delete item:', err);
            setError('Failed to delete item');
        }
    };

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = await getToken();
            if (!token) return;
            const addedItem = await shoppingService.addItem(listId, newItem, token);
            setItems([...items, addedItem]);
            setIsAddModalOpen(false);
            setNewItem({ name: '', quantity: 1, unit: 'pcs', category: 'produce' });
        } catch (err) {
            console.error('Failed to add item:', err);
            setError('Failed to add item');
        }
    };

    const handleCompleteShopping = async () => {
        if (!window.confirm('Mark checked items as bought and move to pantry? This will remove them from the list.')) return;
        try {
            const token = await getToken();
            if (token) await shoppingService.completeList(listId, token);
            // Re-fetch list to show cleared state
            await fetchListDetails();
            alert('Items moved to pantry!');
        } catch (err) {
            console.error('Failed to complete shopping:', err);
            setError('Failed to complete shopping');
        }
    };

    // Use canonical categories from single source of truth
    const categories = [...VALID_CATEGORIES] as PantryCategory[];

    // Group items by category (unchecked first, then checked at bottom?)
    // Or just group by category and sort checked within?
    // Let's allow users to see checked items crossed out.
    // Grouping logic:
    const groupedItems = React.useMemo(() => {
        const groups: Record<string, ShoppingItem[]> = {};
        categories.forEach(cat => groups[cat] = []);
        groups['other'] = []; // Ensure other exists

        items.forEach(item => {
            const cat = item.category || 'other';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(item);
        });

        return groups;
    }, [items]);

    const activeCategories = categories.filter(cat => groupedItems[cat] && groupedItems[cat].length > 0);

    if (!authLoaded || (!isAuthenticated && loading)) {
        return <div className="flex justify-center items-center h-screen">Loading...</div>;
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8 text-center">
                <h2 className="text-xl text-red-600 mb-4">{error}</h2>
                <Link href="/shopping" className="text-emerald-600 hover:underline">
                    Back to Lists
                </Link>
            </div>
        );
    }

    if (!list) return null;

    return (
        <div className="container mx-auto px-4 py-8 max-w-3xl">
            {/* Header */}
            <div className="mb-8">
                <Link href="/shopping" className="inline-flex items-center text-gray-500 hover:text-emerald-600 mb-4 transition-colors">
                    <ArrowLeft size={16} className="mr-1" /> Back to Lists
                </Link>

            </div>

            <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                    <span className="text-4xl">{list.icon || '🛒'}</span>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{list.name}</h1>
                        {list.description && <p className="text-gray-500 mt-1">{list.description}</p>}
                    </div>
                </div>

                <div className="flex gap-2">

                    <button
                        onClick={() => setIsAnalyzeModalOpen(true)}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors py-2"
                        title="Get suggestions"
                    >
                        <MoreVertical size={20} />
                    </button>
                    <button
                        onClick={handleCompleteShopping}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors"
                        title="Move checked items to Put in Pantry"
                    >
                        <CheckSquare size={20} />
                        Complete
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-stone-200 hover:bg-stone-300 text-stone-700 px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors"
                    >
                        <Plus size={20} />
                        Add Item
                    </button>
                </div>
            </div>

            {/* Empty State */}
            {
                items.length === 0 && (
                    <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        <Package size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500">This list is empty.</p>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="text-emerald-600 font-medium hover:underline mt-2"
                        >
                            Add your first item
                        </button>
                    </div>
                )
            }

            {/* List Items */}
            <div className="space-y-8">
                {activeCategories.map(category => (
                    <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex items-center gap-2">
                            <span className="bg-white p-1 rounded-md shadow-sm text-xs font-bold uppercase tracking-wider text-gray-500 border border-gray-100">
                                {category}
                            </span>
                        </div>
                        <div>
                            {groupedItems[category].map(item => (
                                <div
                                    key={item.id}
                                    className={`group flex items-center justify-between p-4 border-b border-gray-50 last:border-0 transition-colors hover:bg-gray-50/50 ${item.isChecked ? 'bg-gray-50' : ''}`}
                                >
                                    <button
                                        onClick={() => handleToggleCheck(item.id)}
                                        className="flex items-center gap-4 flex-1 text-left"
                                    >
                                        <div className={`transition-colors ${item.isChecked ? 'text-emerald-500' : 'text-gray-300 group-hover:text-emerald-400'}`}>
                                            {item.isChecked ? <CheckSquare size={24} /> : <Square size={24} />}
                                        </div>
                                        <div>
                                            <span className={`text-lg block ${item.isChecked ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                                {item.name}
                                            </span>
                                            {item.recipeName && (
                                                <span className="flex items-center gap-1 text-xs text-orange-500 mt-0.5">
                                                    <ChefHat size={12} /> From {item.recipeName}
                                                </span>
                                            )}
                                        </div>
                                    </button>

                                    <div className="flex items-center gap-4">
                                        <span className={`text-sm font-medium px-2 py-1 rounded-md ${item.isChecked ? 'bg-gray-100 text-gray-400' : 'bg-emerald-50 text-emerald-700'}`}>
                                            {item.quantity != null ? `${item.quantity} ${item.unit || ''}` : 'as needed'}
                                        </span>

                                        <button
                                            onClick={() => handleDeleteItem(item.id)}
                                            className="text-gray-300 hover:text-red-500 p-1 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                            title="Remove Item"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Item Modal */}
            {
                isAddModalOpen && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
                            <h2 className="text-xl font-bold mb-4 text-gray-800">Add Item to List</h2>
                            <form onSubmit={handleAddItem} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                        value={newItem.name}
                                        onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                        placeholder="e.g., Avocados"
                                        autoFocus
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                            value={newItem.quantity}
                                            onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                            value={newItem.unit}
                                            onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                                            placeholder="pcs"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                    <select
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                                        value={newItem.category}
                                        onChange={(e) => setNewItem({ ...newItem, category: e.target.value as PantryCategory })}
                                    >
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex justify-end gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddModalOpen(false)}
                                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                                    >
                                        Add Item
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Analyze List Modal */}
            {
                isAnalyzeModalOpen && (
                    <AnalyzeListModal
                        listId={listId}
                        onClose={() => setIsAnalyzeModalOpen(false)}
                        onApplyChanges={() => {
                            setIsAnalyzeModalOpen(false);
                            fetchListDetails();
                        }}
                    />
                )
            }
        </div >
    );
}
