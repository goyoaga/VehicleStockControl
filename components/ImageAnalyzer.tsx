
import React, { useState, useRef } from 'react';
import { extractVinFromImage } from '../services/geminiService';
import { addScanLog, uploadVinImage } from '../services/firebaseService';
import { fileToBase64 } from '../utils/fileUtils';
import { Spinner, ImageIcon } from './Icons';
import { GeolocationCoordinates, ParkingArea, ScanLog, User } from '../types';

interface ImageAnalyzerProps {
  isSessionActive: boolean;
  parkingArea: ParkingArea;
  sessionId: string;
  sessionLogs: ScanLog[];
  onScan: (log: ScanLog) => void;
  onFinish: () => void;
  currentUser: User;
}

const ImageAnalyzer: React.FC<ImageAnalyzerProps> = ({ isSessionActive, parkingArea, sessionId, sessionLogs, onScan, onFinish, currentUser }) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setImageFile(null);
    setImageUrl(null);
    setError(null);
    setScanResult(null);
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      resetState();
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImageUrl(url);
    }
  };

  const handleSubmit = async () => {
    if (!imageFile) {
      setError('Please provide an image.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setScanResult(null);

    try {
      // 1. Get location
      const location = await new Promise<GeolocationCoordinates>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
              position => resolve({
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude
              }),
              err => reject(new Error("Could not get location: " + err.message))
          );
      });

      // 2. Convert file to base64
      const base64Image = await fileToBase64(imageFile);
      
      // 3. Extract VIN from image
      const vin = await extractVinFromImage(base64Image);
      
      // 4. DUPLICATE CHECK
      if (sessionLogs.some(log => log.vin === vin)) {
        setError(`Duplicate VIN: The VIN "${vin}" has already been scanned and will not be saved again.`);
        setIsLoading(false); // Stop loading spinner
        return; // Stop execution
      }

      // 5. Upload original image file to storage
      const uploadedImageUrl = await uploadVinImage(vin, imageFile);

      // 6. Create log data
      const newLogData = {
          sessionId,
          vin,
          parkingArea,
          timestamp: new Date(),
          location,
          imageUrl: uploadedImageUrl,
          entryMethod: 'Upload' as const,
          userId: currentUser.id,
          userEmail: currentUser.email,
      };

      // 7. Save log to database
      const newLog = await addScanLog(newLogData);

      // 8. Update parent state
      onScan(newLog);

      // 9. Show success feedback
      setScanResult(`Successfully scanned and logged VIN: ${vin}`);
      setImageFile(null); // Clear the image for the next upload

    } catch (err: any) {
      setError(err.message || 'An error occurred during the scan.');
    } finally {
      setIsLoading(false);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };
  
  if (!isSessionActive) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4 bg-gray-800 rounded-lg">
        <h3 className="text-2xl font-bold mb-3 text-primary-400">Start a Session First</h3>
        <p className="text-gray-400 max-w-md">Please go to the "Scanner" tab and start a new session before uploading an image.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
            <div className="flex flex-col">
                 <h2 className="text-xl font-bold text-primary-400">{parkingArea} (Upload)</h2>
                 <span className="text-xs text-gray-500 font-mono">ID: {sessionId}</span>
            </div>
            <button onClick={onFinish} className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500 transition-colors">
                Finish ({sessionLogs.length})
            </button>
      </div>

      <div className="max-w-3xl mx-auto w-full space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Upload VIN Image</label>
          <div 
            onClick={triggerFileSelect}
            className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-md cursor-pointer hover:border-primary-500 transition-colors"
          >
            <div className="space-y-1 text-center">
              {imageUrl ? (
                <img src={imageUrl} alt="Preview" className="mx-auto h-48 rounded-md object-contain" />
              ) : (
                <>
                  <ImageIcon className="mx-auto h-12 w-12 text-gray-500" />
                  <p className="text-sm text-gray-400">
                    <span className="font-semibold text-primary-400">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF</p>
                </>
              )}
            </div>
          </div>
          <input
            id="file-upload"
            name="file-upload"
            type="file"
            className="sr-only"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
        </div>
        
        <button
          onClick={handleSubmit}
          disabled={isLoading || !imageFile}
          className="w-full flex justify-center py-4 px-4 border border-transparent rounded-md shadow-lg text-lg font-bold text-white bg-primary-600 hover:bg-primary-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-transform duration-200 hover:scale-[1.02] active:scale-100"
        >
          {isLoading ? <Spinner className="w-6 h-6" /> : 'Scan VIN from Image'}
        </button>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-300 p-4 rounded-lg text-center">{error}</div>
        )}

        {scanResult && (
          <div className="bg-green-500/20 border border-green-500 text-green-300 p-4 rounded-lg text-center font-semibold">{scanResult}</div>
        )}
      </div>
    </div>
  );
};

export default ImageAnalyzer;
