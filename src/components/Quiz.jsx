import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchQuestions } from '../services/sheets';
import { db } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function Quiz() {
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [quizFinished, setQuizFinished] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // New states for immediate feedback
    const [showExplanation, setShowExplanation] = useState(false);
    // This will now be an array to support multiple selections
    const [selectedAnswers, setSelectedAnswers] = useState([]);

    const navigate = useNavigate();
    const { currentUser, logout } = useAuth();
    const learnerName = localStorage.getItem('learnerName');

    useEffect(() => {
        if (!learnerName) {
            navigate('/name');
            return;
        }

        const loadQuestions = async () => {
            try {
                // Read from env map or pass it statically
                const csvUrl = import.meta.env.VITE_GOOGLE_SHEET_CSV_URL;
                if (!csvUrl) {
                    setError('Configuration Error: CSV URL is missing. Please contact the administrator. (Check VITE_GOOGLE_SHEET_CSV_URL in .env)');
                    setLoading(false);
                    return;
                }

                const data = await fetchQuestions(csvUrl);
                let parsedData = data || [];
                if (parsedData.length > 0) {
                    // Randomize questions
                    parsedData = [...parsedData].sort(() => 0.5 - Math.random());

                    const quizMode = localStorage.getItem('quizMode') || 'practice';
                    const quizCountStr = localStorage.getItem('quizCount') || 'all';

                    let limit = parsedData.length;
                    if (quizMode === 'test') {
                        limit = 50;
                    } else if (quizCountStr !== 'all') {
                        limit = parseInt(quizCountStr, 10);
                        if (isNaN(limit)) limit = parsedData.length;
                    }

                    limit = Math.min(limit, parsedData.length);
                    parsedData = parsedData.slice(0, limit);

                    setQuestions(parsedData);
                } else {
                    setError("No questions found in the document.");
                }
            } catch (err) {
                setError('Failed to load questions. Please try again later.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        loadQuestions();
    }, [learnerName, navigate]);

    const currentQuestion = questions[currentIndex];
    const correctOpts = currentQuestion?.correctAnswer?.toString().toUpperCase().split(',').map(s => s.trim()).filter(Boolean) || [];
    const isMultipleChoice = correctOpts.length > 1;

    const handleOptionToggle = (optionLabel) => {
        if (showExplanation) return;

        if (isMultipleChoice) {
            setSelectedAnswers(prev =>
                prev.includes(optionLabel)
                    ? prev.filter(a => a !== optionLabel)
                    : [...prev, optionLabel]
            );
        } else {
            // For single choice, we evaluate immediately
            evaluateAnswers([optionLabel]);
        }
    };

    const handleMultipleSubmit = () => {
        if (showExplanation || selectedAnswers.length === 0) return;
        evaluateAnswers(selectedAnswers);
    };

    const evaluateAnswers = (selected) => {
        setSelectedAnswers(selected);

        // Check if selected answers exactly match correct answers regardless of order
        const isCorrect = selected.length === correctOpts.length &&
            selected.every(val => correctOpts.includes(val));

        if (isCorrect) {
            setScore(prev => prev + 1);
        }

        setShowExplanation(true);
    };

    const handleNext = () => {
        setShowExplanation(false);
        setSelectedAnswers([]);

        if (currentIndex + 1 < questions.length) {
            setCurrentIndex(prev => prev + 1);
        } else {
            finishQuiz(score);
        }
    };

    const finishQuiz = async (finalScore) => {
        setQuizFinished(true);
        setSubmitting(true);

        try {
            const learnerRef = doc(db, 'companies', currentUser.uid, 'learners', learnerName);
            await setDoc(learnerRef, {
                score: finalScore,
                totalQuestions: questions.length,
                completedAt: serverTimestamp(),
                mode: localStorage.getItem('quizMode') || 'practice'
            }, { merge: true });

        } catch (err) {
            console.error("Error saving score:", err);
            setError("Failed to save your score. Please contact support.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
                    <svg className="mx-auto h-12 w-12 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">エラー</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button onClick={() => navigate('/name')} className="text-blue-600 hover:text-blue-800 font-medium">
                        戻る
                    </button>
                </div>
            </div>
        );
    }

    if (quizFinished) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="h-10 w-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-900 mb-2">おつかれさまでした！</h2>
                    <p className="text-lg text-gray-600 mb-6">{learnerName}さんの学習状況を保存しました。</p>

                    <div className="bg-gray-50 rounded-lg p-6 mb-8">
                        <p className="text-sm text-gray-500 uppercase tracking-wide font-semibold mb-1">正解数</p>
                        <div className="text-5xl font-black text-blue-600">
                            {score} <span className="text-2xl text-gray-400">/ {questions.length}</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {submitting ? (
                            <p className="text-gray-500 text-sm flex items-center justify-center">
                                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-2"></span>
                                成績を保存中...
                            </p>
                        ) : (
                            <p className="text-green-600 text-sm font-medium">✓ 成績が正常に保存されました</p>
                        )}
                        <button
                            onClick={() => {
                                localStorage.removeItem('learnerName');
                                navigate('/name');
                            }}
                            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 border-2 transition-all"
                        >
                            ホームに戻る
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const currentQ = questions[currentIndex];

    // Safety check just in case we are in a transition state
    if (!currentQ) return null;

    // The variables correctOpts and isMultipleChoice are already defined above and in scope.
    const isAnswerCorrect = selectedAnswers.length === correctOpts.length && selectedAnswers.every(val => correctOpts.includes(val));

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <nav className="bg-white shadow-sm border-b border-gray-100">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
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
                <div className="max-w-2xl w-full">

                    {/* Progress Bar */}
                    <div className="mb-8">
                        <div className="flex justify-between text-sm font-medium text-gray-500 mb-2">
                            <span>問題 {currentIndex + 1} / {questions.length}</span>
                            <span>{Math.round(((currentIndex) / questions.length) * 100)}% 完了</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                            <div
                                className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${((currentIndex) / questions.length) * 100}%` }}
                            ></div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                        <div className="p-8 sm:p-10">

                            <h3 className="text-2xl font-bold text-gray-900 mb-8 leading-relaxed whitespace-pre-wrap">
                                {currentQ.question}
                            </h3>

                            {currentQ.imageUrl && (
                                <div className="mb-8 flex justify-center">
                                    <img
                                        src={currentQ.imageUrl}
                                        alt="問題の参考画像"
                                        className="max-h-80 rounded-xl shadow-md border border-gray-200 max-w-full object-contain"
                                    />
                                </div>
                            )}

                            {isMultipleChoice && (
                                <p className="text-sm font-semibold text-blue-600 mb-4 bg-blue-50 inline-block px-3 py-1 rounded-full">
                                    ※複数選択の問題です。該当するものをすべて選んで「回答する」を押してください。
                                </p>
                            )}

                            <div className="space-y-4">
                                {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((optionLabel) => {
                                    const optionText = currentQ[`option${optionLabel}`];
                                    if (!optionText || !optionText.trim()) return null;

                                    const isCorrect = correctOpts.includes(optionLabel);
                                    const isSelected = selectedAnswers.includes(optionLabel);

                                    let buttonClass = "w-full text-left p-5 border-2 rounded-xl transition-all duration-200 group relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ";

                                    if (!showExplanation) {
                                        if (isSelected) {
                                            buttonClass += "border-blue-500 bg-blue-50";
                                        } else {
                                            buttonClass += "border-gray-100 hover:border-blue-400 hover:bg-blue-50 bg-white";
                                        }
                                    } else {
                                        if (isCorrect) {
                                            buttonClass += "border-green-500 bg-green-50";
                                            if (isSelected) buttonClass += " ring-2 ring-green-300"; // Highlight if they selected the correct one
                                        } else if (isSelected && !isCorrect) {
                                            buttonClass += "border-red-500 bg-red-50";
                                        } else {
                                            buttonClass += "border-gray-100 opacity-60 bg-white";
                                        }
                                    }

                                    return (
                                        <button
                                            key={optionLabel}
                                            onClick={() => handleOptionToggle(optionLabel)}
                                            disabled={showExplanation}
                                            className={buttonClass}
                                        >
                                            <div className="flex items-center">
                                                <div className="relative mr-4 bg-white">
                                                    {isMultipleChoice ? (
                                                        <div className={`w-6 h-6 border-2 rounded ${showExplanation
                                                            ? (isCorrect ? 'bg-green-500 border-green-500' : (isSelected ? 'bg-red-500 border-red-500' : 'border-gray-300'))
                                                            : (isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300 group-hover:border-blue-400')
                                                            } flex items-center justify-center transition-colors`}>
                                                            {isSelected && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                                                            {showExplanation && isCorrect && !isSelected && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                                                        </div>
                                                    ) : null}
                                                </div>

                                                <span className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full font-bold mr-4 text-sm transition-colors duration-200 ${showExplanation
                                                    ? (isCorrect ? 'bg-green-500 text-white' : (isSelected ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500'))
                                                    : (isSelected ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-800')
                                                    }`}>
                                                    {optionLabel}
                                                </span>
                                                <span className={`font-medium text-lg leading-snug ${showExplanation
                                                    ? (isCorrect ? 'text-green-900' : (isSelected ? 'text-red-900' : 'text-gray-500'))
                                                    : (isSelected ? 'text-blue-900 font-bold' : 'text-gray-700 group-hover:text-blue-900')
                                                    }`}>
                                                    {optionText}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {isMultipleChoice && !showExplanation && (
                                <div className="mt-6">
                                    <button
                                        onClick={handleMultipleSubmit}
                                        disabled={selectedAnswers.length === 0}
                                        className={`w-full py-4 px-4 font-bold text-lg rounded-xl transition-all transform tracking-wide ${selectedAnswers.length > 0
                                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg'
                                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                            }`}
                                    >
                                        回答する
                                    </button>
                                </div>
                            )}

                            {/* Explanation Section */}
                            {showExplanation && (
                                <div className={`mt-8 p-6 rounded-2xl border-2 shadow-inner transition-all duration-500 ${isAnswerCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                    <div className="flex items-center mb-4">
                                        {isAnswerCorrect ? (
                                            <svg className="w-8 h-8 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                        ) : (
                                            <svg className="w-8 h-8 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                        )}
                                        <h4 className={`text-2xl font-black ${isAnswerCorrect ? 'text-green-700' : 'text-red-700'}`}>
                                            {isAnswerCorrect ? '正解！' : '不正解...'}
                                        </h4>
                                    </div>

                                    <p className="text-gray-800 font-medium mb-4 text-lg bg-white bg-opacity-50 p-3 rounded-lg inline-block">
                                        正解は <span className="font-extrabold text-2xl">{correctOpts.join(', ')}</span> です
                                    </p>

                                    {currentQ.explanation && (
                                        <div className="text-gray-700 mt-2 p-5 bg-white rounded-xl shadow-sm border border-gray-100">
                                            <p className="font-bold text-gray-900 mb-2 flex items-center">
                                                <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                                解説
                                            </p>
                                            <p className="whitespace-pre-wrap leading-relaxed">
                                                {currentQ.explanation}
                                            </p>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleNext}
                                        className="mt-6 w-full py-4 px-4 bg-gray-900 text-white font-bold text-lg rounded-xl hover:bg-black hover:shadow-lg transition-all transform tracking-wide"
                                    >
                                        {currentIndex + 1 < questions.length ? '次の問題へ進む ➔' : '結果を見る ➔'}
                                    </button>
                                </div>
                            )}

                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
