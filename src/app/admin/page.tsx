'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, getDoc, query, where } from 'firebase/firestore';
import { MenuItem, Order } from '@/types';
import { Plus, Trash2, Loader2, UtensilsCrossed, LogOut, LayoutDashboard, QrCode, TrendingUp, Download, Printer, Mail } from 'lucide-react';
import { menuItems as initialItems } from '@/lib/data';
import { QRCodeSVG } from 'qrcode.react';

type Tab = 'menu' | 'qr' | 'sales';

export default function AdminDashboard() {
    const { user, role, loading: authLoading, logout } = useAuth();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<Tab>('menu');
    const [isLoading, setIsLoading] = useState(true);

    // Context & Protection
    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/login/admin');
        } else if (!authLoading && user && role !== 'admin') {
            router.replace('/login/admin?error=unauthorized_admin');
        }
    }, [user, role, authLoading, router]);

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };

    // ----- MENU MANAGEMENT STATE -----
    const [items, setItems] = useState<MenuItem[]>([]);
    const [isSeeding, setIsSeeding] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [category, setCategory] = useState('');
    const [isVeg, setIsVeg] = useState(true);
    const [inStock, setInStock] = useState(true);
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // ----- QR MANAGEMENT STATE -----
    const [totalTables, setTotalTables] = useState<number>(0);
    const [newTableCount, setNewTableCount] = useState<string>('');
    const [isSavingTables, setIsSavingTables] = useState(false);
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

    // ----- SALES MANAGEMENT STATE -----
    const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
    const [isFetchingSales, setIsFetchingSales] = useState(false);
    const [isSendingEmail, setIsSendingEmail] = useState(false);


    // Initial Data Fetch
    useEffect(() => {
        if (!user || role !== 'admin') return;

        const loadInitialData = async () => {
            setIsLoading(true);
            try {
                // Fetch Menu Items
                const snapshot = await getDocs(collection(db, 'menu_items'));
                const fetchedItems: MenuItem[] = [];
                snapshot.forEach(doc => {
                    fetchedItems.push({ ...doc.data(), id: doc.id } as MenuItem);
                });
                setItems(fetchedItems);

                // Fetch Table Settings
                const settingsSnap = await getDoc(doc(db, 'settings', 'restaurant'));
                if (settingsSnap.exists()) {
                    setTotalTables(settingsSnap.data().totalTables || 0);
                    setNewTableCount(String(settingsSnap.data().totalTables || 0));
                }
            } catch (error) {
                console.error("Error fetching admin data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadInitialData();
    }, [user, role]);

    // Sales Data Fetch (Lazy)
    useEffect(() => {
        if (activeTab === 'sales' && completedOrders.length === 0) {
            fetchSales();
        }
    }, [activeTab]);

    const fetchSales = async () => {
        setIsFetchingSales(true);
        try {
            const q = query(
                collection(db, 'live_orders'),
                where('status', 'in', ['served', 'completed'])
            );
            const snapshot = await getDocs(q);
            const fetchedOrders: Order[] = [];
            snapshot.forEach(doc => {
                fetchedOrders.push({ id: doc.id, ...doc.data() } as Order);
            });

            // Sort by timestamp desc
            fetchedOrders.sort((a, b) => {
                const timeA = a.timestamp && (a.timestamp as any).toDate ? (a.timestamp as any).toDate().getTime() : 0;
                const timeB = b.timestamp && (b.timestamp as any).toDate ? (b.timestamp as any).toDate().getTime() : 0;
                return timeB - timeA;
            });

            setCompletedOrders(fetchedOrders);
        } catch (error) {
            console.error("Error fetching sales:", error);
        } finally {
            setIsFetchingSales(false);
        }
    };


    // ----- MENU Handlers -----
    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !price || !category) return alert("Please fill in Name, Price, and Category");

        let finalImageUrl = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80'; // Default
        if (file) {
            setIsUploading(true);
            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('upload_preset', 'restro_menu_uploads');
                const res = await fetch('https://api.cloudinary.com/v1_1/diek2uquu/image/upload', {
                    method: 'POST',
                    body: formData,
                });
                const data = await res.json();
                if (data.secure_url) finalImageUrl = data.secure_url;
            } catch (err) {
                console.error("Image upload failed:", err);
                alert("Image upload failed. Proceeding with default image.");
            } finally {
                setIsUploading(false);
            }
        }

        try {
            const newRef = doc(collection(db, 'menu_items'));
            const newItem: MenuItem = {
                id: newRef.id, name, description, price: Number(price), image: finalImageUrl, isVeg, category, inStock
            };
            await setDoc(newRef, newItem);
            alert("Item added successfully!");
            setName(''); setDescription(''); setPrice(''); setFile(null); setCategory(''); setInStock(true);
            setItems(prev => [...prev, newItem]);
        } catch (error) {
            console.error("Error adding item:", error);
            alert("Failed to add item.");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this item?")) return;
        try {
            await deleteDoc(doc(db, 'menu_items', id));
            setItems(prev => prev.filter(item => item.id !== id));
        } catch (error) {
            alert("Failed to delete item.");
        }
    };

    const toggleStock = async (id: string, currentStatus: boolean | undefined) => {
        try {
            await setDoc(doc(db, 'menu_items', id), { inStock: currentStatus === false ? true : false }, { merge: true });
            setItems(prev => prev.map(item => item.id === id ? { ...item, inStock: !currentStatus } : item));
        } catch (error) {
            alert("Failed to update stock status.");
        }
    };

    const seedDatabase = async () => {
        setIsSeeding(true);
        try {
            for (const item of initialItems) {
                const docRef = doc(db, 'menu_items', item.id);
                await setDoc(docRef, item);
            }
            alert("Demo data successfully seeded!");
            window.location.reload();
        } catch (error) {
            alert("Failed to seed data.");
        } finally {
            setIsSeeding(false);
        }
    };


    // ----- QR Handlers -----
    const handleSaveTableCount = async () => {
        const count = parseInt(newTableCount);
        if (isNaN(count) || count < 0 || count > 100) return alert("Please enter a valid number (0-100).");
        setIsSavingTables(true);
        try {
            await setDoc(doc(db, 'settings', 'restaurant'), { totalTables: count }, { merge: true });
            setTotalTables(count);
            alert("Table count updated!");
        } catch (error) {
            console.error("Error setting table count:", error);
            alert("Failed to save table count.");
        } finally {
            setIsSavingTables(false);
        }
    };

    const printQRs = () => {
        window.print();
    };


    // ----- SALES Handlers -----
    const calculateTotalSales = () => {
        return completedOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    };

    const downloadCSV = () => {
        if (completedOrders.length === 0) return alert("No sales data to download.");

        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Order ID,Table,Date,Total Amount,Items\n";

        completedOrders.forEach(order => {
            const dateStr = order.timestamp && (order.timestamp as any).toDate
                ? (order.timestamp as any).toDate().toLocaleString()
                : new Date().toLocaleString(); // Fallback

            const itemsStr = order.items.map(i => `${i.quantity}x ${i.name}`).join(' | ');
            // Escape quotes inside itemsStr just in case
            const safeItemsStr = `"${itemsStr.replace(/"/g, '""')}"`;

            csvContent += `${order.id},${order.tableId},"${dateStr}",${order.total},${safeItemsStr}\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `sales_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const emailSales = async () => {
        if (completedOrders.length === 0) return alert("No sales data to email.");
        setIsSendingEmail(true);

        try {
            const res = await fetch('/api/send-sales', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orders: completedOrders, email: user?.email })
            });
            const data = await res.json();

            if (res.ok) {
                alert(`Sales report successfully sent to ${user?.email}`);
            } else {
                alert(`Failed to send email: ${data.error || 'Unknown error. Check App Password.'}`);
            }
        } catch (err) {
            console.error(err);
            alert("Error sending email. Please check console.");
        } finally {
            setIsSendingEmail(false);
        }
    };



    if (authLoading || (!user && !isLoading)) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center">
                    <Loader2 className="w-10 h-10 text-red-600 animate-spin mb-4" />
                    <p className="text-gray-500 font-medium">Verifying Admin Access...</p>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center">
                    <UtensilsCrossed className="w-12 h-12 text-red-600 animate-bounce mb-4" />
                    <p className="text-gray-500 font-medium">Loading Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans print:bg-white print:p-0">
            {/* Header (Hidden in Print Mode) */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-30 print:hidden shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2 text-red-700">
                            <UtensilsCrossed className="w-6 h-6" />
                            Admin Console
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">Manage menus, QR codes, and sales.</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="bg-gray-100 px-3 py-1.5 rounded-lg text-sm text-gray-600 font-medium border border-gray-200">
                            {user?.email}
                        </div>
                        <button onClick={handleLogout} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition border border-transparent hover:border-red-100" title="Sign Out">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="max-w-7xl mx-auto px-6 flex items-center gap-6 border-t border-gray-100">
                    <button
                        onClick={() => setActiveTab('menu')}
                        className={`py-4 px-2 font-bold text-sm border-b-2 transition flex items-center gap-2 ${activeTab === 'menu' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
                    >
                        <LayoutDashboard className="w-4 h-4" /> Menu Management
                    </button>
                    <button
                        onClick={() => setActiveTab('qr')}
                        className={`py-4 px-2 font-bold text-sm border-b-2 transition flex items-center gap-2 ${activeTab === 'qr' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
                    >
                        <QrCode className="w-4 h-4" /> Tables & QR Codes
                    </button>
                    <button
                        onClick={() => setActiveTab('sales')}
                        className={`py-4 px-2 font-bold text-sm border-b-2 transition flex items-center gap-2 ${activeTab === 'sales' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
                    >
                        <TrendingUp className="w-4 h-4" /> Sales Analytics
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-7xl mx-auto p-6 print:p-0 print:max-w-full">

                {/* -------------------- MENU TAB -------------------- */}
                {activeTab === 'menu' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
                        {/* Add Item Form */}
                        <div className="md:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold">Add Menu Item</h2>
                                {items.length === 0 && (
                                    <button onClick={seedDatabase} disabled={isSeeding} className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded font-bold hover:bg-red-100 transition">
                                        {isSeeding ? '...' : 'Seed Demo'}
                                    </button>
                                )}
                            </div>

                            <form onSubmit={handleAddItem} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Item Name *</label>
                                    <input required value={name} onChange={e => setName(e.target.value)} type="text" className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-red-100" placeholder="e.g. Masala Dosa" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Category *</label>
                                    <input required value={category} onChange={e => setCategory(e.target.value)} type="text" className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-red-100" placeholder="e.g. Starters, Main Course" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Price (₹) *</label>
                                    <input required value={price} onChange={e => setPrice(e.target.value)} type="number" className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-red-100" placeholder="e.g. 250" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Description</label>
                                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-red-100" placeholder="A short description of the dish..." />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Image Upload</label>
                                    <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-red-100 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100" />
                                </div>
                                <div className="flex items-center gap-6 pt-2">
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" id="isVeg" checked={isVeg} onChange={e => setIsVeg(e.target.checked)} className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500" />
                                        <label htmlFor="isVeg" className="text-sm font-medium text-gray-700">Vegetarian</label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" id="inStock" checked={inStock} onChange={e => setInStock(e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                                        <label htmlFor="inStock" className="text-sm font-medium text-gray-700">In Stock</label>
                                    </div>
                                </div>
                                <button type="submit" disabled={isUploading} className={`w-full mt-4 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 ${isUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}>
                                    {isUploading ? <><Loader2 className="w-5 h-5 animate-spin" /> Uploading...</> : <><Plus className="w-5 h-5" /> Add to Menu</>}
                                </button>
                            </form>
                        </div>

                        {/* Items List */}
                        <div className="md:col-span-2 space-y-4">
                            <h2 className="text-lg font-bold mb-4">Current Menu ({items.length})</h2>
                            {items.length === 0 ? (
                                <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-gray-300">
                                    <p className="text-gray-500">Your menu is currently empty.<br /> Add items using the form or click "Seed Demo".</p>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {items.map(item => (
                                        <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4 items-center">
                                            <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded-lg bg-gray-100 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-lg leading-tight truncate">{item.name}</h3>
                                                    <div className={`shrink-0 w-3 h-3 flex items-center justify-center rounded-sm border ${item.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                                                        <div className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`}></div>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-gray-500 line-clamp-1">{item.category} • {item.description}</p>
                                                <p className="font-semibold text-red-600 mt-1">₹{item.price}</p>
                                            </div>
                                            <button onClick={() => toggleStock(item.id, item.inStock)} className={`shrink-0 px-3 py-1.5 text-xs font-bold rounded-lg transition ${item.inStock !== false ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 ring-1 ring-blue-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 ring-1 ring-gray-300'}`}>
                                                {item.inStock !== false ? 'In Stock' : 'Out of Stock'}
                                            </button>
                                            <button onClick={() => handleDelete(item.id)} className="shrink-0 p-3 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition ml-2">
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* -------------------- QR TAB -------------------- */}
                {activeTab === 'qr' && (
                    <div className="space-y-8">
                        {/* QR Config UI (Hidden on Print) */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 max-w-2xl print:hidden">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <QrCode className="w-5 h-5 text-red-600" />
                                QR Code Generator
                            </h2>
                            <p className="text-sm text-gray-600 mb-6">Enter the total number of dine-in tables your restaurant has. The system will automatically generate standard Takeaway QRs plus specific Table QRs that embed the table number directly into the URL, preventing any mix-ups.</p>

                            <div className="flex items-end gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Total Number of Tables</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={newTableCount}
                                        onChange={(e) => setNewTableCount(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-red-100 font-medium"
                                    />
                                </div>
                                <button
                                    onClick={handleSaveTableCount}
                                    disabled={isSavingTables || parseInt(newTableCount) === totalTables}
                                    className="bg-gray-900 border border-gray-900 hover:bg-gray-800 text-white font-bold py-2.5 px-6 rounded-lg transition disabled:opacity-50"
                                >
                                    {isSavingTables ? 'Saving...' : 'Save & Generate'}
                                </button>
                                <button
                                    onClick={printQRs}
                                    className="bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 font-bold py-2.5 px-6 rounded-lg transition flex items-center gap-2"
                                >
                                    <Printer className="w-4 h-4" /> Print QRs
                                </button>
                            </div>
                        </div>

                        {/* Print Overlay / Grid Display */}
                        <div className="print:block">
                            <h2 className="text-2xl font-black text-center mb-8 hidden print:block">Scan to Order - Menu QR Codes</h2>

                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 print:gap-6">
                                {/* Always render Takeway QR */}
                                <div className="bg-white p-6 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center text-center print:border-solid print:border-gray-800 break-inside-avoid shadow-sm print:shadow-none">
                                    <h3 className="font-black text-2xl tracking-tight mb-2 uppercase text-gray-900">Takeaway</h3>
                                    <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm print:shadow-none print:border-gray-300">
                                        <QRCodeSVG value={`${baseUrl}/menu?table=Takeaway`} size={160} level="M" />
                                    </div>
                                    <p className="mt-4 text-xs font-medium text-gray-500 max-w-[150px]">Scan to browse menu and order for takeaway.</p>
                                </div>

                                {/* Render Table QRs */}
                                {Array.from({ length: totalTables }, (_, i) => i + 1).map((tableNum) => (
                                    <div key={tableNum} className="bg-white p-6 rounded-2xl border-2 border-gray-100 flex flex-col items-center text-center print:border-gray-800 break-inside-avoid shadow-sm print:shadow-none relative">
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-sm tracking-widest print:border print:border-white">
                                            Dine In
                                        </div>
                                        <h3 className="font-black text-3xl tracking-tight mb-2 mt-2 text-gray-900">Table {tableNum}</h3>
                                        <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm print:shadow-none print:border-gray-300">
                                            <QRCodeSVG value={`${baseUrl}/menu?table=${tableNum}`} size={160} level="H" />
                                        </div>
                                        <p className="mt-4 text-[10px] font-bold text-gray-400 font-mono tracking-tight">{baseUrl.replace('https://', '')}/menu?table={tableNum}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* -------------------- SALES TAB -------------------- */}
                {activeTab === 'sales' && (
                    <div className="space-y-6 print:hidden">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <TrendingUp className="w-6 h-6 text-green-600" />
                                    Sales Hub
                                </h2>
                                <p className="text-gray-500 text-sm mt-1">Export your fulfilled orders (Served) for accounting.</p>

                                <div className="mt-4 flex gap-8">
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Revenue</p>
                                        <p className="text-2xl font-black text-gray-900">₹{calculateTotalSales().toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Completed Orders</p>
                                        <p className="text-2xl font-black text-gray-900">{completedOrders.length}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 min-w-[200px]">
                                <button
                                    onClick={downloadCSV}
                                    disabled={completedOrders.length === 0}
                                    className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50"
                                >
                                    <Download className="w-4 h-4" /> Download CSV
                                </button>
                                <button
                                    onClick={emailSales}
                                    disabled={completedOrders.length === 0 || isSendingEmail}
                                    className="w-full bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition border border-blue-200 disabled:opacity-50"
                                >
                                    {isSendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                                    Send to Gmail
                                </button>
                                <p className="text-[10px] text-center text-gray-400">Sends to: {user?.email}</p>
                            </div>
                        </div>

                        {/* Recent Sales Preview Map */}
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                                <h3 className="font-bold text-gray-900">Sales Preview</h3>
                                <button onClick={fetchSales} className="text-sm font-semibold text-red-600 hover:underline">Refresh Data</button>
                            </div>
                            {isFetchingSales ? (
                                <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 text-gray-400 animate-spin" /></div>
                            ) : completedOrders.length === 0 ? (
                                <div className="p-12 text-center text-gray-500">No completed sales to display.</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 border-b border-gray-100">
                                            <tr>
                                                <th className="px-6 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">Order ID</th>
                                                <th className="px-6 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">Table/Type</th>
                                                <th className="px-6 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">Amount</th>
                                                <th className="px-6 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {completedOrders.slice(0, 10).map((order) => {
                                                const dateStr = order.timestamp && (order.timestamp as any).toDate
                                                    ? (order.timestamp as any).toDate().toLocaleString()
                                                    : 'N/A';

                                                return (
                                                    <tr key={order.id} className="hover:bg-gray-50/50">
                                                        <td className="px-6 py-4 font-mono text-gray-500">{order.id.slice(0, 8)}</td>
                                                        <td className="px-6 py-4 font-bold text-gray-900 border border-transparent">
                                                            <span className="bg-gray-100 px-2 py-1 rounded">T-{order.tableId}</span>
                                                        </td>
                                                        <td className="px-6 py-4 font-semibold text-green-600">₹{order.total}</td>
                                                        <td className="px-6 py-4 text-gray-500">{dateStr}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        {completedOrders.length > 10 && (
                                            <tfoot className="bg-gray-50 border-t border-gray-200">
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-3 text-center text-xs text-gray-500 font-medium">
                                                        Showing 10 of {completedOrders.length} records. Download CSV for full report.
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
