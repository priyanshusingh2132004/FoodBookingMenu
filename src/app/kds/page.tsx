"use client";

import { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, Clock, UtensilsCrossed, AlertCircle } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy } from 'firebase/firestore';
import { OrderStatus, Order } from '@/types';

export default function KDSPage() {
    const [orders, setOrders] = useState<Order[]>([]);

    useEffect(() => {
        const q = query(
            collection(db, 'live_orders'),
            where('status', 'in', ['live', 'preparing', 'ready'])
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const liveOrders = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Order[];

            // Sort client-side to avoid composite index requirement
            liveOrders.sort((a, b) => {
                const timeA = a.timestamp && (a.timestamp as any).toDate ? (a.timestamp as any).toDate().getTime() : new Date(a.timestamp as string).getTime();
                const timeB = b.timestamp && (b.timestamp as any).toDate ? (b.timestamp as any).toDate().getTime() : new Date(b.timestamp as string).getTime();
                return timeA - timeB;
            });

            setOrders(liveOrders);
        });

        return () => unsubscribe();
    }, []);

    const groupedOrders = useMemo(() => {
        const groups: Record<string, Order[]> = {};
        orders.forEach(order => {
            if (!groups[order.tableId]) {
                groups[order.tableId] = [];
            }
            groups[order.tableId].push(order);
        });
        return groups;
    }, [orders]);

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

            <div className="flex-1 p-6 overflow-hidden flex flex-col">
                {orders.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                        <CheckCircle2 className="w-16 h-16 mb-4 text-gray-600" />
                        <h2 className="text-2xl font-bold text-gray-400">All Caught Up!</h2>
                        <p className="mt-2">No active orders in the kitchen.</p>
                    </div>
                ) : (
                    <div className="flex gap-6 overflow-x-auto pb-4 h-full snap-x style-scrollbars">
                        {Object.entries(groupedOrders).map(([tableId, tableOrders]: [string, Order[]]) => (
                            <div key={tableId} className="min-w-[340px] max-w-[340px] shrink-0 snap-start flex flex-col gap-4 bg-gray-800/40 p-4 rounded-2xl border border-gray-700/50 h-max max-h-full overflow-y-auto">
                                <div className="flex items-center justify-between pb-2 border-b border-gray-700 sticky top-0 bg-gray-800/90 backdrop-blur-sm z-10 py-1 -mt-1 -mx-2 px-2">
                                    <h2 className="text-xl font-black text-white flex items-center gap-2">
                                        <div className="bg-red-600/20 p-1.5 rounded-lg text-red-500">
                                            <UtensilsCrossed className="w-5 h-5" />
                                        </div>
                                        Table {tableId}
                                    </h2>
                                    <span className="bg-gray-700 text-gray-300 text-xs font-bold px-2.5 py-1 rounded-full border border-gray-600">
                                        {tableOrders.length} Ticket{tableOrders.length > 1 ? 's' : ''}
                                    </span>
                                </div>

                                <div className="flex flex-col gap-4">
                                    {tableOrders.map((order: Order) => {
                                        let orderTime = new Date();
                                        if (order.timestamp && typeof (order.timestamp as any).toDate === 'function') {
                                            orderTime = (order.timestamp as any).toDate();
                                        } else if (typeof order.timestamp === 'string' || typeof order.timestamp === 'number') {
                                            orderTime = new Date(order.timestamp);
                                        }
                                        const minsAgo = Math.floor((new Date().getTime() - orderTime.getTime()) / 60000);

                                        return (
                                            <div key={order.id} className="bg-gray-800 border border-gray-700 rounded-xl shadow-lg flex flex-col relative overflow-hidden group">
                                                <div className={`absolute top-0 left-0 w-1.5 h-full ${order.status === 'live' ? 'bg-yellow-500' : order.status === 'preparing' ? 'bg-blue-500' : 'bg-green-500'}`}></div>

                                                <div className={`px-4 py-3 border-b flex justify-between items-center bg-gray-900/40 border-gray-700`}>
                                                    <div className="flex items-center gap-2 pl-2">
                                                        <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${order.status === 'live' ? 'bg-yellow-500/10 text-yellow-500' : order.status === 'preparing' ? 'bg-blue-500/10 text-blue-400' : 'bg-green-500/10 text-green-400'}`}>
                                                            {order.status}
                                                        </span>
                                                    </div>
                                                    <div className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-md ${minsAgo > 15 && order.status !== 'ready' ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-black/30 text-gray-400'}`}>
                                                        <Clock className="w-3.5 h-3.5" />
                                                        {minsAgo}m ago
                                                    </div>
                                                </div>

                                                <div className="p-4 flex-1">
                                                    <ul className="space-y-3">
                                                        {order.items.map((item: any, idx: number) => (
                                                            <li key={idx} className="flex justify-between items-start text-gray-200">
                                                                <div className="flex gap-3">
                                                                    <div className="flex-shrink-0 w-6 h-6 bg-gray-700 rounded-md flex items-center justify-center font-bold text-sm text-white">
                                                                        {item.quantity}
                                                                    </div>
                                                                    <span className="font-medium text-sm leading-snug pt-0.5">{item.name}</span>
                                                                </div>
                                                            </li>
                                                        ))}
                                                    </ul>

                                                    {order.instructions && (
                                                        <div className="mt-4 p-3 bg-red-900/20 border border-red-900/30 rounded-lg flex gap-2 text-red-200">
                                                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 opacity-80" />
                                                            <p className="text-sm font-medium italic ">{order.instructions}</p>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="p-3 border-t border-gray-700 bg-gray-800/50">
                                                    {renderActionButton(order)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
