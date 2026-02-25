import Link from 'next/link';
import { ShieldCheck, Users } from 'lucide-react';

export default function LoginSelectPage() {
    return (
        <div className="w-full max-w-[360px] bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col items-center">
            <h1 className="text-2xl font-extrabold text-gray-900 mb-2 mt-2">Restro Menu</h1>
            <p className="text-xs text-gray-500 mb-8 font-medium uppercase tracking-wider">Select your workspace</p>

            <div className="w-full space-y-3">
                <Link href="/login/staff" className="flex items-center gap-4 p-4 border border-gray-100/80 rounded-2xl hover:border-gray-300 hover:shadow-sm transition-all bg-gray-50/50 hover:bg-white group">
                    <div className="bg-white group-hover:bg-gray-900 shadow-sm border border-gray-100 p-2.5 rounded-xl transition-colors text-gray-700 group-hover:text-white">
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="font-bold text-gray-900 text-sm">Staff Portal</h2>
                        <p className="text-[11px] text-gray-500 font-medium mt-0.5">Manage active orders</p>
                    </div>
                </Link>

                <Link href="/login/admin" className="flex items-center gap-4 p-4 border border-gray-100/80 rounded-2xl hover:border-gray-300 hover:shadow-sm transition-all bg-gray-50/50 hover:bg-white group">
                    <div className="bg-white group-hover:bg-red-600 shadow-sm border border-gray-100 p-2.5 rounded-xl transition-colors text-gray-700 group-hover:text-white">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="font-bold text-gray-900 text-sm">Admin Portal</h2>
                        <p className="text-[11px] text-gray-500 font-medium mt-0.5">Full system access</p>
                    </div>
                </Link>
            </div>

            <div className="mt-8 mb-2 text-center text-[12px] font-medium text-gray-400">
                Authorized Personnel Only
            </div>
        </div>
    );
}
