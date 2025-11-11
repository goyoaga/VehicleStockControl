
import { User, InviteCode, Role } from '../types';

// Keys for localStorage
const USERS_KEY = 'mockUsers';
const INVITES_KEY = 'mockInvites';
const CURRENT_USER_KEY = 'mockCurrentUser';

// Extended user type for internal mock auth storage (to keep passwords out of the main app type)
interface StoredUser extends User {
    password?: string;
}

// Initial Users (pre-seeded for demo access)
const INITIAL_USERS: StoredUser[] = [
    {
        id: 'admin_1',
        email: 'admin@admin.com',
        password: 'admin',
        role: 'admin',
        name: 'System Administrator',
        createdAt: new Date(),
        status: 'active',
    },
    {
        id: 'agent_1',
        email: 'agent@agent.com',
        password: 'agent',
        role: 'agent',
        name: 'Demo Agent',
        createdAt: new Date(),
        status: 'active',
    }
];

// Helper to get data from local storage
const getFromStorage = <T>(key: string, defaultValue: T): T => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
        console.error(`Error reading ${key} from localStorage`, e);
        return defaultValue;
    }
};

// Helper to save data to local storage
const saveToStorage = (key: string, data: any) => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error(`Error saving ${key} to localStorage`, e);
    }
};

// --- Initialization Logic ---
// Ensure our demo users always exist in local storage
const initializeStorage = () => {
    let users = getFromStorage<StoredUser[]>(USERS_KEY, []);
    let updated = false;

    INITIAL_USERS.forEach(initUser => {
        if (!users.some(u => u.email.toLowerCase() === initUser.email.toLowerCase())) {
            users.push(initUser);
            updated = true;
        } else {
            // Ensure existing users have a status
            const existingUser = users.find(u => u.email.toLowerCase() === initUser.email.toLowerCase());
            if (existingUser && !existingUser.status) {
                existingUser.status = 'active';
                updated = true;
            }
        }
    });

    if (updated || users.length === 0) {
        saveToStorage(USERS_KEY, users);
    }
};

initializeStorage();

export const authService = {
    login: async (email: string, password?: string): Promise<User> => {
        await new Promise(resolve => setTimeout(resolve, 600)); // Simulate network
        const users = getFromStorage<StoredUser[]>(USERS_KEY, []);
        const userIndex = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
        
        if (userIndex === -1) {
             throw new Error("User not found.");
        }
        
        const user = users[userIndex];

        if (user.status === 'blocked') {
            throw new Error("This account has been deactivated by an administrator.");
        }

        // Simple mock password check
        if (user.password && user.password !== password) {
            throw new Error("Invalid password.");
        }
        
        // Update last login time
        user.lastLogin = new Date();
        users[userIndex] = user;
        saveToStorage(USERS_KEY, users);

        // Return user without password field to the app
        const { password: _, ...safeUser } = user;
        saveToStorage(CURRENT_USER_KEY, safeUser);
        return safeUser;
    },

    register: async (email: string, name: string, inviteCode: string, password?: string): Promise<User> => {
        await new Promise(resolve => setTimeout(resolve, 800));
        const users = getFromStorage<StoredUser[]>(USERS_KEY, []);
        const invites = getFromStorage<InviteCode[]>(INVITES_KEY, []);

        if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
            throw new Error("Email already registered.");
        }

        const invite = invites.find(i => i.code === inviteCode && !i.used);
        if (!invite) {
            throw new Error("Invalid or already used invite code.");
        }

        const newUser: StoredUser = {
            id: 'user_' + Math.random().toString(36).substr(2, 9),
            email,
            name,
            password, // Store the password internally
            role: 'agent',
            createdAt: new Date(),
            status: 'active',
            lastLogin: new Date(), // Auto-login on register
        };

        // Mark invite as used
        invite.used = true;
        invite.usedBy = newUser.id;
        saveToStorage(INVITES_KEY, invites);

        // Save new user
        users.push(newUser);
        saveToStorage(USERS_KEY, users);

        // Return safe user object
        const { password: _, ...safeUser } = newUser;
        saveToStorage(CURRENT_USER_KEY, safeUser);
        return safeUser;
    },

    logout: async () => {
        localStorage.removeItem(CURRENT_USER_KEY);
    },

    getCurrentUser: (): User | null => {
        const user = getFromStorage<User | null>(CURRENT_USER_KEY, null);
        if (user) {
             if (typeof user.createdAt === 'string') user.createdAt = new Date(user.createdAt);
             if (user.lastLogin && typeof user.lastLogin === 'string') user.lastLogin = new Date(user.lastLogin);
        }
        return user;
    },

    // --- Admin Only Functions ---

    generateInviteCode: async (adminId: string): Promise<InviteCode> => {
         await new Promise(resolve => setTimeout(resolve, 300));
         const invites = getFromStorage<InviteCode[]>(INVITES_KEY, []);
         
         const newInvite: InviteCode = {
             code: 'INV-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
             createdBy: adminId,
             createdAt: new Date(),
             used: false,
         };

         invites.push(newInvite);
         saveToStorage(INVITES_KEY, invites);
         return newInvite;
    },

    revokeInviteCode: async (code: string): Promise<void> => {
         await new Promise(resolve => setTimeout(resolve, 300));
         let invites = getFromStorage<InviteCode[]>(INVITES_KEY, []);
         // Remove the invite entirely if it hasn't been used
         invites = invites.filter(i => i.code !== code);
         saveToStorage(INVITES_KEY, invites);
    },

    getAllUsers: async (): Promise<User[]> => {
        await new Promise(resolve => setTimeout(resolve, 400));
        const users = getFromStorage<StoredUser[]>(USERS_KEY, []);
        // Return users without passwords and ensuring dates are Date objects
        return users.map(({ password, ...user }) => ({
            ...user,
            createdAt: new Date(user.createdAt),
            lastLogin: user.lastLogin ? new Date(user.lastLogin) : undefined
        }));
    },
    
    createUser: async(data: { name: string, email: string, password?: string, role: Role }): Promise<User> => {
        await new Promise(resolve => setTimeout(resolve, 500));
        const users = getFromStorage<StoredUser[]>(USERS_KEY, []);
        if (users.some(u => u.email.toLowerCase() === data.email.toLowerCase())) {
            throw new Error("Email already in use.");
        }
        const newUser: StoredUser = {
            id: 'user_' + Math.random().toString(36).substr(2, 9),
            ...data,
            createdAt: new Date(),
            status: 'active',
        };
        users.push(newUser);
        saveToStorage(USERS_KEY, users);
        const { password, ...safeUser } = newUser;
        return safeUser;
    },

    updateUser: async (id: string, data: Partial<User> & { password?: string }): Promise<User> => {
        await new Promise(resolve => setTimeout(resolve, 500));
        let users = getFromStorage<StoredUser[]>(USERS_KEY, []);
        const index = users.findIndex(u => u.id === id);
        if (index === -1) throw new Error("User not found.");

        // Check email uniqueness if changed
        if (data.email && data.email.toLowerCase() !== users[index].email.toLowerCase()) {
             if (users.some(u => u.email.toLowerCase() === data.email!.toLowerCase())) {
                 throw new Error("Email already in use.");
             }
        }

        // Update fields
        users[index] = { ...users[index], ...data };
        
        // Handle password separately if provided (don't overwrite with empty string if not provided)
        if (data.password) {
            users[index].password = data.password;
        }

        saveToStorage(USERS_KEY, users);
        const { password: _, ...safeUser } = users[index];
        return safeUser;
    },

    deleteUser: async(userId: string): Promise<void> => {
        await new Promise(resolve => setTimeout(resolve, 300));
        let users = getFromStorage<StoredUser[]>(USERS_KEY, []);
        users = users.filter(u => u.id !== userId);
        saveToStorage(USERS_KEY, users);
    },

    blockUser: async(userId: string): Promise<void> => {
        await new Promise(resolve => setTimeout(resolve, 300));
        let users = getFromStorage<StoredUser[]>(USERS_KEY, []);
        const user = users.find(u => u.id === userId);
        if (user) {
            user.status = 'blocked';
            saveToStorage(USERS_KEY, users);
        } else {
            throw new Error("User not found.");
        }
    },

    unblockUser: async(userId: string): Promise<void> => {
        await new Promise(resolve => setTimeout(resolve, 300));
        let users = getFromStorage<StoredUser[]>(USERS_KEY, []);
        const user = users.find(u => u.id === userId);
        if (user) {
            user.status = 'active';
            saveToStorage(USERS_KEY, users);
        } else {
            throw new Error("User not found.");
        }
    },

    getAllInvites: async(): Promise<InviteCode[]> => {
         await new Promise(resolve => setTimeout(resolve, 400));
         return getFromStorage<InviteCode[]>(INVITES_KEY, []);
    }
};
