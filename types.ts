
export type ParkingArea = string;
export type EntryMethod = 'Camera' | 'Upload' | 'Manual' | 'Video';
export type Role = 'admin' | 'agent';

export interface LocationAddress {
    street: string;
    city: string;
    zipCode: string;
    country: string;
}

export interface GeolocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface Location {
    id: string;
    name: string;
    address?: LocationAddress;
    coordinates?: GeolocationCoordinates; // New: GPS Coordinates
    capacity?: number;
    surfaceArea?: number;
    zone?: string;
    isHub?: boolean;
    openingTime?: string;
    closingTime?: string;
    status?: 'active' | 'inactive';
    createdAt: Date;
    createdBy: string;
}
export interface User {
    id: string;
    email: string;
    role: Role;
    name: string;
    createdAt: Date;
    status: 'active' | 'blocked';
    lastLogin?: Date;
}

export interface InviteCode {
    code: string;
    createdBy: string; // admin user id
    createdAt: Date;
    used: boolean;
    usedBy?: string; // user id who used it
}

export interface ScanLog {
  id: string;
  sessionId: string;
  vin: string;
  parkingArea: ParkingArea;
  timestamp: Date;
  location: {
    latitude: number;
    longitude: number;
  };
  imageUrl?: string;
  entryMethod: EntryMethod;
  userId: string;
  userEmail: string;
}

export type PermissionState = 'prompt' | 'granted' | 'denied';