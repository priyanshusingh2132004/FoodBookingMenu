"use client";

import { useState, useEffect } from 'react';
import { Order } from '@/types';
import { CheckCircle2, Clock, UtensilsCrossed } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy } from 'firebase/firestore';
import { OrderStatus } from '@/types';

export default function KDSPage() {
    const [orders, setOrders] = useState<Order[]>([]);

    useEffect(() => {
        const q = query(
            collection(db, 'live_orders'),
            where('status', 'in', ['live', 'preparing', 'ready']),
            orderBy('timestamp', 'asc')
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const liveOrders = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Order[];
            setOrders(liveOrders);
        });

        return () => unsubscribe();
    }, []);

    const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
        try {
            const orderRef = doc(db, 'live_orders', orderId);
            await updateDoc(orderRef, {
                status: newStatus
            });
        } catch (e) {
            console.error('Error updating order status:', e);
            alert("Failed to update status. Check permissions.");
        }
    };

    const getStatusStyles = (status: OrderStatus) => {
        switch (status) {
            case 'live': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
            case 'preparing': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'ready': return 'bg-green-500/20 text-green-400 border-green-500/30';
            default: return 'bg-gray-700 text-gray-300 border-gray-600';
        }
    };

    const renderActionButton = (order: Order) => {
        if (order.status === 'live') {
            return (
                <button
                    onClick={() => updateOrderStatus(order.id, 'preparing')}
                    className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                    START PREPARING
                </button>
            );
        }
        if (order.status === 'preparing') {
            return (
                <button
                    onClick={() => updateOrderStatus(order.id, 'ready')}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                    FOOD READY
                </button>
            );
        }
        if (order.status === 'ready') {
            return (
                <button
                    onClick={() => updateOrderStatus(order.id, 'served')}
                    className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                    <CheckCircle2 className="w-5 h-5" />
                    MARK AS SERVED
                </button>
            );
        }
        return null;
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-6 font-sans">
            <header className="flex items-center justify-between mb-8 pb-4 border-b border-gray-800">
                <div className="flex items-center gap-3">
                    <div className="bg-red-600 p-2 rounded-lg">
                        <UtensilsCrossed className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Kitchen Display System</h1>
                        <p className="text-gray-400 text-sm">Restro Menu Book • Live Orders</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-lg">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    <span className="text-sm font-medium text-gray-300">{orders.length} Active Orders</span>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {orders.map((order) => {
                    let orderTime = new Date();
                    if (order.timestamp && typeof (order.timestamp as any).toDate === 'function') {
                        orderTime = (order.timestamp as any).toDate();
                    } else if (typeof order.timestamp === 'string') {
                        orderTime = new Date(order.timestamp);
                    }
                    const minsAgo = Math.floor((new Date().getTime() - orderTime.getTime()) / 60000);

                    return (
                        <div key={order.id} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-lg flex flex-col">
                            <div className={`px-4 py-3 border-b flex justify-between items-center bg-gray-900/50 ${getStatusStyles(order.status)}`}>
                                <div className="flex items-center gap-2">
                                    <div className="bg-black/20 text-current text-lg font-black px-2.5 py-1 rounded-md">
                                        T-{order.tableId}
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-wider opacity-80 ml-2">
                                        {order.status}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-sm font-medium bg-black/20 px-2 py-1 rounded-md">
                                    <Clock className="w-4 h-4" />
                                    {minsAgo}m ago
                                </div>
                            </div>

                            <div className="p-4 flex-1">
                                {/* Order Instructions */}
                                {order.instructions && (
                                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-md p-3 mb-4">
                                        <p className="text-yellow-400 text-xs font-bold uppercase tracking-wider mb-1">Cooking Instructions</p>
                                        <p className="text-yellow-100/90 text-sm leading-snug break-words">
                                            {order.instructions}
                                        </p>
                                    </div>
                                )}

                                {/* Items List */}
                                <ul className="space-y-3">
                                    {order.items.map((item, idx) => (
                                        <li key={idx} className="flex justify-between items-start">
                                            <div className="flex gap-2">
                                                <span className="font-bold text-lg text-white w-6">{item.quantity}x</span>
                                                <span className="text-gray-300 font-medium text-lg leading-tight">{item.name}</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="p-4 border-t border-gray-700 bg-gray-800/50">
                                {renderActionButton(order)}
                            </div>
                        </div>
                    );
                })}

                {orders.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-500">
                        <CheckCircle2 className="w-16 h-16 mb-4 text-gray-700" />
                        <p className="text-xl font-medium">No active orders</p>
                        <p className="text-sm mt-1">Kitchen is all caught up!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
