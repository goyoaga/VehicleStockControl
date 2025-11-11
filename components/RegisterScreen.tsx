
import React, { useState } from 'react';
import { authService } from '../services/authService';
import { User } from '../types';
import { CarIcon, Spinner } from './Icons';

interface RegisterScreenProps {
    onRegisterSuccess: (user: User) => void;
    onNavigateToLogin: () => void;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ onRegisterSuccess, onNavigateToLogin }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !inviteCode || !name || !password) {
            setError("All fields are required.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const user = await authService.register(email, name, inviteCode, password);
            onRegisterSuccess(user);
        } catch (err: any) {
            setError(err.message || "Registration failed. Check your invite code.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <CarIcon className="w-12 h-12 text-primary-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white">Agent Registration</h1>
                    <p className="text-gray-400 mt-2">Enter your details and invitation code</p>
                </div>

                <div className="bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700">
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-primary-500 focus:border-primary-500 outline-none" required placeholder="John Doe" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Email Address</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-primary-500 focus:border-primary-500 outline-none" required placeholder="john@company.com" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-primary-400 mb-1">Invitation Code</label>
                            <input type="text" value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())} className="w-full bg-gray-900 border-2 border-primary-900/50 rounded-lg p-3 text-white font-mono tracking-widest focus:ring-primary-500 focus:border-primary-500 outline-none uppercase" required placeholder="INV-XXXX" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Set Password</label>
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-primary-500 focus:border-primary-500 outline-none" required placeholder="••••••••" />
                        </div>

                        {error && (
                            <div className="bg-red-500/20 border border-red-500/50 text-red-300 p-3 rounded-lg text-sm text-center">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-lg transition-colors mt-6 flex justify-center"
                        >
                            {isLoading ? <Spinner className="w-5 h-5 text-white" /> : 'Create Account'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button onClick={onNavigateToLogin} className="text-gray-400 hover:text-white text-sm transition-colors">
                            Already have an account? Sign In
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegisterScreen;
