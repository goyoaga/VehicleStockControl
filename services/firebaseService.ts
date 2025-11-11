
import { ScanLog } from '../types';

// This is a mock service that simulates Firebase interactions.
// In a real application, you would replace this with the Firebase SDK.

const LOGS_KEY = 'mockFirestoreLogs';
let mockFirestore: ScanLog[] = [];

// Simulate Firestore's offline persistence
try {
  const savedLogs = localStorage.getItem(LOGS_KEY);
  if (savedLogs) {
    mockFirestore = JSON.parse(savedLogs).map((log: any) => ({
      ...log,
      timestamp: new Date(log.timestamp), // Deserialize date strings
    }));
  }
} catch (error) {
  console.error("Could not load logs from localStorage", error);
}

const saveToLocalStorage = () => {
  try {
    localStorage.setItem(LOGS_KEY, JSON.stringify(mockFirestore));
  } catch (error) {
    console.error("Could not save logs to localStorage", error);
  }
};


export const addScanLog = async (logData: Omit<ScanLog, 'id'>): Promise<ScanLog> => {
  // console.log("Mock Firebase: Adding scan log", logData);
  const newLog: ScanLog = {
    ...logData,
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };
  mockFirestore.push(newLog);
  saveToLocalStorage();
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));
  return newLog;
};

export const uploadVinImage = async (vin: string, imageBlob: Blob): Promise<string> => {
    // console.log(`Mock Firebase: Uploading image for VIN ${vin}`);
    // In a real implementation, you'd use Firebase Storage SDK here.
    // For the mock, we just return a placeholder URL.
    await new Promise(resolve => setTimeout(resolve, 500));
    const mockUrl = URL.createObjectURL(imageBlob); // Create a temporary local URL
    return mockUrl;
};

// Admin function to get absolutely all logs history
export const getAdminAllLogs = async (): Promise<ScanLog[]> => {
    await new Promise(resolve => setTimeout(resolve, 600));
    // Return a copy to avoid direct mutation issues, sort by newest first
    return [...mockFirestore].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};
