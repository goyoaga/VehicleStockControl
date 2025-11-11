
import React, { useState } from 'react';
import { Spinner } from './Icons';
import { GeolocationCoordinates, ParkingArea, ScanLog, User } from '../types';
import { addScanLog } from '../services/firebaseService';

interface ManualVinInputProps {
  isSessionActive: boolean;
  parkingArea: ParkingArea;
  sessionId: string;
  sessionLogs: ScanLog[];
  onScan: (log: ScanLog) => void;
  onFinish: () => void;
  currentUser: User;
}

const ManualVinInput: React.FC<ManualVinInputProps> = ({ isSessionActive, parkingArea, sessionId, sessionLogs, onScan, onFinish, currentUser }) => {
  const [vin, setVin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleVinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // VINs are alphanumeric, uppercase. Limit length to 17.
    const upperCaseVin = e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
    setVin(upperCaseVin.slice(0, 17));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (vin.length !== 17) {
      setError("A valid VIN must be exactly 17 characters long.");
      return;
    }
    
    if (sessionLogs.some(log => log.vin === vin)) {
      setError(`Duplicate VIN: The VIN "${vin}" has already been logged in this session.`);
      return;
    }
    
    setIsLoading(true);
    try {
      const location = await new Promise<GeolocationCoordinates>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          position => resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }),
          err => reject(new Error("Could not get location: " + err.message))
        );
      });

      const newLogData = {
        sessionId,
        vin,
        parkingArea,
        timestamp: new Date(),
        location,
        entryMethod: 'Manual' as const,
        userId: currentUser.id,
        userEmail: currentUser.email
      };

      const newLog = await addScanLog(newLogData);
      onScan(newLog);
      setSuccess(`Successfully logged VIN: ${vin}`);
      setVin(''); // Reset input on success
      
    } catch (err: any) {
      setError(err.message || "Failed to save the VIN log.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSessionActive) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4 bg-gray-800 rounded-lg">
        <h3 className="text-2xl font-bold mb-3 text-primary-400">Start a Session First</h3>
        <p className="text-gray-400 max-w-md">Please go to the "Scanner" tab and start a new session before making a manual entry.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
            <div className="flex flex-col">
                <h2 className="text-xl font-bold text-primary-400">{parkingArea} (Manual)</h2>
                <span className="text-xs text-gray-500 font-mono">ID: {sessionId}</span>
            </div>
            <button onClick={onFinish} className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500 transition-colors">
                Finish ({sessionLogs.length})
            </button>
      </div>

      <div className="max-w-3xl mx-auto w-full">
        <form onSubmit={handleSubmit} className="space-y-6 bg-gray-800 p-6 rounded-lg shadow-lg">
          <div>
            <label htmlFor="vin-input" className="block text-sm font-medium text-gray-300 mb-2">
              Enter 17-character VIN
            </label>
            <input
              id="vin-input"
              type="text"
              value={vin}
              onChange={handleVinChange}
              placeholder="e.g., 1G1FW1R77J4100000"
              className="block w-full bg-gray-900 border border-gray-700 rounded-lg py-4 px-4 font-mono tracking-[0.25em] text-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              autoComplete="off"
              spellCheck="false"
            />
             <div className={`text-right text-sm mt-2 font-medium ${vin.length === 17 ? 'text-green-400' : 'text-gray-500'}`}>
                {vin.length} / 17
             </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || vin.length !== 17}
            className="w-full flex justify-center py-4 px-4 border border-transparent rounded-lg shadow-md text-lg font-bold text-white bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all active:scale-[0.98]"
          >
            {isLoading ? <Spinner className="w-7 h-7" /> : 'Confirm and Save VIN'}
          </button>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-lg text-center animate-pulse">
                {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/20 border border-green-500/50 text-green-300 p-4 rounded-lg text-center font-semibold">
                {success}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default ManualVinInput;
