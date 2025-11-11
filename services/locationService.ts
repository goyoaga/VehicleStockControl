
import { Location, LocationAddress, GeolocationCoordinates } from '../types';

const LOCATIONS_KEY = 'mockLocations';

const getFromStorage = <T>(key: string, defaultValue: T): T => {
    try {
        const item = localStorage.getItem(key);
        if (!item) return defaultValue;
        const parsed = JSON.parse(item);
        // Revive date objects
        if (Array.isArray(parsed)) {
            return parsed.map(loc => ({ ...loc, createdAt: new Date(loc.createdAt) })) as T;
        }
        return parsed;
    } catch (e) {
        console.error(`Error reading ${key} from localStorage`, e);
        return defaultValue;
    }
};

const saveToStorage = (key: string, data: any) => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error(`Error saving ${key} to localStorage`, e);
    }
};

// Seed initial data if none exists
const initializeStorage = () => {
    const locations = getFromStorage<Location[]>(LOCATIONS_KEY, []);
    if (locations.length === 0) {
        const initialLocations: Location[] = [
            { 
                id: 'loc_1', 
                name: 'Central Parking A', 
                address: { street: 'Main St 123', city: 'Metropolis', zipCode: '10001', country: 'USA' },
                coordinates: { latitude: 40.7128, longitude: -74.0060 },
                capacity: 450,
                surfaceArea: 12000,
                zone: 'Downtown',
                isHub: true,
                openingTime: '06:00',
                closingTime: '23:00',
                status: 'active',
                createdAt: new Date(), 
                createdBy: 'admin_1' 
            },
            { 
                id: 'loc_2', 
                name: 'North Wing Lot B', 
                address: { street: 'Industrial Ave 45', city: 'Metropolis', zipCode: '10020', country: 'USA' },
                coordinates: { latitude: 40.7589, longitude: -73.9851 },
                capacity: 200,
                surfaceArea: 5500,
                zone: 'Industrial Park',
                isHub: false,
                openingTime: '08:00',
                closingTime: '20:00',
                status: 'active',
                createdAt: new Date(), 
                createdBy: 'admin_1' 
            },
        ];
        saveToStorage(LOCATIONS_KEY, initialLocations);
    }
};

initializeStorage();

// Interface reused for both Add and Update
interface LocationData {
    name: string;
    address: LocationAddress;
    coordinates?: GeolocationCoordinates;
    capacity: number;
    surfaceArea: number;
    zone?: string;
    isHub?: boolean;
    openingTime?: string;
    closingTime?: string;
    status?: 'active' | 'inactive';
}

export const locationService = {
    getLocations: async (): Promise<Location[]> => {
        await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network
        const locations = getFromStorage<Location[]>(LOCATIONS_KEY, []);
        // Ensure all locations have a status (backward compatibility for old data)
        return locations.map(loc => ({
            ...loc,
            status: loc.status || 'active'
        }));
    },

    addLocation: async (data: LocationData, adminId: string): Promise<Location> => {
        await new Promise(resolve => setTimeout(resolve, 400));
        const locations = getFromStorage<Location[]>(LOCATIONS_KEY, []);
        if (locations.some(loc => loc.name.toLowerCase() === data.name.toLowerCase())) {
            throw new Error("A location with this name already exists.");
        }
        const newLocation: Location = {
            id: `loc_${Date.now()}`,
            ...data,
            status: data.status || 'active',
            createdBy: adminId,
            createdAt: new Date(),
        };
        locations.push(newLocation);
        saveToStorage(LOCATIONS_KEY, locations);
        return newLocation;
    },

    updateLocation: async (id: string, data: Partial<LocationData>): Promise<Location> => {
        await new Promise(resolve => setTimeout(resolve, 400));
        let locations = getFromStorage<Location[]>(LOCATIONS_KEY, []);
        const index = locations.findIndex(loc => loc.id === id);
        
        if (index === -1) {
            throw new Error("Location not found.");
        }

        // Check for name duplicate if name is being changed
        if (data.name && 
            data.name.toLowerCase() !== locations[index].name.toLowerCase() && 
            locations.some(loc => loc.name.toLowerCase() === data.name!.toLowerCase())) {
            throw new Error("A location with this new name already exists.");
        }

        locations[index] = { ...locations[index], ...data };
        saveToStorage(LOCATIONS_KEY, locations);
        return locations[index];
    },

    toggleLocationStatus: async (id: string): Promise<Location> => {
        await new Promise(resolve => setTimeout(resolve, 300));
        let locations = getFromStorage<Location[]>(LOCATIONS_KEY, []);
        const index = locations.findIndex(loc => loc.id === id);
        if (index === -1) throw new Error("Location not found.");
        
        const currentStatus = locations[index].status || 'active';
        locations[index].status = currentStatus === 'active' ? 'inactive' : 'active';
        
        saveToStorage(LOCATIONS_KEY, locations);
        return locations[index];
    },

    deleteLocation: async (id: string): Promise<void> => {
        await new Promise(resolve => setTimeout(resolve, 300));
        let locations = getFromStorage<Location[]>(LOCATIONS_KEY, []);
        locations = locations.filter(loc => loc.id !== id);
        saveToStorage(LOCATIONS_KEY, locations);
    },
};
