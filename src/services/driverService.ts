import apiClient from './api';

export interface DriverProfile {
  id: string;
  driverCode: string;
  username: string;
  employeeId: string;
  fullName: string;
  nic: string;
  mobileNumber: string;
  email?: string;
  address?: string;
  licenseNumber?: string;
  licenseExpiryDate?: string;
  dateOfBirth?: string;
  emergencyContactName?: string;
  emergencyContactNumber?: string;
  profilePhoto?: string;
  coverImage?: string;
  vehicleNumber?: string;
  chassisNumber?: string;
  cheNumber?: string;
  operator?: string;
  vehicleLicenseIssuedDate?: string;
  vehicleLicenseExpiryDate?: string;
  vehicleLicenseDaysLeft?: number;
  vehicleLicenseRenewalDue?: boolean;
  vehicleLicenseStatus?: 'VALID' | 'RENEWAL_DUE' | 'EXPIRED';
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export const driverService = {
  async getProfile(driverIdOrCode?: string): Promise<DriverProfile | null> {
    try {
      const response = await apiClient.get<DriverProfile>('/drivers/me');
      return response.data;
    } catch {
      const fallbackId = driverIdOrCode || 'DRV-00001';
      try {
        const response = await apiClient.get<DriverProfile>(`/drivers/${fallbackId}`);
        return response.data;
      } catch {
        return null;
      }
    }
  },

  async getDriverById(id: string): Promise<DriverProfile> {
    const response = await apiClient.get<DriverProfile>(`/drivers/${id}`);
    return response.data;
  },

  async getAllDrivers(status?: string): Promise<DriverProfile[]> {
    const params = status ? { status } : {};
    const response = await apiClient.get<DriverProfile[]>('/drivers', { params });
    return response.data;
  },

  async updateStatus(id: string, status: string): Promise<DriverProfile> {
    const response = await apiClient.patch<DriverProfile>(`/drivers/${id}/status`, { status });
    return response.data;
  },

  async updatePhotos(id: string, profilePhoto?: string, coverImage?: string): Promise<DriverProfile> {
    const response = await apiClient.patch<DriverProfile>(`/drivers/${id}/photos`, {
      profilePhoto,
      coverImage,
    });
    return response.data;
  },
};
