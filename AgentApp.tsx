
import React, { useState, useEffect } from 'react';
import VinScanner from './components/VinScanner';
import ImageAnalyzer from './components/ImageAnalyzer';
import VideoAnalyzer from './components/VideoAnalyzer';
import ManualVinInput from './components/ManualVinInput';
import { ScanIcon, ImageIcon, CarIcon, PencilIcon, VideoIcon, LogOutIcon } from './components/Icons';
import { ParkingArea, ScanLog, User, Location } from './types';
import { locationService } from './services/locationService';

type Tab = 'scanner' | 'image' | 'manual' | 'video';

interface AgentAppProps {
    currentUser: User;
    onLogout: () => void;
}

const AgentApp: React.FC<AgentAppProps> = ({ currentUser, onLogout }) => {
  const [activeTab, setActiveTab] = useState<Tab>('scanner');
  const [screen, setScreen] = useState<'welcome' | 'scanning' | 'summary'>('welcome');
  const [parkingArea, setParkingArea] = useState<ParkingArea>('');
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [sessionLogs, setSessionLogs] = useState<ScanLog[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    const fetchLocations = async () => {
        const fetchedLocations = await locationService.getLocations();
        // Only show active locations to agents
        const activeLocations = fetchedLocations.filter(loc => loc.status === 'active' || loc.status === undefined);
        setLocations(activeLocations);
    };
    fetchLocations();
  }, []);

  const generateSessionId = (area: string): string => {
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      const hh = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      const ms = String(now.getMilliseconds()).padStart(3, '0').slice(0, 2); // First 2 digits of millis
      
      // Sanitize area name to ensure it doesn't break format if it has weird characters, keep it reasonably short
      const sanitizedArea = area.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
      
      return `${sanitizedArea}${dd}${mm}${yyyy}${hh}${min}${ss}${ms}`;
  };

  const handleStart = (area: ParkingArea) => {
    const newSessionId = generateSessionId(area);
    setParkingArea(area);
    setCurrentSessionId(newSessionId);
    setSessionLogs([]); // Start a new session
    setScreen('scanning');
  };
  
  const handleScan = (log: ScanLog) => {
      setSessionLogs(prevLogs => [log, ...prevLogs]);
  };

  const handleFinish = () => {
      setScreen('summary');
      setActiveTab('scanner');
  };
  
  const handleBackToScan = () => {
      setScreen('scanning');
  };

  const handleStartNewCheck = () => {
      setSessionLogs([]);
      setParkingArea('');
      setCurrentSessionId('');
      setScreen('welcome');
  };

  const renderContent = () => {
    const commonProps = {
        isSessionActive: screen === 'scanning',
        parkingArea,
        sessionId: currentSessionId,
        sessionLogs,
        onScan: handleScan,
        onFinish: handleFinish,
        currentUser, // Pass current user down
    };

    switch (activeTab) {
      case 'scanner':
        return <VinScanner 
          screen={screen}
          onStart={handleStart}
          onBackToScan={handleBackToScan}
          onStartNewCheck={handleStartNewCheck}
          locations={locations}
          {...commonProps}
        />;
      case 'image':
        return <ImageAnalyzer {...commonProps} />;
      case 'manual':
        return <ManualVinInput {...commonProps} />;
      case 'video':
        return <VideoAnalyzer {...commonProps} />;
      default:
        return <VinScanner 
          screen={screen}
          onStart={handleStart}
          onBackToScan={handleBackToScan}
          onStartNewCheck={handleStartNewCheck}
          locations={locations}
          {...commonProps}
        />;
    }
  };

  const TabButton = ({ tab, icon, label }: { tab: Tab, icon: React.ReactElement, label: string }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex-1 flex flex-col items-center justify-center p-2 sm:p-3 text-xs sm:text-sm transition-colors duration-200 ${
        activeTab === tab ? 'text-primary-400' : 'text-gray-400 hover:text-primary-300'
      }`}
    >
      {icon}
      <span className="mt-1 hidden sm:inline">{label}</span>
      <span className="mt-1 sm:hidden">{label.split(' ')[0]}</span>
    </button>
  );

  return (
    <div className="flex flex-col h-screen font-sans bg-gray-900 text-gray-100">
      <header className="bg-gray-800/50 backdrop-blur-sm shadow-lg p-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center">
            <CarIcon className="w-7 h-7 text-primary-400 mr-2" />
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-wide">Vehicle Stock Control</h1>
        </div>
        <div className="flex items-center">
            <span className="text-xs sm:text-sm text-gray-400 mr-3 hidden sm:inline">{currentUser.email}</span>
            <button onClick={onLogout} className="text-gray-400 hover:text-white p-2" title="Logout">
                 <LogOutIcon className="w-5 h-5" />
            </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        {renderContent()}
      </main>

      <nav className="sticky bottom-0 left-0 right-0 bg-gray-800/80 backdrop-blur-sm border-t border-gray-700 shadow-lg z-10 safe-pb">
        <div className="max-w-4xl mx-auto flex justify-around">
          <TabButton tab="scanner" icon={<ScanIcon />} label="Scanner" />
          <TabButton tab="image" icon={<ImageIcon />} label="Upload" />
          <TabButton tab="video" icon={<VideoIcon />} label="Video" />
          <TabButton tab="manual" icon={<PencilIcon />} label="Manual" />
        </div>
      </nav>
    </div>
  );
};

export default AgentApp;
