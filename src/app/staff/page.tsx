'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Order, OrderStatus } from '@/types';
import {
    Users,
    TrendingUp,
    ShoppingBag,
    XCircle,
    UtensilsCrossed,
    Clock,
    CheckCircle2
} from 'lucide-react';

export default function StaffPanel() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const q = query(
            collection(db, 'live_orders'),
            orderBy('timestamp', 'desc')
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const fetchedOrders = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Order[];
            setOrders(fetchedOrders);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleCancelOrder = async (orderId: string) => {
        if (!confirm("Are you sure you want to cancel this order? This cannot be undone.")) return;

        try {
            const orderRef = doc(db, 'live_orders', orderId);
            await updateDoc(orderRef, {
                status: 'cancelled'
            });
        } catch (error) {
            console.error("Error cancelling order:", error);
            alert("Failed to cancel order. Check Firebase permissions.");
        }
    };

    const handleMarkServed = async (orderId: string) => {
        try {
            const orderRef = doc(db, 'live_orders', orderId);
            await updateDoc(orderRef, {
                status: 'served'
            });
        } catch (error) {
            console.error("Error updating order:", error);
            alert("Failed to mark order as served.");
        }
    };

    const handleAdvanceStatus = async (orderId: string, currentStatus: OrderStatus) => {
        const nextStatus = currentStatus === 'live' ? 'preparing' :
            currentStatus === 'preparing' ? 'ready' :
                currentStatus === 'ready' ? 'served' : null;
        if (!nextStatus) return;

        try {
            const orderRef = doc(db, 'live_orders', orderId);
            await updateDoc(orderRef, { status: nextStatus });
        } catch (error) {
            console.error("Error updating order:", error);
            alert("Failed to update status.");
        }
    };

    // Calculate metrics
    const totalOrders = orders.length;
    const activeOrders = orders.filter(o => ['live', 'preparing', 'ready'].includes(o.status)).length;

    // Calculate total revenue from non-cancelled orders using reduce
    const totalRevenue = orders
        .filter(o => o.status !== 'cancelled')
        .reduce((sum, order) => sum + (order.total || 0), 0);

    const getStatusStyles = (status: OrderStatus) => {
        switch (status) {
            case 'live': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'preparing': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'ready': return 'bg-green-100 text-green-800 border-green-200';
            case 'served': return 'bg-gray-100 text-gray-800 border-gray-200';
            case 'cancelled': return 'bg-red-100 text-red-800 border-red-200 line-through';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center">
                    <UtensilsCrossed className="w-12 h-12 text-blue-600 animate-bounce mb-4" />
                    <p className="text-gray-500 font-medium">Loading Staff Panel...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-6">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3 text-blue-900">
                            <Users className="w-8 h-8 text-blue-600" />
                            Hotel Staff Control Panel
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">Manage restaurant orders and monitor performance metrics.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-50 px-4 py-2 rounded-xl text-blue-700 font-semibold border border-blue-100 flex items-center gap-2">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                            </span>
                            Live System Active
                        </div>
                    </div>
                </div>

                {/* Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 transition hover:shadow-md">
                        <div className="bg-green-100 p-4 rounded-xl text-green-600">
                            <TrendingUp className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Revenue</p>
                            <p className="text-3xl font-bold text-gray-900">₹{totalRevenue.toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 transition hover:shadow-md">
                        <div className="bg-blue-100 p-4 rounded-xl text-blue-600">
                            <ShoppingBag className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Orders</p>
                            <p className="text-3xl font-bold text-gray-900">{totalOrders}</p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 transition hover:shadow-md">
                        <div className="bg-yellow-100 p-4 rounded-xl text-yellow-600">
                            <UtensilsCrossed className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Active Orders</p>
                            <p className="text-3xl font-bold text-gray-900">{activeOrders}</p>
                        </div>
                    </div>
                </div>

                {/* Orders Data Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h2 className="text-xl font-bold text-gray-900">Recent Orders</h2>
                    </div>

                    {/* Mobile View (Cards) */}
                    <div className="block lg:hidden divide-y divide-gray-100">
                        {orders.map((order) => {
                            let orderTime = new Date();
                            if (order.timestamp && typeof (order.timestamp as any).toDate === 'function') {
                                orderTime = (order.timestamp as any).toDate();
                            } else if (typeof order.timestamp === 'string') {
                                orderTime = new Date(order.timestamp);
                            }

                            return (
                                <div key={order.id} className="p-4 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="font-bold text-lg text-gray-900">T-{order.tableId}</span>
                                            <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded ml-2">
                                                {order.id.slice(0, 8)}
                                            </span>
                                        </div>
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusStyles(order.status)}`}>
                                            {order.status}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-700 font-medium">
                                        {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                                        <div className="font-bold text-gray-900">₹{order.total}</div>
                                        <div className="flex items-center gap-1 text-xs text-gray-500">
                                            <Clock className="w-4 h-4" />
                                            {orderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                    <div className="pt-2 flex items-center justify-end gap-2">
                                        {['live', 'preparing', 'ready'].includes(order.status) && (
                                            <button
                                                onClick={() => handleAdvanceStatus(order.id, order.status)}
                                                className="flex-1 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-bold transition whitespace-nowrap"
                                            >
                                                {order.status === 'live' ? 'Accept (Prep)' :
                                                    order.status === 'preparing' ? 'Mark Ready' :
                                                        'Mark Served'}
                                            </button>
                                        )}
                                        {order.status !== 'cancelled' && order.status !== 'served' && (
                                            <button
                                                onClick={() => handleCancelOrder(order.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition border border-red-100 flex-shrink-0"
                                                title="Cancel Order"
                                            >
                                                <XCircle className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {orders.length === 0 && (
                            <div className="p-8 text-center text-gray-500">
                                No orders found in the system.
                            </div>
                        )}
                    </div>

                    {/* Desktop View (Table) */}
                    <div className="hidden lg:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 text-gray-500 text-sm uppercase tracking-wider">
                                    <th className="p-4 font-semibold border-b border-gray-100">Order ID</th>
                                    <th className="p-4 font-semibold border-b border-gray-100">Table</th>
                                    <th className="p-4 font-semibold border-b border-gray-100">Items</th>
                                    <th className="p-4 font-semibold border-b border-gray-100">Total</th>
                                    <th className="p-4 font-semibold border-b border-gray-100">Status</th>
                                    <th className="p-4 font-semibold border-b border-gray-100">Time</th>
                                    <th className="p-4 font-semibold border-b border-gray-100 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {orders.map((order) => {
                                    let orderTime = new Date();
                                    if (order.timestamp && typeof (order.timestamp as any).toDate === 'function') {
                                        orderTime = (order.timestamp as any).toDate();
                                    } else if (typeof order.timestamp === 'string') {
                                        orderTime = new Date(order.timestamp);
                                    }

                                    return (
                                        <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="p-4">
                                                <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                    {order.id.slice(0, 8)}...
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className="font-bold text-lg">T-{order.tableId}</span>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-sm text-gray-700 max-w-xs truncate">
                                                    {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                                                </div>
                                            </td>
                                            <td className="p-4 font-bold text-gray-900">
                                                ₹{order.total}
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase border ${getStatusStyles(order.status)}`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm text-gray-500">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-4 h-4" />
                                                    {orderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {['live', 'preparing', 'ready'].includes(order.status) && (
                                                        <button
                                                            onClick={() => handleAdvanceStatus(order.id, order.status)}
                                                            className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition whitespace-nowrap"
                                                        >
                                                            {order.status === 'live' ? 'Accept (Prep)' :
                                                                order.status === 'preparing' ? 'Mark Ready' :
                                                                    'Mark Served'}
                                                        </button>
                                                    )}
                                                    {order.status !== 'cancelled' && order.status !== 'served' && (
                                                        <button
                                                            onClick={() => handleCancelOrder(order.id)}
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                                            title="Cancel Order"
                                                        >
                                                            <XCircle className="w-5 h-5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {orders.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-gray-500">
                                            No orders found in the system.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
