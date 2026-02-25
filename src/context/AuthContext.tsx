"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export type UserRole = 'admin' | 'staff' | null;

interface AuthContextType {
    user: User | null;
    role: UserRole;
    loading: boolean;
    logout: () => Promise<void>;
    refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    role: null,
    loading: true,
    logout: async () => { },
    refreshRole: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<UserRole>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                try {
                    const docSnap = await getDoc(doc(db, 'users', currentUser.uid));
                    if (docSnap.exists()) {
                        setRole(docSnap.data().role as UserRole);
                    } else {
                        setRole(null);
                    }
                } catch (error) {
                    console.error("Error fetching user role:", error);
                    setRole(null);
                }
            } else {
                setRole(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const refreshRole = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const docSnap = await getDoc(doc(db, 'users', user.uid));
            if (docSnap.exists()) {
                setRole(docSnap.data().role as UserRole);
            } else {
                setRole(null);
            }
        } catch (error) {
            console.error("Error refreshing user role:", error);
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        setLoading(true);
        await firebaseSignOut(auth);
        setUser(null);
        setRole(null);
        setLoading(false);
    };

    return (
        <AuthContext.Provider value={{ user, role, loading, logout, refreshRole }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
