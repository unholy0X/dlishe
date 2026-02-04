import React, { useState } from 'react';
import { Sparkles, X, Check, ArrowRight, AlertTriangle } from 'lucide-react';
import { ListAnalysisResult } from '../../../lib/types';
import { shoppingService } from '../../../lib/services/shopping';
import { useAuth } from "@clerk/nextjs";

interface AnalyzeListModalProps {
    listId: string;
    onClose: () => void;
    onApplyChanges: () => void; // Reload list
}

export default function AnalyzeListModal({ listId, onClose, onApplyChanges }: AnalyzeListModalProps) {
    const { getToken } = useAuth();
    const [loading, setLoading] = useState(true);
    const [analysis, setAnalysis] = useState<ListAnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    React.useEffect(() => {
        analyzeList();
    }, []);

    const analyzeList = async () => {
        try {
            setLoading(true);
            const token = await getToken();
            if (!token) return;
            const result = await shoppingService.analyze(listId, token);
            setAnalysis(result);
        } catch (err: any) {
            console.error('Analysis failed:', err);
            setError('Failed to analyze list. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-8 text-center">
                    <div className="inline-block p-4 rounded-full bg-indigo-50 text-indigo-600 mb-4 animate-pulse">
                        <Sparkles size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Analyzing List...</h2>
                    <p className="text-gray-500">The Chef's Brain is checking for duplicates and missing essentials.</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                    <div className="text-center">
                        <div className="inline-block p-3 rounded-full bg-red-50 text-red-600 mb-4">
                            <AlertTriangle size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Analysis Failed</h2>
                        <p className="text-gray-500 mb-6">{error}</p>
                        <button
                            onClick={onClose}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!analysis) return null;

    const hasSuggestions = analysis.suggestions.length > 0 || analysis.missingEssentials.length > 0 || analysis.categoryOptimizations.length > 0;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                        <Sparkles className="text-indigo-600" size={24} />
                        <h2 className="text-xl font-bold text-gray-800">Chef's Brain Analysis</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                {!hasSuggestions ? (
                    <div className="text-center py-8">
                        <div className="inline-block p-3 rounded-full bg-green-50 text-green-600 mb-4">
                            <Check size={32} />
                        </div>
                        <p className="text-gray-600 mb-4">Your list looks perfect! No suggestions found.</p>
                        <button
                            onClick={onClose}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                        >
                            Great!
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Duplicate/Merge Suggestions */}
                        {analysis.suggestions.length > 0 && (
                            <div>
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Suggestions</h3>
                                <div className="space-y-3">
                                    {analysis.suggestions.map((suggestion, idx) => (
                                        <div key={idx} className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                                            <div className="flex gap-3">
                                                <AlertTriangle size={20} className="text-indigo-600 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-indigo-900 font-medium mb-1">{suggestion.message}</p>
                                                    {suggestion.itemNames && (
                                                        <p className="text-xs text-indigo-700 bg-indigo-100 inline-block px-2 py-1 rounded mb-2">
                                                            {suggestion.itemNames.join(' + ')}
                                                        </p>
                                                    )}
                                                    {/* In a real app, we would have buttons to Apply the merge automatically */}
                                                    <p className="text-xs text-indigo-500 italic">Please review manually for now.</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Missing Essentials */}
                        {analysis.missingEssentials.length > 0 && (
                            <div>
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Missing Essentials?</h3>
                                <div className="flex flex-wrap gap-2">
                                    {analysis.missingEssentials.map((item, idx) => (
                                        <div key={idx} className="bg-orange-50 border border-orange-100 text-orange-800 px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2">
                                            <span>{item}</span>
                                            {/* Button to quick add - pending implementation */}
                                            {/* <button className="text-orange-400 hover:text-orange-600"><Plus size={14} /></button> */}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Category Optimizations */}
                        {analysis.categoryOptimizations.length > 0 && (
                            <div>
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Category Fixes</h3>
                                <div className="space-y-2">
                                    {analysis.categoryOptimizations.map((opt, idx) => (
                                        <div key={idx} className="bg-gray-50 p-3 rounded-lg text-sm flex items-center justify-between">
                                            <div>
                                                <span className="font-medium text-gray-900">{opt.itemName}</span>
                                                <div className="flex items-center gap-2 text-gray-500 text-xs mt-0.5">
                                                    <span className="line-through">{opt.currentCategory}</span>
                                                    <ArrowRight size={10} />
                                                    <span className="text-emerald-600 font-bold">{opt.newCategory}</span>
                                                </div>
                                                <span className="text-xs text-gray-400 block mt-1">{opt.reason}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="pt-4 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={onClose}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
