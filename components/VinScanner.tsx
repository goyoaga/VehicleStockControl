
import React, { useState, useEffect, useRef } from 'react';
import { ParkingArea, ScanLog, PermissionState, GeolocationCoordinates, User, Location } from '../types';
import { extractVinFromImage } from '../services/geminiService';
import { addScanLog, uploadVinImage } from '../services/firebaseService';
import { Spinner } from './Icons';

type Screen = 'welcome' | 'scanning' | 'summary';

interface VinScannerProps {
    screen: Screen;
    parkingArea: ParkingArea;
    sessionId: string;
    sessionLogs: ScanLog[];
    locations: Location[];
    onStart: (area: ParkingArea) => void;
    onScan: (log: ScanLog) => void;
    onFinish: () => void;
    onBackToScan: () => void;
    onStartNewCheck: () => void;
    currentUser: User;
}

const WelcomeScreen = ({ onStart, locations }: { onStart: (area: ParkingArea) => void, locations: Location[] }) => {
  const [selectedArea, setSelectedArea] = useState<ParkingArea | null>(null);

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-4">
      <h2 className="text-3xl font-bold mb-4 text-white">Select Parking Area</h2>
      <p className="text-gray-400 mb-8 max-w-md">Choose the parking lot you are currently inventorying to begin scanning vehicles.</p>
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        {locations.map(location => (
          <button
            key={location.id}
            onClick={() => setSelectedArea(location.name)}
            className={`px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 w-full sm:w-auto
              ${selectedArea === location.name ? 'bg-primary-600 text-white ring-2 ring-primary-400 shadow-lg' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
          >
            {location.name}
          </button>
        ))}
      </div>
       {locations.length === 0 && <p className="text-yellow-400 mb-4">No locations configured. An admin must add one first.</p>}
      <button
        onClick={() => selectedArea && onStart(selectedArea)}
        disabled={!selectedArea}
        className="w-full max-w-xs px-10 py-5 bg-primary-600 text-white font-bold rounded-lg text-xl shadow-lg hover:bg-primary-700 transition-transform duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed disabled:transform-none transform hover:scale-105"
      >
        Start Scanning
      </button>
    </div>
  );
};

const ScanningScreen = ({ parkingArea, sessionId, onFinish, onScan, sessionLogs, currentUser }: { parkingArea: ParkingArea, sessionId: string, onFinish: () => void, onScan: (log: ScanLog) => void, sessionLogs: ScanLog[], currentUser: User }) => {
    const [cameraPermission, setCameraPermission] = useState<PermissionState>('prompt');
    const [locationPermission, setLocationPermission] = useState<PermissionState>('prompt');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [vin, setVin] = useState<string | null>(null);
    const [capturedImage, setCapturedImage] = useState<Blob | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Effect 1: Request permissions on component mount.
    useEffect(() => {
        const requestPermissions = async () => {
            // Request location permission
            navigator.geolocation.getCurrentPosition(
                () => setLocationPermission('granted'),
                () => {
                    console.error("Location access denied.");
                    setLocationPermission('denied');
                }
            );

            // Request camera permission
            try {
                // We request the stream just to trigger the permission prompt.
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                // Immediately stop the tracks to turn off the camera light until it's actually needed.
                stream.getTracks().forEach(track => track.stop());
                setCameraPermission('granted');
            } catch (err) {
                console.error("Camera access error:", err);
                setCameraPermission('denied');
                setError("Camera access was denied. Please enable it in your browser settings and refresh the page.");
            }
        };

        requestPermissions();
    }, []);

    // Effect 2: Setup the camera stream only when permission is granted and the video element is ready.
    useEffect(() => {
        const videoElement = videoRef.current;
        if (cameraPermission === 'granted' && videoElement) {
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                .then(stream => {
                    streamRef.current = stream;
                    videoElement.srcObject = stream;
                    videoElement.play().catch(e => {
                        console.error("Video play failed:", e);
                        setError("Could not start camera playback.");
                    });
                })
                .catch(err => {
                    console.error("Error starting camera after permission grant:", err);
                    setCameraPermission('denied'); // Fallback to denied state
                    setError("Could not start camera. Please try refreshing the page.");
                });
        }

        // Cleanup function to stop the stream when the component unmounts or permission changes.
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        };
    }, [cameraPermission]); // This effect depends on the cameraPermission state.

    const captureImage = () => {
        if (!videoRef.current) return;
        if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
            setError("Camera is not ready yet. Please wait a moment.");
            return;
        }
        setError(null);
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
        canvas.toBlob(blob => {
            if (blob) {
                setCapturedImage(blob);
                processImage(blob);
            } else {
                setError("Failed to capture image.");
            }
        }, 'image/jpeg');
    };

    const processImage = async (imageBlob: Blob) => {
        setIsProcessing(true);
        setError(null);
        setVin(null);
        try {
            const base64data = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(imageBlob);
                reader.onloadend = () => {
                    if (typeof reader.result === 'string') {
                        resolve(reader.result.split(',')[1]);
                    } else {
                        reject(new Error("Failed to read image data."));
                    }
                };
                reader.onerror = (error) => reject(error);
            });
            
            const extractedVin = await extractVinFromImage(base64data);
            setVin(extractedVin);
        } catch (err: any) {
            setError(err.message || "VIN extraction failed.");
        } finally {
            setIsProcessing(false);
        }
    };
    
    const confirmVin = async () => {
        if (!vin || !capturedImage) return;

        // DUPLICATE CHECK
        if (sessionLogs.some(log => log.vin === vin)) {
            setError(`Duplicate VIN: The VIN "${vin}" has already been scanned and will not be saved again.`);
            // Reset the scanner UI to allow for a new capture, but keep the error message visible.
            setCapturedImage(null);
            setVin(null);
            setIsProcessing(false);
            return; // Stop execution
        }

        setIsProcessing(true);
        setError(null);
        
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

            const imageUrl = await uploadVinImage(vin, capturedImage);

            const newLogData = {
                sessionId,
                vin,
                parkingArea,
                timestamp: new Date(),
                location,
                imageUrl,
                entryMethod: 'Camera' as const,
                userId: currentUser.id,
                userEmail: currentUser.email
            };

            const newLog = await addScanLog(newLogData);
            onScan(newLog);
            resetScanner();

        } catch (err: any)
{
            setError(err.message || "Failed to save scan.");
        } finally {
            setIsProcessing(false);
        }
    };


    const resetScanner = () => {
        setCapturedImage(null);
        setVin(null);
        setError(null);
        setIsProcessing(false);
    };

    if (cameraPermission === 'prompt' || locationPermission === 'prompt') {
        return <div className="flex items-center justify-center h-full text-center p-8"><Spinner className="w-8 h-8 mr-3"/>Requesting permissions...</div>;
    }

    if (cameraPermission === 'denied' || locationPermission === 'denied') {
        return (
            <div className="text-center p-8 bg-red-900/50 rounded-lg">
                <h3 className="text-xl font-bold text-red-300">Permissions Required</h3>
                <p className="text-red-200 mt-2">
                    {cameraPermission === 'denied' && "Camera access is required to scan VINs. "}
                    {locationPermission === 'denied' && "Location access is required to log vehicle positions. "}
                    Please enable them in your browser settings and refresh.
                </p>
                {error && <p className="text-red-300 mt-4">{error}</p>}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-primary-400">{parkingArea}</h2>
                 <div className="flex items-center gap-2">
                     <span className="text-xs text-gray-500 font-mono hidden sm:inline">ID: {sessionId}</span>
                     <button onClick={onFinish} className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500 transition-colors">
                        Finish ({sessionLogs.length})
                    </button>
                 </div>
            </div>

            <div className="relative w-full aspect-video bg-gray-800 rounded-lg overflow-hidden mb-4 shadow-lg">
                <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${capturedImage ? 'hidden' : 'block'}`}></video>
                {capturedImage && <img src={URL.createObjectURL(capturedImage)} alt="Captured VIN" className="w-full h-full object-cover" />}
                 {isProcessing && (
                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
                        <Spinner className="w-12 h-12 text-primary-400" />
                        <p className="text-white mt-4 text-lg">Analyzing Image...</p>
                    </div>
                )}
            </div>

            {error && <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-lg mb-4 text-center">{error}</div>}

            {vin && !isProcessing && (
                 <div className="bg-gray-700 p-4 rounded-lg mb-4 text-center">
                    <p className="text-gray-400">Recognized VIN:</p>
                    <p className="text-2xl font-mono tracking-widest text-white">{vin}</p>
                </div>
            )}
            
            <div className="mt-auto grid grid-cols-2 gap-4">
               {!capturedImage ? (
                    <button onClick={captureImage} disabled={isProcessing} className="col-span-2 py-4 text-lg font-bold bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-500">
                        Capture VIN
                    </button>
               ) : (
                <>
                    <button onClick={resetScanner} disabled={isProcessing} className="py-4 text-lg font-bold bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors disabled:bg-gray-500">
                        Retry
                    </button>
                    <button onClick={confirmVin} disabled={isProcessing || !vin} className="py-4 text-lg font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-500">
                       {isProcessing ? <Spinner className="mx-auto w-7 h-7" /> : "Confirm"}
                    </button>
                </>
               )}
            </div>
        </div>
    );
};

const SummaryScreen = ({ logs, onBack, parkingArea, sessionId, onStartNew }: { logs: ScanLog[], onBack: () => void, parkingArea: ParkingArea, sessionId: string, onStartNew: () => void }) => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredLogs = logs.filter(log =>
        log.vin.toUpperCase().includes(searchQuery.toUpperCase())
    );

    const exportToCSV = () => {
        const headers = ["SessionID", "VIN", "ParkingArea", "Timestamp", "Latitude", "Longitude", "ImageURL", "EntryMethod", "UserEmail"];
        // Export all logs, not just the filtered ones
        const rows = logs.map(log => [
            log.sessionId,
            log.vin,
            log.parkingArea,
            log.timestamp.toISOString(),
            log.location.latitude,
            log.location.longitude,
            log.imageUrl || '',
            log.entryMethod,
            log.userEmail
        ].join(','));
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `vehicle_stock_${parkingArea}_${sessionId}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                <div>
                    <h2 className="text-2xl font-bold">Session Summary</h2>
                    <p className="text-xs text-gray-400 font-mono mt-1">ID: {sessionId}</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={onBack} className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500 transition-colors">
                        &larr; Back to Scanning
                    </button>
                     <button onClick={onStartNew} className="px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors">
                        Start New Check
                    </button>
                </div>
            </div>
            
            <div className="bg-gray-800 p-4 rounded-lg mb-6">
                <h3 className="text-lg font-semibold mb-2 text-primary-400">VIN Search</h3>
                <div className="flex">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search for a VIN in this session..."
                        className="flex-grow bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-primary-500 focus:border-primary-500 font-mono"
                    />
                </div>
            </div>

            <div className="flex justify-between items-center mb-4">
                 <h3 className="text-xl font-semibold text-gray-200">
                    Total Registered Vehicles: <span className="font-bold text-primary-400">{logs.length}</span>
                </h3>
                <button onClick={exportToCSV} disabled={logs.length === 0} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-500">
                    Export as CSV
                </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-gray-800 rounded-lg p-1">
                <table className="w-full text-left">
                    <thead className="sticky top-0 bg-gray-700">
                        <tr>
                            <th className="p-3 text-sm font-semibold tracking-wide">VIN</th>
                            <th className="p-3 text-sm font-semibold tracking-wide hidden sm:table-cell">Timestamp</th>
                            <th className="p-3 text-sm font-semibold tracking-wide hidden md:table-cell">Coordinates</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">Entry Method</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {filteredLogs.length > 0 ? filteredLogs.map(log => (
                            <tr key={log.id} className="hover:bg-gray-700/50">
                                <td className="p-3 font-mono text-xs sm:text-sm">{log.vin}</td>
                                <td className="p-3 text-xs sm:text-sm text-gray-400 hidden sm:table-cell">{log.timestamp.toLocaleTimeString()}</td>
                                <td className="p-3 text-xs sm:text-sm text-gray-400 hidden md:table-cell">{log.location.latitude.toFixed(4)}, {log.location.longitude.toFixed(4)}</td>
                                <td className="p-3 text-xs sm:text-sm text-gray-400">{log.entryMethod}</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-gray-400">
                                    {logs.length > 0 ? 'No matching VINs found.' : 'No vehicles scanned in this session yet.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const VinScanner: React.FC<VinScannerProps> = ({ screen, parkingArea, sessionId, sessionLogs, onStart, onScan, onFinish, onBackToScan, onStartNewCheck, currentUser, locations }) => {
    switch (screen) {
        case 'scanning':
            return <ScanningScreen parkingArea={parkingArea} sessionId={sessionId} onFinish={onFinish} onScan={onScan} sessionLogs={sessionLogs} currentUser={currentUser} />;
        case 'summary':
            return <SummaryScreen logs={sessionLogs} onBack={onBackToScan} parkingArea={parkingArea} sessionId={sessionId} onStartNew={onStartNewCheck} />;
        default:
            return <WelcomeScreen onStart={onStart} locations={locations} />;
    }
};

export default VinScanner;
