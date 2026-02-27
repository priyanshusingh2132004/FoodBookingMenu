"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useMemo, useEffect, Suspense } from 'react';
import { useCart } from '@/context/CartContext';
import { MenuItem, Order } from '@/types';
import { ArrowLeft, Search, X, Loader2, Send, Bell, CheckCircle, XCircle } from 'lucide-react';
import { db } from '@/lib/firebase';
import {
    collection, doc, setDoc, getDocs, serverTimestamp,
    query, where, onSnapshot, arrayUnion, arrayRemove, updateDoc
} from 'firebase/firestore';

function MenuContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const tableId = searchParams.get('table') || 'Takeaway';

    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [activeCategory, setActiveCategory] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [vegOnly, setVegOnly] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [instructions, setInstructions] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);

    // Session state
    const [activeOrder, setActiveOrder] = useState<Order | null>(null);
    const [isHost, setIsHost] = useState(false);
    const [sessionChecked, setSessionChecked] = useState(false);
    const [suggestedItems, setSuggestedItems] = useState<any[]>([]);
    const [justSuggested, setJustSuggested] = useState<string | null>(null);

    const { cartItems, addToCart, updateQuantity, clearCart, cartTotal, totalItems } = useCart();

    // ── 1. Determine if current device is the host ────────────────────────────
    useEffect(() => {
        const savedOrderId = localStorage.getItem(`table_order_${tableId}`);
        if (savedOrderId) {
            setIsHost(true);
            // Back-click protection: if an active order exists, redirect to tracker
            const checkSaved = async () => {
                const q = query(
                    collection(db, 'live_orders'),
                    where('tableId', '==', tableId),
                    where('status', 'in', ['live', 'preparing', 'ready'])
                );
                const snap = await getDocs(q);
                const matchingDoc = snap.docs.find(d => d.id === savedOrderId);
                if (snap.empty || !matchingDoc) {
                    // Order is done, clear it
                    localStorage.removeItem(`table_order_${tableId}`);
                    setIsHost(false);
                }
                setSessionChecked(true);
            };
            checkSaved();
        } else {
            setSessionChecked(true);
        }
    }, [tableId]);

    // ── 2. Listen to active order for this table (for guests) ─────────────────
    useEffect(() => {
        if (!sessionChecked) return;
        const q = query(
            collection(db, 'live_orders'),
            where('tableId', '==', tableId),
            where('status', 'in', ['live', 'preparing', 'ready'])
        );
        const unsub = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const d = snapshot.docs[0];
                const data = { id: d.id, ...d.data() } as any;
                setActiveOrder(data);
                setSuggestedItems(data.suggestions || []);
            } else {
                setActiveOrder(null);
                setSuggestedItems([]);
                localStorage.removeItem(`table_order_${tableId}`);
            }
        });
        return () => unsub();
    }, [tableId, sessionChecked]);

    // ── 3. Fetch menu ─────────────────────────────────────────────────────────
    useEffect(() => {
        const fetchMenu = async () => {
            try {
                const snapshot = await getDocs(collection(db, 'menu_items'));
                const items: MenuItem[] = [];
                const uniqueCategories = new Set<string>();
                snapshot.forEach(doc => {
                    const data = doc.data() as MenuItem;
                    items.push(data);
                    if (data.category) uniqueCategories.add(data.category);
                });
                setMenuItems(items);
                const categoryArray = Array.from(uniqueCategories);
                setCategories(categoryArray);
                if (categoryArray.length > 0) setActiveCategory(categoryArray[0]);
            } catch (error) {
                console.error("Error fetching menu:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchMenu();
    }, []);

    const filteredItems = useMemo(() => {
        return menuItems.filter((item) => {
            const matchesCategory = item.category === activeCategory;
            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesVeg = vegOnly ? item.isVeg : true;
            return matchesCategory && matchesSearch && matchesVeg;
        });
    }, [menuItems, activeCategory, searchQuery, vegOnly]);

    // ── Place Order ───────────────────────────────────────────────────────────
    const placeOrder = async (e?: React.MouseEvent) => {
        if (e) e.preventDefault();
        if (cartItems.length === 0) return;
        try {
            const orderPayload = {
                tableId,
                items: cartItems,
                total: cartTotal,
                status: 'live',
                instructions: instructions.trim(),
                timestamp: serverTimestamp(),
                suggestions: [],
            };
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Firebase request timed out (10s)')), 10000)
            );
            const newOrderRef = doc(collection(db, 'live_orders'));
            await Promise.race([setDoc(newOrderRef, orderPayload), timeoutPromise]);

            localStorage.setItem(`table_order_${tableId}`, newOrderRef.id);
            setIsHost(true);
            clearCart();
            setInstructions('');
            setIsCartOpen(false);
            router.push(`/menu/tracker?orderId=${newOrderRef.id}`);
        } catch (e) {
            console.error('Error placing order', e);
            alert('Failed to place order. Please check your Firebase connection.');
        }
    };

    // ── Guest: Suggest an item ────────────────────────────────────────────────
    const handleSuggest = async (item: MenuItem) => {
        if (!activeOrder) return;
        const suggestion = {
            id: item.id,
            name: item.name,
            price: item.price,
            image: item.image,
            isVeg: item.isVeg,
            suggestedAt: new Date().toISOString(),
        };
        try {
            await updateDoc(doc(db, 'live_orders', activeOrder.id), {
                suggestions: arrayUnion(suggestion)
            });
            setJustSuggested(item.id);
            setTimeout(() => setJustSuggested(null), 2000);
        } catch (e) {
            console.error('Error suggesting item', e);
        }
    };

    // ── Host: Accept suggestion → add to cart ─────────────────────────────────
    const handleAcceptSuggestion = async (suggestion: any) => {
        const menuItem = menuItems.find(m => m.id === suggestion.id);
        if (menuItem) addToCart(menuItem);
        await removeSuggestion(suggestion);
    };

    // ── Host: Dismiss suggestion ───────────────────────────────────────────────
    const handleDismissSuggestion = async (suggestion: any) => {
        await removeSuggestion(suggestion);
    };

    const removeSuggestion = async (suggestion: any) => {
        if (!activeOrder) return;
        await updateDoc(doc(db, 'live_orders', activeOrder.id), {
            suggestions: arrayRemove(suggestion)
        });
    };

    // ── GUARDS ────────────────────────────────────────────────────────────────
    if (!sessionChecked || isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 text-red-600 animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Loading...</p>
            </div>
        );
    }

    const isGuest = !isHost && activeOrder !== null;

    return (
        <div className="flex flex-col min-h-screen bg-gray-50 pb-24 text-gray-900 font-sans">

            {/* ── Guest Banner ─────────────────────────────────────────────── */}
            {isGuest && (
                <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white text-sm font-semibold py-2.5 px-4 flex items-center justify-between">
                    <span>👀 Viewing Table {tableId} — Tap "Suggest" to request items</span>
                    <button
                        onClick={() => router.push(`/menu/tracker?orderId=${activeOrder!.id}`)}
                        className="text-white/80 text-xs underline ml-2 whitespace-nowrap"
                    >
                        Track order →
                    </button>
                </div>
            )}

            {/* ── Host Suggestions Banner ──────────────────────────────────── */}
            {isHost && suggestedItems.length > 0 && (
                <div
                    className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center justify-between cursor-pointer"
                    onClick={() => setIsSuggestionsOpen(true)}
                >
                    <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-amber-600 animate-bounce" />
                        <span className="text-sm font-bold text-amber-800">
                            {suggestedItems.length} friend suggestion{suggestedItems.length > 1 ? 's' : ''}
                        </span>
                    </div>
                    <span className="text-xs text-amber-600 font-semibold">Review →</span>
                </div>
            )}

            {/* Header */}
            <div className="bg-white px-4 pt-4 pb-2 sticky top-0 z-10 shadow-sm border-b border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <button className="p-1 rounded-full hover:bg-gray-100">
                            <ArrowLeft className="w-5 h-5 text-gray-700" />
                        </button>
                        <div>
                            <h1 className="font-bold text-lg leading-tight">Restro Menu Book</h1>
                            <p className="text-xs text-gray-500">Punjabi • North Indian</p>
                        </div>
                    </div>
                    <div className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-red-100">
                        TABLE #{tableId}
                    </div>
                </div>

                <div className="flex items-center gap-3 mb-2">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                            <Search className="w-4 h-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search menu..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-100 placeholder-gray-400 text-sm rounded-lg pl-9 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-red-500/20 transition-all border border-transparent focus:bg-white"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setVegOnly(!vegOnly)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${vegOnly ? 'bg-green-500' : 'bg-gray-300'}`}
                        >
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${vegOnly ? 'translate-x-4.5' : 'translate-x-1'}`} />
                        </button>
                        <span className="text-[10px] font-bold text-green-700 leading-tight">Veg<br />Only</span>
                    </div>
                </div>

                <div className="flex overflow-x-auto hide-scrollbar gap-2 py-2 mt-1 -mx-4 px-4">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeCategory === cat ? 'bg-red-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Menu Items */}
            <div className="p-4">
                <h2 className="text-xl font-extrabold mb-1 flex items-baseline gap-2">
                    {activeCategory}
                    <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {menuItems.filter(i => i.category === activeCategory).length} items
                    </span>
                </h2>

                <div className="mt-4 flex flex-col gap-6">
                    {filteredItems.map((item) => {
                        const cartItem = cartItems.find((i) => i.id === item.id);
                        const qty = cartItem?.quantity || 0;
                        const wasSuggested = justSuggested === item.id;

                        return (
                            <div key={item.id} className="flex gap-4 border-b border-gray-100 pb-6 last:border-0 last:pb-0">
                                <div className="flex-1">
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                        <div className={`w-4 h-4 rounded-sm border flex items-center justify-center ${item.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                                            <div className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`}></div>
                                        </div>
                                        {item.badge === 'bestseller' && <span className="bg-yellow-100 text-yellow-800 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Bestseller</span>}
                                        {item.badge === 'chef-special' && <span className="bg-red-100 text-red-800 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Chef Special</span>}
                                    </div>
                                    <h3 className="font-bold text-[15px]">{item.name}</h3>
                                    <p className="font-semibold text-sm mt-0.5">₹{item.price}</p>
                                    <p className="text-gray-500 text-xs mt-1.5 leading-relaxed line-clamp-2 pr-2">{item.description}</p>
                                </div>

                                <div className="relative w-[110px] h-[110px] shrink-0">
                                    <img src={item.image} alt={item.name} className={`w-full h-full object-cover rounded-xl shadow-sm ${item.inStock === false ? 'grayscale opacity-50' : ''}`} />
                                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden w-[90%]">

                                        {/* GUEST: Suggest button */}
                                        {isGuest ? (
                                            <button
                                                onClick={() => handleSuggest(item)}
                                                disabled={wasSuggested}
                                                className={`w-full py-1.5 font-bold text-[11px] tracking-wide flex items-center justify-center gap-1 transition-colors ${wasSuggested ? 'bg-green-500 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                                            >
                                                {wasSuggested ? (
                                                    <><CheckCircle className="w-3 h-3" /> Sent!</>
                                                ) : (
                                                    <><Send className="w-3 h-3" /> Suggest</>
                                                )}
                                            </button>
                                        ) : item.inStock === false ? (
                                            <div className="w-full py-1.5 text-gray-400 font-bold text-[10px] tracking-wide bg-gray-50 text-center uppercase">
                                                Out of Stock
                                            </div>
                                        ) : qty === 0 ? (
                                            <button
                                                onClick={() => addToCart(item)}
                                                className="w-full py-1.5 text-red-600 font-bold text-sm tracking-wide bg-white hover:bg-gray-50"
                                            >
                                                ADD
                                            </button>
                                        ) : (
                                            <div className="flex items-center justify-between text-white bg-red-600">
                                                <button onClick={() => updateQuantity(item.id, qty - 1)} className="w-1/3 py-1.5 flex items-center justify-center hover:bg-red-700">
                                                    <span className="text-lg font-medium leading-none mb-0.5">-</span>
                                                </button>
                                                <span className="w-1/3 text-center font-bold text-sm">{qty}</span>
                                                <button onClick={() => addToCart(item)} className="w-1/3 py-1.5 flex items-center justify-center hover:bg-red-700">
                                                    <span className="text-lg font-medium leading-none mb-0.5">+</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Cart Bar (Host only) ──────────────────────────────────────── */}
            {!isGuest && cartItems.length > 0 && !isCartOpen && (
                <div className="fixed bottom-0 inset-x-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 z-50">
                    <div className="max-w-md mx-auto cursor-pointer" onClick={() => setIsCartOpen(true)}>
                        <div className="bg-red-600 rounded-xl text-white p-3.5 flex items-center justify-between shadow-lg shadow-red-600/20 active:scale-[0.98] transition-transform">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider opacity-90">{totalItems} ITEM{totalItems > 1 ? 'S' : ''}</p>
                                <p className="font-bold text-lg leading-tight">₹{cartTotal}</p>
                            </div>
                            <div className="flex items-center gap-1 font-bold">
                                View Cart <ArrowLeft className="w-4 h-4 rotate-180" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Cart Modal (Host only) ────────────────────────────────────── */}
            {!isGuest && isCartOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 flex flex-col justify-end">
                    <div className="bg-white rounded-t-2xl max-h-[90vh] flex flex-col pt-2 shadow-2xl relative w-full max-w-md mx-auto h-[80vh]">
                        <div className="flex flex-col items-center justify-center pb-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10 w-full px-4">
                            <div className="w-12 h-1.5 bg-gray-200 rounded-full mb-3" />
                            <div className="flex justify-between w-full items-center">
                                <h2 className="text-xl font-bold">Your Order</h2>
                                <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-6">
                            {cartItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400"><p>Your cart is empty.</p></div>
                            ) : (
                                cartItems.map((item) => (
                                    <div key={item.id} className="flex gap-4">
                                        <div className={`w-4 h-4 shrink-0 mt-1 rounded-sm border flex items-center justify-center ${item.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                                            <div className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`}></div>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-sm">{item.name}</h3>
                                            <p className="font-bold text-sm mt-1">₹{item.price * item.quantity}</p>
                                        </div>
                                        <div className="flex items-center justify-between text-black border border-gray-200 rounded-lg h-9 w-24 shrink-0 overflow-hidden shadow-sm">
                                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-1/3 h-full flex items-center justify-center hover:bg-gray-50">
                                                <span className="text-lg font-medium leading-none mb-0.5">-</span>
                                            </button>
                                            <span className="w-1/3 text-center font-bold text-sm text-green-600">{item.quantity}</span>
                                            <button onClick={() => addToCart(item)} className="w-1/3 h-full flex items-center justify-center hover:bg-gray-50">
                                                <span className="text-lg font-medium leading-none mb-0.5">+</span>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}

                            {cartItems.length > 0 && (
                                <div className="pt-4 border-t border-gray-100 space-y-4">
                                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex flex-col gap-2">
                                        <label htmlFor="instructions" className="text-xs font-bold text-gray-700 uppercase tracking-wide">Cooking Instructions</label>
                                        <textarea
                                            id="instructions"
                                            value={instructions}
                                            onChange={(e) => setInstructions(e.target.value)}
                                            placeholder="E.g. Make it spicy, no onions..."
                                            className="w-full bg-transparent text-sm resize-none outline-none p-0 border-0 placeholder-gray-400"
                                            rows={2}
                                            maxLength={150}
                                        />
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-gray-600">Item Total</span>
                                            <span className="font-semibold">₹{cartTotal}</span>
                                        </div>
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-gray-600 text-sm">Taxes and charges</span>
                                            <span className="text-green-600 font-medium text-sm">Included</span>
                                        </div>
                                        <div className="flex justify-between items-center font-bold text-lg border-t border-dashed border-gray-200 pt-4">
                                            <span>Grand Total</span>
                                            <span>₹{cartTotal}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {cartItems.length > 0 && (
                            <div className="p-4 bg-white border-t border-gray-100 pb-8 sticky bottom-0">
                                <button
                                    onClick={placeOrder}
                                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-between px-6 transition-transform active:scale-[0.98] shadow-md"
                                >
                                    <span>Place Order</span>
                                    <span className="bg-white/20 px-2 py-0.5 rounded text-sm border border-white/20">₹{cartTotal}</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Suggestions Panel (Host only) ─────────────────────────────── */}
            {isHost && isSuggestionsOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 flex flex-col justify-end">
                    <div className="bg-white rounded-t-2xl shadow-2xl w-full max-w-md mx-auto max-h-[60vh] flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-gray-100">
                            <div>
                                <h2 className="text-lg font-bold">Friend Suggestions</h2>
                                <p className="text-xs text-gray-500">Accept to add to your cart</p>
                            </div>
                            <button onClick={() => setIsSuggestionsOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 p-4 space-y-3">
                            {suggestedItems.length === 0 ? (
                                <p className="text-center text-gray-400 py-8">No suggestions yet.</p>
                            ) : (
                                suggestedItems.map((s, i) => (
                                    <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
                                        <img src={s.image} alt={s.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm text-gray-900 truncate">{s.name}</p>
                                            <p className="text-xs text-gray-500">₹{s.price}</p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                onClick={() => handleAcceptSuggestion(s)}
                                                className="p-2 bg-green-100 hover:bg-green-200 text-green-600 rounded-lg transition"
                                                title="Add to cart"
                                            >
                                                <CheckCircle className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDismissSuggestion(s)}
                                                className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition"
                                                title="Dismiss"
                                            >
                                                <XCircle className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function MenuPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-10 h-10 text-red-600 animate-spin" /></div>}>
            <MenuContent />
        </Suspense>
    );
}
