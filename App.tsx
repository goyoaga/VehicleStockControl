
import React, { useState, useEffect } from 'react';
import AgentApp from './AgentApp';
import LoginScreen from './components/LoginScreen';
import RegisterScreen from './components/RegisterScreen';
import AdminDashboard from './components/AdminDashboard';
import { User } from './types';
import { authService } from './services/authService';
import { Spinner } from './components/Icons';

type AuthScreen = 'login' | 'register';

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [authScreen, setAuthScreen] = useState<AuthScreen>('login');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check for existing session on load
        const user = authService.getCurrentUser();
        if (user) {
            setCurrentUser(user);
        }
        setIsLoading(false);
    }, []);

    const handleLoginSuccess = (user: User) => {
        setCurrentUser(user);
    };

    const handleLogout = async () => {
        await authService.logout();
        setCurrentUser(null);
        setAuthScreen('login');
    };

    if (isLoading) {
        return <div className="h-screen flex items-center justify-center bg-gray-900 text-white"><Spinner className="w-10 h-10"/></div>;
    }

    if (!currentUser) {
        if (authScreen === 'register') {
            return <RegisterScreen onRegisterSuccess={handleLoginSuccess} onNavigateToLogin={() => setAuthScreen('login')} />;
        }
        return <LoginScreen onLoginSuccess={handleLoginSuccess} onNavigateToRegister={() => setAuthScreen('register')} />;
    }

    if (currentUser.role === 'admin') {
        return <AdminDashboard currentUser={currentUser} onLogout={handleLogout} />;
    }

    return <AgentApp currentUser={currentUser} onLogout={handleLogout} />;
};

export default App;
