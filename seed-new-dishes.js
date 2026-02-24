import { initializeApp } from 'firebase/app';
import { initializeFirestore, doc, setDoc } from 'firebase/firestore';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, { experimentalForceLongPolling: true });

const newDishes = [
    { id: 'new_1', category: 'Starters', name: 'Paneer Tikka', isVeg: true, price: 250, description: 'Indian > North > Tandoor > Dry. Cottage cheese marinated in yogurt and spices, roasted in tandoor.', image: 'https://images.unsplash.com/photo-1599487405256-11f845014bd7?w=300&q=80', inStock: true },
    { id: 'new_2', category: 'Starters', name: 'Chicken Malai Tikka', isVeg: false, price: 320, description: 'Indian > Mughlai > Tandoor > Creamy', image: 'https://images.unsplash.com/photo-1599487405256-11f845014bd7?w=300&q=80', inStock: true },
    { id: 'new_3', category: 'Starters', name: 'Corn & Cheese Balls', isVeg: true, price: 220, description: 'Continental > Fried > Finger Food', image: 'https://images.unsplash.com/photo-1599487405256-11f845014bd7?w=300&q=80', inStock: true },
    { id: 'new_4', category: 'Starters', name: 'Mutton Seekh Kebab', isVeg: false, price: 380, description: 'Indian > Awadhi > Minced > Spicy', image: 'https://images.unsplash.com/photo-1599487405256-11f845014bd7?w=300&q=80', inStock: true },
    { id: 'new_5', category: 'Starters', name: 'Crispy Chilli Babycorn', isVeg: true, price: 210, description: 'Asian > Chinese > Wok Tossed > Spicy', image: 'https://images.unsplash.com/photo-1599487405256-11f845014bd7?w=300&q=80', inStock: true },
    { id: 'new_6', category: 'Starters', name: 'Fish Amritsari', isVeg: false, price: 350, description: 'Indian > Punjabi > Deep Fried > Batter', image: 'https://images.unsplash.com/photo-1599487405256-11f845014bd7?w=300&q=80', inStock: true },
    { id: 'new_7', category: 'Starters', name: 'Bruschetta', isVeg: true, price: 190, description: 'Italian > Antipasto > Baked > Cold', image: 'https://images.unsplash.com/photo-1599487405256-11f845014bd7?w=300&q=80', inStock: true },
    { id: 'new_8', category: 'Mains', name: 'Butter Chicken', isVeg: false, price: 400, description: 'Indian > North > Curry > Tomato Base', image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=300&q=80', inStock: true },
    { id: 'new_9', category: 'Mains', name: 'Dal Makhani', isVeg: true, price: 280, description: 'Indian > Punjabi > Lentil > Creamy', image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=300&q=80', inStock: true },
    { id: 'new_10', category: 'Mains', name: 'Rogan Josh', isVeg: false, price: 450, description: 'Indian > Kashmiri > Curry > Lamb', image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=300&q=80', inStock: true },
    { id: 'new_11', category: 'Mains', name: 'Paneer Butter Masala', isVeg: true, price: 290, description: 'Indian > North > Curry > Mild', image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc0?w=300&q=80', inStock: true },
    { id: 'new_12', category: 'Mains', name: 'Thai Green Curry (Chicken)', isVeg: false, price: 420, description: 'Asian > Thai > Curry > Coconut Base', image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=300&q=80', inStock: true },
    { id: 'new_13', category: 'Mains', name: 'Vegetable Manchurian', isVeg: true, price: 260, description: 'Asian > Indo-Chinese > Gravy > Soy Base', image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc0?w=300&q=80', inStock: true },
    { id: 'new_14', category: 'Mains', name: 'Grilled Fish w/ Lemon Butter', isVeg: false, price: 480, description: 'Continental > French > Grilled > Low Carb', image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=300&q=80', inStock: true },
    { id: 'new_15', category: 'Mains', name: 'Malai Kofta', isVeg: true, price: 300, description: 'Indian > Mughlai > Dumpling > Sweet/Savory', image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc0?w=300&q=80', inStock: true },
    { id: 'new_16', category: 'Rice/Breads', name: 'Chicken Biryani', isVeg: false, price: 350, description: 'Indian > Hyderabadi > Rice > Dum', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300&q=80', inStock: true },
    { id: 'new_17', category: 'Rice/Breads', name: 'Jeera Rice', isVeg: true, price: 180, description: 'Indian > North > Rice > Tempered', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300&q=80', inStock: true },
    { id: 'new_18', category: 'Rice/Breads', name: 'Butter Naan', isVeg: true, price: 60, description: 'Indian > Bread > Tandoor > Refined Flour', image: 'https://images.unsplash.com/photo-1626245009115-f55ee0eeef03?w=300&q=80', inStock: true },
    { id: 'new_19', category: 'Rice/Breads', name: 'Tandoori Roti', isVeg: true, price: 40, description: 'Indian > Bread > Tandoor > Whole Wheat', image: 'https://images.unsplash.com/photo-1626245009115-f55ee0eeef03?w=300&q=80', inStock: true },
    { id: 'new_20', category: 'Rice/Breads', name: 'Hakka Noodles', isVeg: true, price: 220, description: 'Asian > Chinese > Noodle > Wok Tossed', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300&q=80', inStock: true },
    { id: 'new_21', category: 'Pasta', name: 'Penne Alfredo', isVeg: true, price: 310, description: 'Italian > Pasta > White Sauce > Cheese', image: 'https://images.unsplash.com/photo-1621996316585-ea0eb951231f?w=300&q=80', inStock: true },
    { id: 'new_22', category: 'Pasta', name: 'Spaghetti Bolognese', isVeg: false, price: 360, description: 'Italian > Pasta > Meat Sauce > Minced', image: 'https://images.unsplash.com/photo-1621996316585-ea0eb951231f?w=300&q=80', inStock: true },
    { id: 'new_23', category: 'Dessert', name: 'Gulab Jamun', isVeg: true, price: 120, description: 'Indian > Mithai > Fried > Syrup', image: 'https://images.unsplash.com/photo-1551024601-bd08d7ef28d8?w=300&q=80', inStock: true },
    { id: 'new_24', category: 'Dessert', name: 'Sizzling Brownie', isVeg: true, price: 200, description: 'Global > Bakery > Baked > Chocolate', image: 'https://images.unsplash.com/photo-1551024601-bd08d7ef28d8?w=300&q=80', inStock: true },
    { id: 'new_25', category: 'Dessert', name: 'Fruit Salad with Cream', isVeg: true, price: 150, description: 'Global > Healthy > Raw > Cold', image: 'https://images.unsplash.com/photo-1551024601-bd08d7ef28d8?w=300&q=80', inStock: true }
];

async function seedDatabase() {
    console.log('Seeding 25 new menu items to Firestore...');
    for (const item of newDishes) {
        try {
            const docRef = doc(db, 'menu_items', item.id);
            await setDoc(docRef, item);
            console.log(`Successfully added: ${item.name}`);
        } catch (error) {
            console.error(`Failed to add: ${item.name}`, error);
        }
    }
    console.log('Seeding complete! Admin panel will now show new dishes.');
    process.exit(0);
}

seedDatabase();
