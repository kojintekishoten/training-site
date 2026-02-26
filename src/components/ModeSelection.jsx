import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ModeSelection() {
    const navigate = useNavigate();
    const { currentUser, logout } = useAuth();
    const learnerName = localStorage.getItem('learnerName');

    // Default to 'practice' and 'all'
    const [selectedMode, setSelectedMode] = useState('practice');
    const [questionCount, setQuestionCount] = useState('all');

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleStart = () => {
        let finalCount = questionCount;
        if (selectedMode === 'test') {
            finalCount = 50; // Forced 50 for test mode
        }

        // Save selected mode and count to local storage to be read by the Quiz component
        localStorage.setItem('quizMode', selectedMode);
        localStorage.setItem('quizCount', finalCount.toString());

        navigate('/quiz');
    };

    if (!learnerName) {
        navigate('/name');
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <nav className="bg-white shadow-sm border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Training Portal</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-500">
                                受講者: <span className="font-semibold text-gray-900">{learnerName}</span>
                            </span>
                            <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
                                ログアウト
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl w-full">
                    <div>
                        <h2 className="text-center text-3xl font-extrabold text-gray-900">
                            モード選択
                        </h2>
                        <p className="mt-2 text-center text-sm text-gray-600">
                            学習の形式と問題数を選んでください
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-4">
                            <button
                                onClick={() => setSelectedMode('practice')}
                                className={`w-full flex items-center justify-between px-6 py-4 border-2 rounded-xl text-left focus:outline-none transition-all duration-200 ${selectedMode === 'practice'
                                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                        : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'
                                    }`}
                            >
                                <div>
                                    <span className={`block font-bold text-lg ${selectedMode === 'practice' ? 'text-blue-900' : 'text-gray-900'}`}>
                                        練習モード
                                    </span>
                                    <span className={`block text-sm mt-1 ${selectedMode === 'practice' ? 'text-blue-700' : 'text-gray-500'}`}>
                                        好きな問題数を選んでランダムに解答します。解説も確認できます。
                                    </span>
                                </div>
                                <div className={`flex-shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedMode === 'practice' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                                    {selectedMode === 'practice' && <div className="h-2.5 w-2.5 rounded-full bg-white" />}
                                </div>
                            </button>

                            <button
                                onClick={() => setSelectedMode('test')}
                                className={`w-full flex items-center justify-between px-6 py-4 border-2 rounded-xl text-left focus:outline-none transition-all duration-200 ${selectedMode === 'test'
                                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                        : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'
                                    }`}
                            >
                                <div>
                                    <span className={`block font-bold text-lg ${selectedMode === 'test' ? 'text-blue-900' : 'text-gray-900'}`}>
                                        テストモード
                                    </span>
                                    <span className={`block text-sm mt-1 ${selectedMode === 'test' ? 'text-blue-700' : 'text-gray-500'}`}>
                                        ランダムで50問出題されます。（本番形式）
                                    </span>
                                </div>
                                <div className={`flex-shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedMode === 'test' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                                    {selectedMode === 'test' && <div className="h-2.5 w-2.5 rounded-full bg-white" />}
                                </div>
                            </button>
                        </div>

                        {/* 問題数の選択 (練習モードのみ表示) */}
                        {selectedMode === 'practice' && (
                            <div className="pt-4 border-t border-gray-100 animate-fade-in-down">
                                <label className="block text-sm font-semibold text-gray-700 mb-3">
                                    出題数を選択
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {[
                                        { value: 5, label: '5問' },
                                        { value: 10, label: '10問' },
                                        { value: 20, label: '20問' },
                                        { value: 50, label: '50問' },
                                        { value: 100, label: '100問' },
                                        { value: 'all', label: '全て' }
                                    ].map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setQuestionCount(opt.value)}
                                            className={`py-2 px-3 border rounded-lg text-sm font-medium transition-colors ${questionCount === opt.value
                                                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="pt-6">
                            <button
                                onClick={handleStart}
                                className="w-full flex justify-center py-4 px-4 border border-transparent text-lg font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-md transition-all transform hover:-translate-y-0.5"
                            >
                                スタート ➔
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
