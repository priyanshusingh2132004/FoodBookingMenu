'use client';

import { useRouter } from 'next/navigation';
import { UtensilsCrossed, QrCode, ShieldCheck, Users } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-red-950 text-white font-sans flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="bg-red-600/20 p-5 rounded-full mb-6 ring-4 ring-red-500/10">
          <UtensilsCrossed className="w-12 h-12 text-red-400" />
        </div>

        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
          Restro Menu Book
        </h1>
        <p className="text-gray-400 text-lg max-w-md mb-10 leading-relaxed">
          Scan. Order. Track. <br />
          The smartest QR-based restaurant ordering system.
        </p>

        {/* Quick Actions */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
          <button
            onClick={() => router.push('/menu?table=Takeaway')}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-2xl transition flex items-center justify-center gap-2 text-lg shadow-lg shadow-red-900/30"
          >
            <QrCode className="w-5 h-5" />
            Browse Menu
          </button>
        </div>

        {/* Portal Links */}
        <div className="mt-12 flex gap-6">
          <button
            onClick={() => router.push('/login/admin')}
            className="flex items-center gap-2 text-gray-500 hover:text-red-400 transition text-sm font-medium"
          >
            <ShieldCheck className="w-4 h-4" />
            Admin Portal
          </button>
          <button
            onClick={() => router.push('/login/staff')}
            className="flex items-center gap-2 text-gray-500 hover:text-blue-400 transition text-sm font-medium"
          >
            <Users className="w-4 h-4" />
            Staff Portal
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="py-6 text-center text-gray-600 text-xs">
        © {new Date().getFullYear()} Restro Menu Book • QR Menu System
      </div>
    </div>
  );
}
