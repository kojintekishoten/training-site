import { createContext, useContext, useEffect, useState } from 'react';
import { fetchAuthUsers } from '../services/sheets';

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

    const login = async (userId, password) => {
        const csvUrl = import.meta.env.VITE_GOOGLE_SHEET_AUTH_CSV_URL;
        if (!csvUrl) {
            throw new Error("Auth CSV URL is not configured. (VITE_GOOGLE_SHEET_AUTH_CSV_URL)");
        }

        const users = await fetchAuthUsers(csvUrl);
        const validUser = users.find(u => u.userId === userId && u.password === password);

        if (validUser) {
            const userData = { uid: validUser.userId, email: validUser.userId }; // Map userId to existing Firebase fields for compatibility
            setCurrentUser(userData);
            localStorage.setItem('currentUser', JSON.stringify(userData));
            return userData;
        } else {
            throw new Error("Invalid User ID or Password");
        }
    };

    const logout = () => {
        setCurrentUser(null);
        localStorage.removeItem('currentUser');
        localStorage.removeItem('learnerName');
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
