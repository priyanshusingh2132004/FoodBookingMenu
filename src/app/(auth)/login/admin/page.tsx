"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2, ShieldCheck } from 'lucide-react';

export default function AdminLoginPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [uid, setUid] = useState('');

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setError('');
        setUid('');
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            const docSnap = await getDoc(doc(db, 'users', user.uid));
            if (docSnap.exists() && docSnap.data().role === 'admin') {
                router.push('/admin');
            } else {
                await auth.signOut();
                setUid(user.uid);
                setError("Access Denied: Your Google account is not registered as an Administrator.");
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
                    <ShieldCheck className="w-10 h-10 text-red-600" />
                </div>
                <h1 className="text-2xl font-extrabold text-gray-900">Admin Portal</h1>
                <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wider">Sign in to manage your restaurant</p>
            </div>

            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm mb-6 border border-red-100 font-medium text-center space-y-3">
                    <p>{error}</p>
                    {uid && (
                        <div className="bg-white border border-red-200 rounded-lg p-3 text-left">
                            <p className="text-xs text-gray-500 mb-1 font-bold uppercase tracking-wide">Your Google Account UID:</p>
                            <p className="font-mono text-xs text-gray-800 break-all select-all">{uid}</p>
                            <p className="text-xs text-gray-500 mt-2">
                                👆 Copy this UID. Then in{' '}
                                <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-blue-600 underline">Firebase Console</a>
                                {' '}→ Firestore → <strong>users</strong> collection → add a document with this as the ID and set <code>role: "admin"</code>.
                            </p>
                        </div>
                    )}
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
                Only pre-registered admin accounts can sign in.
            </p>
        </div>
    );
}
