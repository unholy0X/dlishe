import React, { useState, useEffect } from 'react';
import { Sparkles, X, AlertTriangle, Check, ArrowRight } from 'lucide-react';
import { shoppingService } from '../../../lib/services/shopping';
import { AnalyzeAddResponse, ShoppingItem } from '../../../lib/types';

interface SupervisedAddModalProps {
    listId: string;
    recipeId: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function SupervisedAddModal({ listId, recipeId, onClose, onSuccess }: SupervisedAddModalProps) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<AnalyzeAddResponse | null>(null);
    const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        analyze();
    }, []);

    const analyze = async () => {
        try {
            setLoading(true);
            const result = await shoppingService.analyzeAddFromRecipe(listId, recipeId);
            setData(result);

            // Default select all, UNLESS simple duplicates?
            // For now, select all. Ideally we'd uncheck exact matches.
            // But let's let the user decide based on AI suggestions.
            const allNames = new Set(result.proposedItems.map(i => i.name));
            setSelectedIngredients(allNames);

        } catch (err) {
            console.error('Analysis failed:', err);
            setError('Failed to analyze additions.');
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = (name: string) => {
        const newSet = new Set(selectedIngredients);
        if (newSet.has(name)) {
            newSet.delete(name);
        } else {
            newSet.add(name);
        }
        setSelectedIngredients(newSet);
    };

    const handleConfirm = async () => {
        try {
            setLoading(true);
            const res: any = await shoppingService.addFromRecipe(listId, recipeId, Array.from(selectedIngredients));

            if (res.warnings && res.warnings.length > 0) {
                alert(`Some items could not be added:\n${res.warnings.join('\n')}`);
            }

            onSuccess();
        } catch (err) {
            console.error('Failed to add items:', err);
            setError('Failed to add items.');
            setLoading(false);
        }
    };

    if (loading && !data) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-8 text-center">
                    <div className="inline-block p-4 rounded-full bg-indigo-50 text-indigo-600 mb-4 animate-pulse">
                        <Sparkles size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Analyzing Ingredients...</h2>
                    <p className="text-gray-500">Checking for duplicates and suggestions.</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                    <div className="text-center">
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h2>
                        <p className="text-gray-500 mb-6">{error || 'Unknown error'}</p>
                        <button onClick={onClose} className="bg-gray-100 px-4 py-2 rounded-lg">Close</button>
                    </div>
                </div>
            </div>
        );
    }

    // Check if AI found duplicates
    const duplicates = data.analysis.suggestions.filter(s => s.type === 'duplicate' || s.type === 'merge');

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto flex flex-col">
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <div className="flex items-center gap-2">
                        <Sparkles className="text-indigo-600" size={24} />
                        <h2 className="text-xl font-bold text-gray-800">Review & Add Ingredients</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 space-y-6">
                    {duplicates.length > 0 && (
                        <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
                            <h3 className="text-amber-800 font-bold flex items-center gap-2 mb-2">
                                <AlertTriangle size={18} />
                                Potential Duplicates found!
                            </h3>
                            <div className="space-y-2">
                                {duplicates.map((s, idx) => (
                                    <p key={idx} className="text-amber-700 text-sm">{s.message}</p>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-medium text-gray-700">Select Ingredients to Add ({selectedIngredients.size})</h3>
                            <button
                                onClick={() => {
                                    if (selectedIngredients.size === data.proposedItems.length) {
                                        setSelectedIngredients(new Set());
                                    } else {
                                        setSelectedIngredients(new Set(data.proposedItems.map(i => i.name)));
                                    }
                                }}
                                className="text-sm text-emerald-600 hover:underline"
                            >
                                {selectedIngredients.size === data.proposedItems.length ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>

                        <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
                            {data.proposedItems.map(item => {
                                const isDuplicate = duplicates.some(d => d.itemNames?.includes(item.name));
                                return (
                                    <div
                                        key={item.id}
                                        className={`p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors cursor-pointer ${isDuplicate ? 'bg-amber-50/50' : ''}`}
                                        onClick={() => handleToggle(item.name)}
                                    >
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedIngredients.has(item.name) ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 bg-white'}`}>
                                            {selectedIngredients.has(item.name) && <Check size={14} />}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-gray-900 font-medium">{item.name}</p>
                                            <p className="text-xs text-gray-500">{item.quantity} {item.unit}</p>
                                        </div>
                                        {isDuplicate && (
                                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Duplicate?</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3 shrink-0 pt-4 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={loading || selectedIngredients.size === 0}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? 'Adding...' : `Add ${selectedIngredients.size} Items`}
                    </button>
                </div>
            </div>
        </div>
    );
}
