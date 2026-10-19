import apiClient from './api';

export interface LoginRequest {
  username: string; // Driver Code (e.g. DRV-00125) or Email
  password: string;
}

export interface DriverRegisterRequest {
  fullName: string;
  nic: string;
  employeeId: string;
  mobileNumber: string;
  address: string;
  drivingLicenceNumber: string;
  licenseExpiryDate?: string; // YYYY-MM-DD
  dateOfBirth?: string; // YYYY-MM-DD
  emergencyContactName: string;
  emergencyContactNumber: string;
  password: string;
  confirmPassword?: string;
  email?: string;
  profilePhoto?: string;
  vehicleNumber?: string;
}

export interface DriverProfileData {
  id: string;
  driverCode?: string;
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
  vehicleNumber?: string;
  status?: string;
}

export interface AuthResponse {
  token: string;
  refreshToken?: string;
  driverCode?: string;
  user: {
    id: string;
    username: string;
    role: 'DRIVER' | 'SUPERVISOR';
    name: string;
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
  };
}

function normalizeAuthResponse(data: any): AuthResponse {
  const driverData = data.driver || {};
  const driverCode = data.driverCode || driverData.driverCode || (data.user?.driverCode);

  return {
    token: data.token || (data.user?.token),
    refreshToken: data.refreshToken,
    driverCode,
    user: {
      id: data.id || driverData.id || data.user?.id || 'user-1',
      username: data.username || driverCode || data.user?.username || data.email || '',
      role: (data.role?.toUpperCase() === 'SUPERVISOR' || data.user?.role === 'SUPERVISOR') ? 'SUPERVISOR' : 'DRIVER',
      name: data.name || data.fullName || driverData.fullName || data.user?.name || 'Driver',
      driverId: data.driverId || driverData.id || data.id,
      driverCode: driverCode,
      supervisorId: data.supervisorId || data.user?.supervisorId,
      vehicleNumber: data.vehicleNumber || driverData.vehicleNumber || data.user?.vehicleNumber,
      employeeId: data.employeeId || driverData.employeeId || data.user?.employeeId,
      nic: driverData.nic || data.nic || data.user?.nic,
      mobileNumber: driverData.mobileNumber || data.mobileNumber || data.user?.mobileNumber,
      email: data.email || driverData.email || data.user?.email,
      address: driverData.address || data.address || data.user?.address,
      licenseNumber: driverData.licenseNumber || data.licenseNumber || data.drivingLicenceNumber || data.user?.licenseNumber,
      licenseExpiryDate: driverData.licenseExpiryDate || data.licenseExpiryDate,
      dateOfBirth: driverData.dateOfBirth || data.dateOfBirth,
      emergencyContactName: driverData.emergencyContactName || data.emergencyContactName,
      emergencyContactNumber: driverData.emergencyContactNumber || data.emergencyContactNumber,
      status: data.status || driverData.status || data.user?.status || 'ACTIVE',
    },
  };
}

export const authService = {
  async login(request: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post('/auth/login', request);
    return normalizeAuthResponse(response.data);
  },

  async registerDriver(request: DriverRegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post('/auth/register/driver', request);
    return normalizeAuthResponse(response.data);
  },
};
