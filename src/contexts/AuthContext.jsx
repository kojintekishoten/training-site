import { createContext, useContext, useEffect, useState } from 'react';
import { fetchAuthUsers } from '../services/sheets';
import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

const AuthContext = createContext({ currentUser: null, loading: true, login: async () => { }, logout: () => { } });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Hydrate from localStorage
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try {
                setCurrentUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse cached user", e);
            }
        }
        setLoading(false);
    }, []);

    // Heartbeat mechanism to keep session alive
    useEffect(() => {
        if (!currentUser) return;
        const sessionId = localStorage.getItem('sessionId');
        if (!sessionId) return;

        const updateActivity = async () => {
            try {
                const sessionRef = doc(db, 'companies', currentUser.uid, 'session', 'active');
                const sessionSnap = await getDoc(sessionRef);

                if (sessionSnap.exists() && sessionSnap.data().sessionId === sessionId) {
                    // Update heartbeat
                    await updateDoc(sessionRef, { lastActive: serverTimestamp() });
                } else if (sessionSnap.exists() && sessionSnap.data().sessionId !== sessionId) {
                    // This session is no longer the active one (maybe forcibly overridden?)
                    console.warn("Session expired or overridden. Logging out.");
                    logout();
                }
            } catch (e) {
                console.error("Heartbeat update failed", e);
            }
        };

        // Do initial heartbeat, then every 2 minutes
        updateActivity();
        const interval = setInterval(updateActivity, 2 * 60 * 1000);

        return () => clearInterval(interval);
    }, [currentUser]);

    const login = async (userId, password) => {
        const csvUrl = import.meta.env.VITE_GOOGLE_SHEET_AUTH_CSV_URL;
        if (!csvUrl) {
            throw new Error("Auth CSV URL is not configured. (VITE_GOOGLE_SHEET_AUTH_CSV_URL)");
        }

        const users = await fetchAuthUsers(csvUrl);
        const validUser = users.find(u => u.userId === userId && u.password === password);

        if (validUser) {
            const userData = { uid: validUser.userId, email: validUser.userId }; // Map userId to existing Firebase fields for compatibility

            // Check for existing active session
            const sessionRef = doc(db, 'companies', userData.uid, 'session', 'active');
            const sessionSnap = await getDoc(sessionRef);

            if (sessionSnap.exists()) {
                const data = sessionSnap.data();
                // Firestore timestamp to JS Date, then millis
                const lastActive = data.lastActive?.toMillis() || 0;
                const now = Date.now();

                // If last active was within 3 minutes (180000ms), we consider it still "online"
                if (now - lastActive < 3 * 60 * 1000) {
                    throw new Error("別端末またはブラウザですでにログイン中です。前の画面を閉じてから約3分後にお試しください。");
                }
            }

            // Create new session
            const newSessionId = crypto.randomUUID();
            await setDoc(sessionRef, {
                sessionId: newSessionId,
                lastActive: serverTimestamp()
            });

            localStorage.setItem('sessionId', newSessionId);

            setCurrentUser(userData);
            localStorage.setItem('currentUser', JSON.stringify(userData));
            return userData;
        } else {
            throw new Error("ユーザーIDまたはパスワードが間違っています。");
        }
    };

    const logout = async () => {
        if (currentUser) {
            try {
                const sessionId = localStorage.getItem('sessionId');
                const sessionRef = doc(db, 'companies', currentUser.uid, 'session', 'active');
                const sessionSnap = await getDoc(sessionRef);

                // Only delete if we are the ones owning the active session
                if (sessionSnap.exists() && sessionSnap.data().sessionId === sessionId) {
                    await deleteDoc(sessionRef);
                }
            } catch (e) {
                console.error("Logout cleanup failed", e);
            }
        }

        setCurrentUser(null);
        localStorage.removeItem('currentUser');
        localStorage.removeItem('learnerName');
        localStorage.removeItem('sessionId');
    };

    const value = {
        currentUser,
        loading,
        login,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
