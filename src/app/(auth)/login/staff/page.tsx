"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Loader2, Users } from 'lucide-react';

export default function StaffLoginPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setError('');
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            const docRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const role = docSnap.data().role;
                if (role === 'admin') {
                    router.push('/admin');
                } else {
                    router.push('/staff');
                }
            } else {
                // First time: auto-create staff account
                await setDoc(docRef, {
                    email: user.email,
                    name: user.displayName,
                    role: 'staff',
                    createdAt: new Date(),
                });
                router.push('/staff');
            }
        } catch (err: any) {
            console.error(err);
            if (err.code !== 'auth/popup-closed-by-user') {
                setError("Google Sign-In failed. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-[360px] bg-white p-10 rounded-[2rem] shadow-sm border border-gray-100">
            <div className="flex flex-col items-center mb-8">
                <div className="bg-red-50 p-4 rounded-full mb-4">
                    <Users className="w-10 h-10 text-red-600" />
                </div>
                <h1 className="text-2xl font-extrabold text-gray-900">Staff Portal</h1>
                <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wider">Kitchen & floor team access</p>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-6 border border-red-100 font-medium text-center">
                    {error}
                </div>
            )}

            <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-3 border border-gray-200 hover:bg-gray-50 active:scale-[0.98] rounded-xl py-3.5 font-bold text-sm text-gray-700 transition-all shadow-sm disabled:opacity-60"
            >
                {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-red-600" />
                ) : (
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                )}
                {isLoading ? 'Signing in...' : 'Continue with Google'}
            </button>

            <p className="text-center text-xs text-gray-400 mt-6">
                First-time sign in will create your staff account automatically.
            </p>
        </div>
    );
}
