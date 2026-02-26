import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
    const [learners, setLearners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchLearners = async () => {
            try {
                const learnersRef = collection(db, 'companies', currentUser.uid, 'learners');
                const q = query(learnersRef, orderBy('completedAt', 'desc'));
                const querySnapshot = await getDocs(q);

                const learnersData = [];
                querySnapshot.forEach((doc) => {
                    learnersData.push({ id: doc.id, ...doc.data() });
                });

                setLearners(learnersData);
            } catch (err) {
                console.error("Error fetching learners:", err);
                setError("Failed to load learning progress.");
            } finally {
                setLoading(false);
            }
        };

        if (currentUser) {
            fetchLearners();
        }
    }, [currentUser]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <nav className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <h1 className="text-xl font-bold text-gray-900">Training Dashboard</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-500 hidden sm:block">
                                Company: <span className="font-semibold text-gray-900">{currentUser?.email}</span>
                            </span>
                            <button
                                onClick={() => navigate('/name')}
                                className="text-sm font-medium text-blue-600 hover:text-blue-800"
                            >
                                Go to Training Portal
                            </button>
                            <button
                                onClick={handleLogout}
                                className="text-sm text-gray-500 hover:text-gray-900"
                            >
                                Sign out
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
                <div className="sm:flex sm:items-center mb-8">
                    <div className="sm:flex-auto">
                        <h2 className="text-2xl font-bold text-gray-900">Learner Progress</h2>
                        <p className="mt-2 text-sm text-gray-600">
                            A list of all learners who have completed the training across your company.
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                <div className="bg-white rounded-xl shadow ring-1 ring-black ring-opacity-5 overflow-hidden">
                    {loading ? (
                        <div className="p-12 flex justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : learners.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            <p>No learners have completed the training yet.</p>
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-300">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                                        Learner Name
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                        Score
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                        Completion Date
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {learners.map((learner) => (
                                    <tr key={learner.id} className="hover:bg-gray-50">
                                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                            {learner.id}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${learner.score === learner.totalQuestions
                                                ? 'bg-green-100 text-green-800'
                                                : learner.score >= learner.totalQuestions * 0.7
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {learner.score} / {learner.totalQuestions}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                            {learner.completedAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>
        </div>
    );
}
