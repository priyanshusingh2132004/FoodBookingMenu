'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { MenuItem } from '@/types';
import { Plus, Trash2, Loader2, UtensilsCrossed } from 'lucide-react';
import { menuItems as initialItems } from '@/lib/data';

export default function AdminDashboard() {
    const [items, setItems] = useState<MenuItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSeeding, setIsSeeding] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [category, setCategory] = useState('');
    const [isVeg, setIsVeg] = useState(true);
    const [inStock, setInStock] = useState(true);

    // Image Upload State
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const fetchItems = async () => {
        setIsLoading(true);
        try {
            const snapshot = await getDocs(collection(db, 'menu_items'));
            const fetchedItems: MenuItem[] = [];
            snapshot.forEach(doc => {
                fetchedItems.push({ ...doc.data(), id: doc.id } as MenuItem);
            });
            setItems(fetchedItems);
        } catch (error) {
            console.error("Error fetching items:", error);
            alert("Failed to load items. Check Firebase permissions.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, []);

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !price || !category) return alert("Please fill in Name, Price, and Category");

        let finalImageUrl = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80'; // Default fallback

        // Upload image to Cloudinary if file exists
        if (file) {
            setIsUploading(true);
            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('upload_preset', 'restro_menu_uploads'); // Requires an unsigned preset named this in Cloudinary

                // Using a generic public cloudinary cloud name for demo/testing purposes
                const res = await fetch('https://api.cloudinary.com/v1_1/diek2uquu/image/upload', {
                    method: 'POST',
                    body: formData,
                });

                const data = await res.json();
                if (data.secure_url) {
                    finalImageUrl = data.secure_url;
                }
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
                id: newRef.id,
                name,
                description,
                price: Number(price),
                image: finalImageUrl,
                isVeg,
                category,
                inStock
            };

            await setDoc(newRef, newItem);
            alert("Item added successfully!");

            // Reset form
            setName('');
            setDescription('');
            setPrice('');
            setFile(null);
            setCategory('');
            setInStock(true);

            fetchItems();
        } catch (error) {
            console.error("Error adding item:", error);
            alert("Failed to add item. Check Firebase connection.");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this item?")) return;
        try {
            await deleteDoc(doc(db, 'menu_items', id));
            fetchItems();
        } catch (error) {
            console.error("Error deleting item:", error);
            alert("Failed to delete item.");
        }
    };

    const toggleStock = async (id: string, currentStatus: boolean | undefined) => {
        try {
            await setDoc(doc(db, 'menu_items', id), { inStock: currentStatus === false ? true : false }, { merge: true });
            fetchItems();
        } catch (error) {
            console.error("Error updating stock status:", error);
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
            alert("Demo data successfully seeded to your database!");
            fetchItems();
        } catch (error) {
            console.error("Error seeding data:", error);
            alert("Failed to seed data. Check console.");
        } finally {
            setIsSeeding(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 text-red-600 animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Loading Dashboard...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-6">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <UtensilsCrossed className="w-6 h-6 text-red-600" />
                            Restaurant Admin Panel
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">Manage your dynamic menu items here.</p>
                    </div>
                    {items.length === 0 && (
                        <button
                            onClick={seedDatabase}
                            disabled={isSeeding}
                            className="bg-red-100 text-red-700 px-4 py-2 rounded-lg font-medium hover:bg-red-200 transition flex items-center gap-2"
                        >
                            {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            Load Demo Data
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Add Item Form  */}
                    <div className="md:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
                        <h2 className="text-lg font-bold mb-4">Add Menu Item</h2>
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
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={e => setFile(e.target.files?.[0] || null)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-red-100 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                                />
                                {file && <p className="text-xs text-gray-500 mt-1 pl-1">Selected: {file.name}</p>}
                            </div>
                            <div className="flex items-center gap-6 pt-2">
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="isVeg" checked={isVeg} onChange={e => setIsVeg(e.target.checked)} className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500" />
                                    <label htmlFor="isVeg" className="text-sm font-medium text-gray-700">Vegetarian Item</label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="inStock" checked={inStock} onChange={e => setInStock(e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                                    <label htmlFor="inStock" className="text-sm font-medium text-gray-700">In Stock</label>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isUploading}
                                className={`w-full mt-4 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 ${isUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
                            >
                                {isUploading ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> Uploading Image...</>
                                ) : (
                                    <><Plus className="w-5 h-5" /> Add to Menu</>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Items List */}
                    <div className="md:col-span-2 space-y-4">
                        <h2 className="text-lg font-bold mb-4">Current Menu ({items.length})</h2>

                        {items.length === 0 ? (
                            <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-gray-300">
                                <p className="text-gray-500">Your menu is currently empty.<br /> Add items using the form or click "Load Demo Data" above.</p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {items.map(item => (
                                    <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4 items-center">
                                        <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded-lg bg-gray-100" />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-lg leading-tight">{item.name}</h3>
                                                <div className={`w-3 h-3 border-2 flex items-center justify-center rounded-sm ${item.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`}></div>
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-500 line-clamp-1">{item.category} • {item.description}</p>
                                            <p className="font-semibold text-red-600 mt-1">₹{item.price}</p>
                                        </div>
                                        <button
                                            onClick={() => toggleStock(item.id, item.inStock)}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${item.inStock !== false ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 ring-1 ring-blue-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 ring-1 ring-gray-300'}`}
                                        >
                                            {item.inStock !== false ? 'In Stock' : 'Out of Stock'}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="p-3 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition ml-2"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
