"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Loader2, UtensilsCrossed, ShieldCheck, Users, Mail, Phone } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

// Declare recaptcha in window scope for TypeScript
declare global {
    interface Window {
        recaptchaVerifier: any;
    }
}

export default function RegisterPage() {
    const router = useRouter();
    const { refreshRole } = useAuth();
    const [role, setRole] = useState<'admin' | 'staff' | null>(null);

    // Email Auth State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Phone Auth State
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const [registerMethod, setRegisterMethod] = useState<'email' | 'phone'>('email');

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // Initialize Recaptcha Verifier once
        if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
            });
        }
    }, []);

    const handleOAuthRegister = async (user: any) => {
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (!docSnap.exists()) {
            await setDoc(doc(db, 'users', user.uid), {
                email: user.email || user.phoneNumber || 'No Email',
                phone: user.phoneNumber || null,
                role: role,
                createdAt: new Date()
            });
        }

        await refreshRole();

        if (docSnap.exists() && docSnap.data().role === 'admin') {
            router.push('/admin');
        } else if (role === 'admin') {
            router.push('/admin');
        } else {
            router.push('/staff');
        }
    };

    const handleEmailRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await setDoc(doc(db, 'users', user.uid), {
                email: user.email,
                role: role,
                createdAt: new Date()
            });

            await refreshRole();

            if (role === 'admin') router.push('/admin');
            else router.push('/staff');
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/configuration-not-found') {
                setError("Authentication is not enabled. Please enable Email/Password provider in the Firebase Console.");
            } else if (err.code === 'auth/email-already-in-use') {
                setError("Email is already registered. Please sign in.");
            } else {
                setError(err.message || 'Failed to create account.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleRegister = async () => {
        setIsLoading(true);
        setError('');
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            await handleOAuthRegister(result.user);
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/configuration-not-found') {
                setError("Google Sign-In is not enabled. Please enable it in the Firebase Console.");
            } else if (err.code !== 'auth/popup-closed-by-user') {
                setError("Google Registration failed.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!phoneNumber) return setError("Please enter a phone number");

        setIsLoading(true);
        setError('');
        try {
            // Format phone number (assuming India +91 if no country code provided, adjust as needed)
            const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;

            const appVerifier = window.recaptchaVerifier;
            const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
            setConfirmationResult(confirmation);
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/configuration-not-found') {
                setError("Phone Auth is not enabled. Please enable it in the Firebase Console.");
            } else {
                setError("Failed to send OTP. Ensure phone number includes country code (e.g. +91).");
            }
            // Reset recaptcha on error
            if (window.recaptchaVerifier) window.recaptchaVerifier.render().then((id: any) => window.recaptchaVerifier.reset(id));
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp || !confirmationResult) return;

        setIsLoading(true);
        setError('');
        try {
            const result = await confirmationResult.confirm(otp);
            await handleOAuthRegister(result.user);
        } catch (err: any) {
            console.error(err);
            setError("Invalid OTP. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl shadow-red-900/5 border border-gray-100">
            <div id="recaptcha-container"></div>

            <div className="flex flex-col items-center mb-6">
                <div className="bg-red-50 p-3 rounded-full mb-4">
                    <UtensilsCrossed className="w-8 h-8 text-red-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Create an Account</h1>
                <p className="text-sm text-gray-500 mt-1">Join the Restro Management Team</p>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 border border-red-100 font-medium">
                    {error}
                </div>
            )}

            <div className="mb-6">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">1. Select Your Role</label>
                <div className="grid grid-cols-2 gap-3" suppressHydrationWarning>
                    <button
                        type="button"
                        suppressHydrationWarning
                        onClick={() => setRole('staff')}
                        className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${role === 'staff' ? 'bg-red-50 border-red-200 text-red-700 ring-2 ring-red-500/20' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                    >
                        <Users className="w-5 h-5" />
                        <span className="text-sm font-bold" suppressHydrationWarning>Staff</span>
                    </button>
                    <button
                        type="button"
                        suppressHydrationWarning
                        onClick={() => setRole('admin')}
                        className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${role === 'admin' ? 'bg-red-50 border-red-200 text-red-700 ring-2 ring-red-500/20' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                    >
                        <ShieldCheck className="w-5 h-5" />
                        <span className="text-sm font-bold" suppressHydrationWarning>Admin</span>
                    </button>
                </div>
                {role === null && <p className="text-xs text-red-500 mt-2 font-medium">Please select a role to continue.</p>}
            </div>

            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">2. Registration Method</label>
            <button
                onClick={handleGoogleRegister} disabled={isLoading || !role}
                className="w-full mb-6 flex justify-center items-center gap-2 border border-gray-200 hover:bg-gray-50 rounded-xl py-3 font-bold text-sm text-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                Sign up with Google
            </button>

            <div className="relative flex items-center mb-6">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-medium uppercase">Or use Email / Phone</span>
                <div className="flex-grow border-t border-gray-200"></div>
            </div>

            {/* Register Method Toggle */}
            <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
                <button
                    onClick={() => { setRegisterMethod('email'); setError(''); }}
                    className={`flex-1 flex justify-center items-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${registerMethod === 'email' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Mail className="w-4 h-4" /> Email
                </button>
                <button
                    onClick={() => { setRegisterMethod('phone'); setError(''); }}
                    className={`flex-1 flex justify-center items-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${registerMethod === 'phone' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Phone className="w-4 h-4" /> Phone
                </button>
            </div>

            {registerMethod === 'email' ? (
                <form onSubmit={handleEmailRegister} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Email Address</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium"
                            placeholder="name@restaurant.com"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Password</label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium"
                            placeholder="Min. 6 characters"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || !role}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 mt-2 shadow-md shadow-red-600/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Register Email'}
                    </button>
                </form>
            ) : (
                <div className="space-y-4">
                    {!confirmationResult ? (
                        <form onSubmit={handleSendOTP} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Phone Number</label>
                                <input
                                    type="tel"
                                    required
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium tracking-wide"
                                    placeholder="+91 99999 99999"
                                />
                                <p className="text-[10px] text-gray-500 mt-1">Include country code (e.g. +91)</p>
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading || !role}
                                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send OTP Code'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOTP} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5 flex justify-between">
                                    <span>Enter 6-Digit OTP</span>
                                    <button
                                        type="button"
                                        onClick={() => { setConfirmationResult(null); setOtp(''); }}
                                        className="text-red-600 hover:underline"
                                    >
                                        Change Number
                                    </button>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-center text-xl tracking-[0.5em] outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-mono font-bold"
                                    placeholder="••••••"
                                    maxLength={6}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading || otp.length !== 6 || !role}
                                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-red-600/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Register'}
                            </button>
                        </form>
                    )}
                </div>
            )}

            <div className="mt-8 text-center text-sm font-medium text-gray-500">
                Already have an account?{' '}
                <Link href="/login" className="text-red-600 hover:text-red-700 hover:underline">
                    Sign in here
                </Link>
            </div>
        </div>
    );
}
