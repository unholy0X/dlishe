"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Archive, Trash2, Edit2, ShoppingCart, ChevronRight } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { shoppingService } from '../../lib/services/shopping';
import { ShoppingList, ShoppingListInput } from '../../lib/types';
import Link from 'next/link';
import { NavHeader } from '@/lib/components/NavHeader';

export default function ShoppingListsPage() {
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [lists, setLists] = useState<ShoppingList[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showArchived, setShowArchived] = useState(false);

    // Modal & Form
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingList, setEditingList] = useState<ShoppingList | null>(null);
    const [formData, setFormData] = useState<ShoppingListInput>({
        name: '',
        description: '',
        icon: '',
        isTemplate: false
    });

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
            return;
        }

        if (isAuthenticated) {
            fetchLists();
        }
    }, [isAuthenticated, authLoading, router, showArchived]);

    const fetchLists = async () => {
        try {
            setLoading(true);
            const data = await shoppingService.getAll(showArchived);
            setLists(data.lists || []);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch shopping lists:', err);
            setError('Failed to load shopping lists');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = { ...formData };
            // Ensure empty strings are treated as optional per backend preference if needed
            // But types allow string.

            if (editingList) {
                await shoppingService.update(editingList.id, payload);
            } else {
                await shoppingService.create(payload);
            }
            setIsModalOpen(false);
            setEditingList(null);
            resetForm();
            fetchLists();
        } catch (err) {
            console.error('Failed to save list:', err);
            setError('Failed to save list');
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this list?')) return;
        try {
            await shoppingService.delete(id);
            fetchLists();
        } catch (err) {
            console.error('Failed to delete list:', err);
            setError('Failed to delete list');
        }
    };

    const handleArchive = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to archive this list?')) return;
        try {
            await shoppingService.archive(id);
            fetchLists();
        } catch (err) {
            console.error('Failed to archive list:', err);
            setError('Failed to archive list');
        }
    };

    const openEditModal = (list: ShoppingList, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setEditingList(list);
        setFormData({
            name: list.name,
            description: list.description || '',
            icon: list.icon || '',
            isTemplate: list.isTemplate
        });
        setIsModalOpen(true);
    };

    const openAddModal = () => {
        setEditingList(null);
        resetForm();
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            icon: '',
            isTemplate: false
        });
    };

    if (authLoading || (!isAuthenticated && loading)) {
        return <div className="flex justify-center items-center h-screen">Loading...</div>;
    }

    return (
        <>
            <NavHeader />
            <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Shopping Lists</h1>
                        <p className="text-gray-500 mt-1">Manage your grocery shopping efficiently</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
                            <input
                                type="checkbox"
                                checked={showArchived}
                                onChange={(e) => setShowArchived(e.target.checked)}
                                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            Show Archived
                        </label>

                        <button
                            onClick={openAddModal}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                        >
                            <Plus size={20} />
                            New List
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                        {error}
                    </div>
                )}

                {/* Empty State */}
                {!loading && lists.length === 0 && (
                    <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 get-shadow-sm border border-gray-100">
                            <ShoppingCart size={32} className="text-emerald-500" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">
                            {showArchived ? 'No archived lists found' : 'You have no shopping lists'}
                        </h3>
                        <p className="text-gray-500 mt-2 mb-6 max-w-sm mx-auto">
                            {showArchived ? 'Archived lists will appear here.' : 'Create a new list to start organizing your groceries and ingredients.'}
                        </p>
                        {!showArchived && (
                            <button
                                onClick={openAddModal}
                                className="text-emerald-600 hover:text-emerald-700 font-medium"
                            >
                                Create your first list
                            </button>
                        )}
                    </div>
                )}

                {/* Grid View */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {lists.map((list) => (
                        <Link
                            key={list.id}
                            href={`/shopping/${list.id}`}
                            className={`group block bg-white rounded-xl shadow-sm border p-5 transition-all hover:shadow-md hover:border-emerald-200 ${list.isArchived ? 'opacity-75 bg-gray-50' : ''}`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl bg-gray-50 w-10 h-10 flex items-center justify-center rounded-lg border border-gray-100">
                                        {list.icon || '🛒'}
                                    </span>
                                    <div>
                                        <h3 className="font-semibold text-lg text-gray-900 group-hover:text-emerald-700 transition-colors">
                                            {list.name}
                                        </h3>
                                        {list.isTemplate && (
                                            <span className="inline-block bg-blue-50 text-blue-600 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full mt-1">
                                                Template
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => openEditModal(list, e)}
                                        className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                                        title="Edit List"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    {!list.isArchived && (
                                        <button
                                            onClick={(e) => handleArchive(list.id, e)}
                                            className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors"
                                            title="Archive List"
                                        >
                                            <Archive size={16} />
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => handleDelete(list.id, e)}
                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                        title="Delete List"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            {list.description && (
                                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                                    {list.description}
                                </p>
                            )}

                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400">
                                <span>Last updated: {new Date(list.updatedAt).toLocaleDateString()}</span>
                                <span className="flex items-center gap-1 text-emerald-600 font-medium group-hover:translate-x-1 transition-transform">
                                    View items <ChevronRight size={14} />
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                            <h2 className="text-2xl font-bold mb-6 text-gray-800">
                                {editingList ? 'Edit List' : 'Create New List'}
                            </h2>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">List Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g., Weekly Groceries"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                                    <textarea
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none h-20"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Add details about this list..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Icon (Emoji)</label>
                                        <input
                                            type="text"
                                            maxLength={2}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-center text-xl"
                                            value={formData.icon}
                                            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                            placeholder="🛒"
                                        />
                                    </div>
                                    <div className="flex items-center">
                                        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 h-5 w-5"
                                                checked={formData.isTemplate}
                                                onChange={(e) => setFormData({ ...formData, isTemplate: e.target.checked })}
                                            />
                                            Save as Template
                                        </label>
                                    </div>
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
                                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium shadow-sm"
                                    >
                                        {editingList ? 'Save Changes' : 'Create List'}
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
