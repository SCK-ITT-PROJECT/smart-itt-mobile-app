import { create } from 'zustand';
import { storage } from '../services/storage';
import apiClient from '../services/api';

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
  vehicleStatus?: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
  vehicleLicenseIssuedDate?: string;
  vehicleLicenseExpiryDate?: string;
  vehicleLicenseDaysLeft?: number;
  vehicleLicenseRenewalDue?: boolean;
  vehicleLicenseStatus?: 'VALID' | 'RENEWAL_DUE' | 'EXPIRED';
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => Promise<void>;
  updateUser: (partialUser: Partial<User>) => void;
  setVehicleStatus: (status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE') => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  login: async (user: User) => {
    try {
      await storage.setItem('authToken', user.token);
      set({ user: { ...user, vehicleStatus: (user.vehicleStatus || 'ACTIVE') }, isAuthenticated: true });

      // If user is a driver with assigned vehicle, ensure backend knows it is ACTIVE
      if (user.role === 'DRIVER' && user.vehicleNumber) {
        apiClient.patch(`/vehicles/by-number/${encodeURIComponent(user.vehicleNumber)}/status`, {
          status: 'ACTIVE',
        }).catch((err: any) => console.warn('[AuthStore] Status update on login failed:', err?.message || err));
      }
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
  setVehicleStatus: async (status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE') => {
    const currentUser = get().user;
    if (!currentUser?.vehicleNumber) return;

    // Optimistically update store
    set((state) => ({
      user: state.user ? { ...state.user, vehicleStatus: status } : null,
    }));

    try {
      await apiClient.patch(`/vehicles/by-number/${encodeURIComponent(currentUser.vehicleNumber)}/status`, {
        status,
      });
    } catch (err) {
      console.warn('[AuthStore] setVehicleStatus failed:', err);
    }
  },
  logout: async () => {
    const currentUser = get().user;
    if (currentUser?.role === 'DRIVER' && currentUser.vehicleNumber) {
      try {
        await apiClient.patch(`/vehicles/by-number/${encodeURIComponent(currentUser.vehicleNumber)}/status`, {
          status: 'INACTIVE',
        });
      } catch (err) {
        console.warn('[AuthStore] Status update on logout failed:', err);
      }
      try {
        await apiClient.post('/auth/logout', {
          identifier: currentUser.driverCode || currentUser.username,
          vehicleNumber: currentUser.vehicleNumber,
        });
      } catch {}
    }

    try {
      await storage.removeItem('authToken');
    } catch (error) {
      console.error('Error deleting token:', error);
    }
    set({ user: null, isAuthenticated: false });
  },
}));
