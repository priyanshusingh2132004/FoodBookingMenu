'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Order, OrderStatus } from '@/types';
import { Loader2, ArrowLeft, CheckCircle2, ChefHat, Clock, CheckCircle } from 'lucide-react';

function OrderTrackerContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const orderId = searchParams.get('orderId');

    const [order, setOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!orderId) {
            setError("No order ID provided.");
            setIsLoading(false);
            return;
        }

        console.log(`Setting up real-time listener for order: ${orderId}`);
        const orderRef = doc(db, 'live_orders', orderId);

        const unsubscribe = onSnapshot(orderRef,
            (docSnap) => {
                if (docSnap.exists()) {
                    setOrder({ id: docSnap.id, ...docSnap.data() } as Order);
                    setError(null);
                } else {
                    setError("Order not found or has been completed.");
                }
                setIsLoading(false);
            },
            (err) => {
                console.error("Error listening to order:", err);
                setError("Failed to track order. Please check your connection.");
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [orderId]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
                <Loader2 className="w-12 h-12 text-red-600 animate-spin mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">Finding Your Order...</h2>
                <p className="text-gray-500 max-w-sm">Please wait while we connect to the kitchen to get your live status.</p>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-red-50 p-6 rounded-full mb-6">
                    <CheckCircle className="w-16 h-16 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h2>
                <p className="text-gray-500 max-w-sm mb-8">{error || "This order may have already been completed and cleared from the live tracker."}</p>
                <button
                    onClick={() => router.push('/menu')}
                    className="bg-red-600 text-white px-8 py-3.5 rounded-xl font-bold flex items-center gap-2 hover:bg-red-700 transition"
                >
                    <ArrowLeft className="w-5 h-5" /> Back to Menu
                </button>
            </div>
        );
    }

    const getStatusIndex = (status: OrderStatus) => {
        const statuses: OrderStatus[] = ['live', 'preparing', 'ready', 'served'];
        return statuses.indexOf(status);
    };

    const currentStep = getStatusIndex(order.status);
    const isCancelled = order.status === 'cancelled';

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-12">
            {/* Header */}
            <div className="bg-white px-4 py-4 sticky top-0 z-10 shadow-sm border-b border-gray-100 flex items-center gap-3">
                <button
                    onClick={() => router.push(`/menu?table=${order.tableId}`)}
                    className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition"
                >
                    <ArrowLeft className="w-6 h-6 text-gray-700" />
                </button>
                <div>
                    <h1 className="font-bold text-lg leading-tight">Order Tracking</h1>
                    <p className="text-xs text-gray-500 font-mono">ID: {order.id.slice(0, 8).toUpperCase()}</p>
                </div>
            </div>

            <div className="p-4 max-w-lg mx-auto space-y-6 mt-4">

                {/* Status Card */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center relative overflow-hidden">
                    {/* Background decoration */}
                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-red-50 rounded-full blur-2xl opacity-60 pointer-events-none"></div>

                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-6 relative z-10">Live Status</h2>

                    {isCancelled ? (
                        <div className="flex flex-col items-center">
                            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                <span className="text-4xl">❌</span>
                            </div>
                            <h3 className="text-2xl font-black text-gray-900">Order Cancelled</h3>
                            <p className="text-gray-500 mt-2">We're sorry, but your order has been cancelled.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center">
                            {currentStep === 0 && (
                                <>
                                    <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mb-4 animate-pulse ring-4 ring-yellow-50">
                                        <Clock className="w-10 h-10 text-yellow-600" />
                                    </div>
                                    <h3 className="text-2xl font-black text-gray-900">Order Placed</h3>
                                    <p className="text-gray-500 mt-2">Waiting for the kitchen to accept your order.</p>
                                </>
                            )}
                            {currentStep === 1 && (
                                <>
                                    <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-4 ring-4 ring-blue-50">
                                        <ChefHat className="w-10 h-10 text-blue-600 animate-bounce" />
                                    </div>
                                    <h3 className="text-2xl font-black text-gray-900">Preparing Food</h3>
                                    <p className="text-gray-500 mt-2">Our chefs are currently preparing your meal.</p>
                                </>
                            )}
                            {currentStep === 2 && (
                                <>
                                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-4 ring-4 ring-green-50">
                                        <CheckCircle2 className="w-10 h-10 text-green-600" />
                                    </div>
                                    <h3 className="text-2xl font-black text-gray-900">Food is Ready!</h3>
                                    <p className="text-gray-500 mt-2">Your food is ready and will be served to you shortly.</p>
                                </>
                            )}
                            {currentStep === 3 && (
                                <>
                                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                        <CheckCircle className="w-10 h-10 text-gray-600" />
                                    </div>
                                    <h3 className="text-2xl font-black text-gray-900">Order Served</h3>
                                    <p className="text-gray-500 mt-2">Enjoy your meal! This tracker will now be closed.</p>
                                </>
                            )}
                        </div>
                    )}

                    {/* Progress Bar (if not cancelled) */}
                    {!isCancelled && (
                        <div className="mt-8 relative z-10">
                            <div className="flex justify-between mb-2 px-1">
                                <span className={`text-[10px] uppercase font-bold ${currentStep >= 0 ? 'text-yellow-600' : 'text-gray-400'}`}>Placed</span>
                                <span className={`text-[10px] uppercase font-bold ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>Prep</span>
                                <span className={`text-[10px] uppercase font-bold ${currentStep >= 2 ? 'text-green-600' : 'text-gray-400'}`}>Ready</span>
                                <span className={`text-[10px] uppercase font-bold pr-1 ${currentStep >= 3 ? 'text-gray-800' : 'text-gray-400'}`}>Served</span>
                            </div>
                            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
                                <div className={`h-full transition-all duration-500 ${currentStep >= 0 ? 'bg-yellow-400 w-1/4' : 'w-0'}`}></div>
                                <div className={`h-full transition-all duration-500 delay-100 ${currentStep >= 1 ? 'bg-blue-500 w-1/4' : 'w-0'}`}></div>
                                <div className={`h-full transition-all duration-500 delay-200 ${currentStep >= 2 ? 'bg-green-500 w-1/4' : 'w-0'}`}></div>
                                <div className={`h-full transition-all duration-500 delay-300 ${currentStep >= 3 ? 'bg-gray-800 w-1/4' : 'w-0'}`}></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Order Details */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-900 mb-4 pb-4 border-b border-gray-100">Order Details</h3>
                    <div className="space-y-4">
                        {order.items.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-start gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-5 h-5 shrink-0 mt-0.5 rounded-sm border flex items-center justify-center border-gray-200 font-bold text-xs bg-gray-50 text-gray-500 tracking-tighter">
                                        {item.quantity}x
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm text-gray-900">{item.name}</p>
                                    </div>
                                </div>
                                <p className="font-bold text-sm text-gray-900 shrink-0">₹{item.price * item.quantity}</p>
                            </div>
                        ))}
                    </div>

                    {order.instructions && (
                        <div className="mt-6 pt-4 border-t border-dashed border-gray-200">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Kitchen Instructions</p>
                            <p className="text-sm text-gray-700 italic">"{order.instructions}"</p>
                        </div>
                    )}

                    <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
                        <span className="font-semibold text-gray-500">Total Amount</span>
                        <span className="font-black text-xl text-gray-900">₹{order.total}</span>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default function OrderTracker() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
                <Loader2 className="w-12 h-12 text-red-600 animate-spin mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">Loading Tracker...</h2>
            </div>
        }>
            <OrderTrackerContent />
        </Suspense>
    );
}
