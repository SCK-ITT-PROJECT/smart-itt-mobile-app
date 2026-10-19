import { create } from 'zustand';
import { storage } from '../services/storage';

export type UserRole = 'DRIVER' | 'SUPERVISOR';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  name: string;
  fullName?: string;
  token: string;
  driverId?: string;
  driverCode?: string;
  supervisorId?: string;
  vehicleNumber?: string;
  employeeId?: string;
  nic?: string;
  mobileNumber?: string;
  email?: string;
  address?: string;
  licenseNumber?: string;
  licenseExpiryDate?: string;
  dateOfBirth?: string;
  emergencyContactName?: string;
  emergencyContactNumber?: string;
  status?: string;
  chaiNumber?: string;
  chassisNumber?: string;
  cheNumber?: string;
  operator?: string;
  profilePhoto?: string;
  coverImage?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => Promise<void>;
  updateUser: (partialUser: Partial<User>) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  login: async (user: User) => {
    try {
      await storage.setItem('authToken', user.token);
      set({ user, isAuthenticated: true });
    } catch (error) {
      console.error('Error saving token:', error);
      set({ user, isAuthenticated: true });
    }
  },
  updateUser: (partialUser: Partial<User>) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...partialUser } : null,
    }));
  },
  logout: async () => {
    try {
      await storage.removeItem('authToken');
    } catch (error) {
      console.error('Error deleting token:', error);
    }
    set({ user: null, isAuthenticated: false });
  },
}));
