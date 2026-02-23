# 🍽️ Restro Menu Book (SaaS)

A modern, dynamic Kitchen Display System (KDS) and QR-code Dine-in Ordering platform built for restaurants.

This full-stack SaaS application replaces paper menus with a beautiful digital storefront and replaces paper order tickets with a real-time digital Kitchen Display System. 

Restaurant owners can fully customize their catalog using a secured Admin panel, meaning **zero code changes are required** to onboard a new restaurant.

## ✨ Features

### 📱 1. Customer Frontend (`/menu`)
- **QR Code Ready**: Designed to be scanned directly from a table (e.g., `?table=12`).
- **Dynamic Catalog**: Menu items are fetched live from the database.
- **Cart & Total Calculation**: Users can add, remove, and review items before placing an order.
- **Cooking Instructions**: Dedicated field for customers to leave allergy notes or spice preferences.

### 👨‍🍳 2. Kitchen Display System (`/kds`)
- **Real-time Sync**: Orders appear instantly on the chef's screen via Firebase `onSnapshot`.
- **Multi-stage Pipeline**: 
  - 🟡 **START PREPARING**: Acknowledges the order.
  - 🔵 **FOOD READY**: Signals to the waitstaff that the food is plated.
  - 🟢 **MARK AS SERVED**: Clears the ticket from the active queue.
- **Live Timers**: Tracks exactly how many minutes ago an order was placed.

### ⚙️ 3. Owner Admin Panel (`/admin`)
- **Zero-Code Management**: Restaurant owners can add menus, update prices, and upload photos directly from their browser.
- **1-Click Demo Data**: Instantly seed the database with starter items for quick onboarding.

## 🚀 Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Database Backend**: Firebase Firestore (NoSQL, Real-time WebSockets)
- **Deployment**: Vercel (Recommended)

## 🛠️ Local Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/nawab-dhabha.git
   cd nawab-dhabha
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Create a project at [console.firebase.google.com](https://console.firebase.google.com)
   - Enable **Firestore Database** in Test Mode (`allow read, write: if true;`).
   - Copy your Firebase config into a `.env.local` file at the root of the project:
     ```env
     NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
     NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
     NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
     NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
     NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
     NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
     ```

4. **Run the Development Server**
   ```bash
   npm run dev
   ```

5. **Seed the Database**
   - Open `http://localhost:3000/admin` in your browser.
   - Click the red **"Load Demo Data"** button to populate Firestore with the starter menu.

## 📄 License
This project is open-source and available under the MIT License.
