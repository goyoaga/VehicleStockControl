
import React, { useState } from 'react';
import { authService } from '../services/authService';
import { User } from '../types';
import { CarIcon, Spinner } from './Icons';

interface LoginScreenProps {
    onLoginSuccess: (user: User) => void;
    onNavigateToRegister: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onNavigateToRegister }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            setError("Please enter both email and password.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const user = await authService.login(email, password);
            onLoginSuccess(user);
        } catch (err: any) {
            setError(err.message || "Login failed. Please check your credentials.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <CarIcon className="w-16 h-16 text-primary-500 mx-auto mb-4" />
                    <h1 className="text-3xl font-bold text-white">Vehicle Stock Control</h1>
                    <p className="text-gray-400 mt-2">Please sign in to continue</p>
                </div>

                <div className="bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700">
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                                Email Address
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                                placeholder="name@company.com"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        {error && (
                            <div className="bg-red-500/20 border border-red-500/50 text-red-300 p-3 rounded-lg text-sm text-center">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-600 disabled:cursor-not-allowed flex justify-center items-center"
                        >
                            {isLoading ? <Spinner className="w-5 h-5 text-white" /> : 'Sign In'}
                        </button>
                    </form>

                    <div className="mt-6 p-4 bg-gray-900/50 rounded-lg text-sm text-gray-400 border border-gray-700/50">
                        <p className="font-semibold text-gray-300 mb-2">Demo Credentials:</p>
                        <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">
                            <span>Admin:</span>
                            <span className="font-mono text-primary-400">admin@admin.com / admin</span>
                            <span>Agent:</span>
                            <span className="font-mono text-primary-400">agent@agent.com / agent</span>
                        </div>
                    </div>

                    <div className="mt-6 text-center">
                        <p className="text-gray-400">
                            New Agent?{' '}
                            <button onClick={onNavigateToRegister} className="text-primary-400 hover:text-primary-300 font-semibold transition-colors">
                                Redeem Invite Code
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;
