"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Loader2, Users, Phone, Mail } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

function StaffLoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Phone Auth State
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');

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

    const handleRoleRedirect = async (user: any) => {
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (docSnap.exists()) {
            const role = docSnap.data().role;
            if (role === 'admin') router.push('/admin');
            else if (role === 'staff') router.push('/staff');
            else router.push('/'); // Fallback
        } else {
            // New OAuth/Phone Users default to Staff
            await setDoc(doc(db, 'users', user.uid), {
                email: user.email || user.phoneNumber || 'No Email',
                phone: user.phoneNumber || null,
                role: 'staff',
                createdAt: new Date()
            });
            router.push('/staff');
        }
    };

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            await handleRoleRedirect(userCredential.user);
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/configuration-not-found') {
                setError("Authentication is not enabled in Firebase. Please enable Email/Password provider in the Firebase Console.");
            } else {
                setError("Invalid email or password.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setError('');
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            await handleRoleRedirect(result.user);
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/configuration-not-found') {
                setError("Google Sign-In is not enabled. Please enable it in the Firebase Console.");
            } else if (err.code !== 'auth/popup-closed-by-user') {
                setError("Google Sign-In failed.");
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
            await handleRoleRedirect(result.user);
        } catch (err: any) {
            console.error(err);
            setError("Invalid OTP. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-[360px] bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
            <div id="recaptcha-container"></div>

            <div className="flex flex-col items-center mb-6">
                <div className="bg-red-50 p-3 rounded-full mb-4">
                    <Users className="w-8 h-8 text-red-600" />
                </div>
                <h1 className="text-2xl font-extrabold text-gray-900">Staff Portal</h1>
                <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wider">Welcome back</p>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 border border-red-100 font-medium">
                    {error}
                </div>
            )}

            <button
                onClick={handleGoogleLogin} disabled={isLoading}
                className="w-full mb-6 flex justify-center items-center gap-2 border border-gray-200 hover:bg-gray-50 rounded-xl py-3 font-bold text-sm text-gray-700 transition"
            >
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                Continue with Google
            </button>

            <div className="relative flex items-center mb-6">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-medium uppercase">Or sign in with</span>
                <div className="flex-grow border-t border-gray-200"></div>
            </div>

            {/* Login Method Toggle */}
            <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
                <button
                    onClick={() => { setLoginMethod('email'); setError(''); }}
                    className={`flex-1 flex justify-center items-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${loginMethod === 'email' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Mail className="w-4 h-4" /> Email
                </button>
                <button
                    onClick={() => { setLoginMethod('phone'); setError(''); }}
                    className={`flex-1 flex justify-center items-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${loginMethod === 'phone' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Phone className="w-4 h-4" /> Phone
                </button>
            </div>


            {loginMethod === 'email' ? (
                <form onSubmit={handleEmailLogin} className="space-y-4">
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
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 mt-2 shadow-md shadow-red-600/20 active:scale-[0.98]"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Log In via Email'}
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
                                disabled={isLoading}
                                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 shadow-md active:scale-[0.98]"
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
                                disabled={isLoading || otp.length !== 6}
                                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-red-600/20 active:scale-[0.98] disabled:opacity-50"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Log In'}
                            </button>
                        </form>
                    )}
                </div>
            )}

            <div className="mt-8 text-center text-sm font-medium text-gray-500">
                Don't have an account?{' '}
                <Link href="/register" className="text-red-600 hover:text-red-700 hover:underline">
                    Register here
                </Link>
            </div>
        </div>
    );
}

export default function StaffLoginPage() {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center w-full max-w-[360px] h-96 bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
                <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
            </div>
        }>
            <StaffLoginContent />
        </Suspense>
    );
}
