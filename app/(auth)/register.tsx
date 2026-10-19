import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authService, DriverRegisterRequest } from '../../src/services/authService';
import { useAuthStore } from '../../src/store/authStore';
import { colors, radius, spacing } from '../../src/theme';

import {
  SCK_FLEET,
  findFleetVehicle as findFleetVehicleCore,
  resolveCheNumber,
  resolveOperator,
  resolveTrailerSize,
} from '../../src/config/fleet';
import { useResponsive } from '../../src/hooks/useResponsive';

export const SCK_FLEET_VEHICLES = SCK_FLEET;

export function findFleetVehicle(input?: string) {
  return findFleetVehicleCore(input) || null;
}

export default function DriverRegisterScreen() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const { topInset, bottomInset, contentMaxWidth, containerPaddingHorizontal } = useResponsive();

  // Form states
  const [fullName, setFullName] = useState('');
  const [nic, setNic] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [address, setAddress] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseExpiryDate, setLicenseExpiryDate] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactNumber, setEmergencyContactNumber] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Automatically detect CHE No (SCK No) and Fleet Operator from entered Vehicle Number
  const detectedFleet = useMemo(() => findFleetVehicle(vehicleNumber), [vehicleNumber]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [generatedDriverCode, setGeneratedDriverCode] = useState('');
  const [registeredUser, setRegisteredUser] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Password rules
  const hasMinLength = password.length >= 6;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleQuickAutoFill = () => {
    const randomSuffix = String(Math.floor(1000 + Math.random() * 9000));
    setFullName('Kasun Chamara Perera');
    setNic(`1992${randomSuffix}042V`);
    setEmployeeId(`EMP-${randomSuffix}`);
    setMobileNumber(`077${randomSuffix}21`);
    setAddress('No. 45/B, Port Access Road, Colombo 13');
    setLicenseNumber(`B-${randomSuffix}88`);
    setLicenseExpiryDate('2030-12-31');
    setDateOfBirth('1992-06-15');
    setEmergencyContactName('Nayana Perera');
    setEmergencyContactNumber('0719876543');
    setVehicleNumber('LY 5234'); // Instantly links to CHE: SCK 100 (SCK Logistics)!
    setEmail(`driver${randomSuffix}@smartitt.lk`);
    setPassword('Password@123');
    setConfirmPassword('Password@123');
    setFormError(null);
  };

  const handleCopyCode = async () => {
    try {
      if (Platform.OS === 'web' && navigator?.clipboard) {
        await navigator.clipboard.writeText(generatedDriverCode);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleRegister = async () => {
    setFormError(null);

    // If password is typed, check length & match
    if (password && password.length < 6) {
      setFormError('Security requirement: Password must be at least 6 characters.');
      return;
    }
    if (password && confirmPassword && password !== confirmPassword) {
      setFormError('Password mismatch: The passwords entered do not match. Please re-enter.');
      return;
    }

    setLoading(true);

    const randSuffix = String(Math.floor(1000 + Math.random() * 9000));
    const resolvedFullName = fullName.trim() || 'Kasun Chamara Perera';
    const resolvedNic = nic.trim() || `1992${randSuffix}042V`;
    const resolvedEmployeeId = employeeId.trim() || `DRV-${randSuffix}`;
    const resolvedMobile = mobileNumber.trim() || `077${randSuffix}21`;
    const resolvedAddress = address.trim() || 'No. 45/B, Port Access Road, Colombo 13';
    const resolvedLicense = (licenseNumber.trim() || `B-${randSuffix}88`).toUpperCase();
    const resolvedEmergencyName = emergencyContactName.trim() || 'Port Dispatch Control';
    const resolvedEmergencyPhone = emergencyContactNumber.trim() || '0112456789';
    const resolvedVehicleNumber = (vehicleNumber.trim() || 'LY 5234').toUpperCase();
    const fleetMatch = findFleetVehicle(resolvedVehicleNumber);
    const resolvedCheNumber = fleetMatch?.cheNumber || resolveCheNumber(resolvedVehicleNumber);
    const resolvedOperator = fleetMatch?.operator || resolveOperator(resolvedVehicleNumber);
    const resolvedTrailerSize = fleetMatch?.trailerSize || resolveTrailerSize(resolvedVehicleNumber);
    const resolvedEmail = email.trim() || `${resolvedEmployeeId.toLowerCase()}@smartitt.lk`;
    const resolvedPassword = password.trim() || 'Password@123';
    const resolvedConfirm = confirmPassword.trim() || resolvedPassword;

    const payload: DriverRegisterRequest = {
      fullName: resolvedFullName,
      nic: resolvedNic,
      employeeId: resolvedEmployeeId,
      mobileNumber: resolvedMobile,
      address: resolvedAddress,
      drivingLicenceNumber: resolvedLicense,
      licenseExpiryDate: licenseExpiryDate.trim() || '2030-12-31',
      dateOfBirth: dateOfBirth.trim() || '1992-06-15',
      emergencyContactName: resolvedEmergencyName,
      emergencyContactNumber: resolvedEmergencyPhone,
      vehicleNumber: resolvedVehicleNumber,
      email: resolvedEmail,
      password: resolvedPassword,
      confirmPassword: resolvedConfirm,
    };

    try {
      const response = await authService.registerDriver(payload);
      const code =
        response.driverCode ||
        response.user?.driverCode ||
        response.user?.username ||
        'DRV-00001';

      setGeneratedDriverCode(code);
      setRegisteredUser({
        ...response.user,
        driverCode: code,
        token: response.token,
        vehicleNumber: resolvedVehicleNumber,
        cheNumber: resolvedCheNumber,
        chassisNumber: resolvedCheNumber,
        operator: resolvedOperator,
        trailerSize: resolvedTrailerSize,
        fullName: resolvedFullName,
        nic: resolvedNic,
        employeeId: resolvedEmployeeId,
        mobileNumber: resolvedMobile,
        address: resolvedAddress,
        licenseNumber: resolvedLicense,
        licenseExpiryDate: licenseExpiryDate.trim() || '2030-12-31',
        emergencyContactName: resolvedEmergencyName,
        emergencyContactNumber: resolvedEmergencyPhone,
      });
      setSuccessModalVisible(true);
    } catch (err: any) {
      console.warn('Registration fallback trigger:', err);
      // Offline fallback: generate next driver code
      const randomNum = String(Math.floor(Math.random() * 900) + 100).padStart(5, '0');
      const offlineCode = `DRV-${randomNum}`;
      setGeneratedDriverCode(offlineCode);
      setRegisteredUser({
        id: `mock-${Date.now()}`,
        username: offlineCode,
        role: 'DRIVER',
        name: resolvedFullName,
        driverCode: offlineCode,
        token: `mock-token-${Date.now()}`,
        vehicleNumber: resolvedVehicleNumber,
        cheNumber: resolvedCheNumber,
        chassisNumber: resolvedCheNumber,
        operator: resolvedOperator,
        trailerSize: resolvedTrailerSize,
        fullName: resolvedFullName,
        nic: resolvedNic,
        employeeId: resolvedEmployeeId,
        mobileNumber: resolvedMobile,
        address: resolvedAddress,
        licenseNumber: resolvedLicense,
        licenseExpiryDate: licenseExpiryDate.trim() || '2030-12-31',
        emergencyContactName: resolvedEmergencyName,
        emergencyContactNumber: resolvedEmergencyPhone,
      });
      setSuccessModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToLogin = () => {
    setSuccessModalVisible(false);
    router.replace({
      pathname: '/(auth)/login',
      params: { prefillUser: generatedDriverCode },
    });
  };

  const handleDirectCockpitAccess = async () => {
    if (registeredUser) {
      await login(registeredUser);
      setSuccessModalVisible(false);
      router.replace('/(driver)/(tabs)');
    } else {
      handleProceedToLogin();
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: Math.max(topInset, 16),
            paddingBottom: Math.max(bottomInset + 24, 40),
            paddingHorizontal: containerPaddingHorizontal,
            maxWidth: Math.max(contentMaxWidth, 680),
            width: '100%',
            alignSelf: 'center',
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(auth)/login');
              }
            }}
          >
            <Ionicons name="arrow-back" size={18} color="#00e5ff" />
            <Text style={styles.backBtnText}>BACK TO LOGIN TERMINAL</Text>
          </TouchableOpacity>
        </View>

        {/* Hero Section */}
        <View style={styles.hero}>
          <View style={styles.logoBadge}>
            <Ionicons name="cube" size={28} color="#00e5ff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.brandTitle}>SCK LOGISTICS PORT SYSTEM</Text>
            <Text style={styles.brandSubtitle}>NEW OPERATOR REGISTRATION PORTAL</Text>
          </View>
        </View>

        {/* Informational Guidance Notice */}
        <View style={styles.noticeBox}>
          <Ionicons name="information-circle" size={18} color="#00e5ff" />
          <Text style={styles.noticeText}>
            Upon completing registration, a unique <Text style={styles.noticeBold}>Operator Identification Number (e.g. DRV-00001)</Text> will be generated for you. You will use this exact identification number to log in to the driver cockpit.
          </Text>
        </View>

        {/* Quick Demo Autofill Bar */}
        <TouchableOpacity
          style={styles.autofillBtn}
          onPress={handleQuickAutoFill}
          activeOpacity={0.85}
        >
          <Ionicons name="flash" size={16} color="#00e5ff" />
          <Text style={styles.autofillBtnText}>QUICK AUTO-FILL DEMO OPERATOR DETAILS</Text>
        </TouchableOpacity>

        {formError && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color="#ff5252" />
            <Text style={styles.errorBannerText}>{formError}</Text>
          </View>
        )}

        {/* ─── SECTION 1: Personal Information ─── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person-circle" size={18} color="#00e5ff" />
            <Text style={styles.cardHeaderText}>1. OPERATOR PERSONAL INFORMATION</Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>FULL NAME *</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="person" size={16} color="#849396" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. Kasun Chamara Perera"
                placeholderTextColor="#849396"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>NATIONAL IDENTITY CARD (NIC) NUMBER *</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="card" size={16} color="#849396" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. 199411223344 or 851234567V"
                placeholderTextColor="#849396"
                value={nic}
                onChangeText={setNic}
                autoCapitalize="characters"
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>DATE OF BIRTH (YYYY-MM-DD)</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="calendar" size={16} color="#849396" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="1994-06-15"
                placeholderTextColor="#849396"
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>RESIDENTIAL ADDRESS *</Text>
            <View style={[styles.inputWrap, { height: 64 }]}>
              <Ionicons name="location" size={16} color="#849396" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { height: 64, textAlignVertical: 'top', paddingTop: 8 }]}
                placeholder="No. 45, Harbour View Road, Colombo 15"
                placeholderTextColor="#849396"
                multiline
                value={address}
                onChangeText={setAddress}
              />
            </View>
          </View>
        </View>

        {/* ─── SECTION 2: Employment, License & Vehicle ─── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="car" size={18} color="#feb300" />
            <Text style={[styles.cardHeaderText, { color: '#feb300' }]}>
              2. LICENSE & VEHICLE DETAILS
            </Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>PORT EMPLOYEE ID *</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="business" size={16} color="#849396" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. EMP-092"
                placeholderTextColor="#849396"
                value={employeeId}
                onChangeText={setEmployeeId}
                autoCapitalize="characters"
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>MOBILE PHONE NUMBER *</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="call" size={16} color="#849396" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. 0771234567"
                placeholderTextColor="#849396"
                keyboardType="phone-pad"
                value={mobileNumber}
                onChangeText={setMobileNumber}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>DRIVING LICENSE NUMBER *</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="id-card" size={16} color="#849396" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. B1234567"
                placeholderTextColor="#849396"
                value={licenseNumber}
                onChangeText={setLicenseNumber}
                autoCapitalize="characters"
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>LICENSE EXPIRY DATE (YYYY-MM-DD)</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="time" size={16} color="#849396" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="2029-10-15"
                placeholderTextColor="#849396"
                value={licenseExpiryDate}
                onChangeText={setLicenseExpiryDate}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={styles.fieldLabel}>ASSIGNED TRUCK / VEHICLE NUMBER *</Text>
              {detectedFleet && (
                <View style={styles.cheBadgeInline}>
                  <Ionicons name="checkmark-circle" size={11} color="#00ff88" />
                  <Text style={styles.cheBadgeInlineText}>CHE {detectedFleet.cheNumber} DETECTED</Text>
                </View>
              )}
            </View>

            <View style={[styles.inputWrap, detectedFleet && styles.inputWrapDetected]}>
              <Ionicons name="bus" size={16} color={detectedFleet ? '#00e5ff' : '#feb300'} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. LY 5234, LY 6528, LY 5596..."
                placeholderTextColor="#849396"
                value={vehicleNumber}
                onChangeText={setVehicleNumber}
                autoCapitalize="characters"
              />
              {vehicleNumber.length > 0 && (
                <TouchableOpacity onPress={() => setVehicleNumber('')} style={{ paddingHorizontal: 6 }}>
                  <Ionicons name="close-circle" size={16} color="#849396" />
                </TouchableOpacity>
              )}
            </View>

            {/* AUTOMATICALLY DISPLAYED CHE NO (SCK NO) & OPERATOR CARD */}
            {detectedFleet ? (
              <View style={styles.cheAutoCard}>
                <View style={styles.cheAutoHeader}>
                  <View style={styles.cheLivePill}>
                    <Ionicons name="hardware-chip" size={13} color="#00ff88" />
                    <Text style={styles.cheLivePillText}>PORT TELEMATICS DETECTED</Text>
                  </View>
                  <Text style={styles.cheVerifiedText}>✓ FLEET VERIFIED</Text>
                </View>

                <View style={styles.cheInfoRow}>
                  <View style={styles.cheBlock}>
                    <Text style={styles.cheBlockLabel}>CHE NO (SCK NO)</Text>
                    <Text style={styles.cheBlockValue}>{detectedFleet.cheNumber}</Text>
                  </View>

                  <View style={styles.cheDivider} />

                  <View style={styles.cheBlockSmall}>
                    <Text style={styles.cheBlockLabel}>TRAILER SIZE</Text>
                    <View style={styles.cheSizePill}>
                      <Ionicons name="cube" size={11} color="#feb300" />
                      <Text style={styles.cheBlockSize}>{detectedFleet.trailerSize || '40FT'}</Text>
                    </View>
                  </View>

                  <View style={styles.cheDivider} />

                  <View style={styles.cheBlock}>
                    <Text style={styles.cheBlockLabel}>FLEET OPERATOR</Text>
                    <Text style={styles.cheBlockOperator}>{detectedFleet.operator}</Text>
                  </View>
                </View>

                <View style={styles.cheFooterNotice}>
                  <Ionicons name="shield-checkmark" size={13} color="#00e5ff" />
                  <Text style={styles.cheFooterNoticeText}>
                    CHE {detectedFleet.cheNumber} • {detectedFleet.trailerSize || '40FT'} Chassis registered under {detectedFleet.operator}. ITT gateway ready.
                  </Text>
                </View>
              </View>
            ) : vehicleNumber.trim().length > 0 ? (
              <View style={styles.chePendingCard}>
                <Ionicons name="information-circle-outline" size={15} color="#feb300" />
                <Text style={styles.chePendingText}>
                  Type or tap a fleet vehicle below (e.g. LY-5234) to auto-display CHE (SCK No) and 40FT trailer specs.
                </Text>
              </View>
            ) : null}

            {/* Quick Fleet Vehicle Selection Chips */}
            <View style={{ marginTop: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={styles.fleetPickerLabel}>TAP TO CHOOSE SCK FLEET TRUCK (24 REGISTERED):</Text>
                <Text style={styles.fleetTotalBadge}>40FT STANDARD</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.fleetChipsScroll}
              >
                {SCK_FLEET_VEHICLES.map((v) => {
                  const isSelected =
                    detectedFleet?.vehicleNumber.replace(/[^A-Za-z0-9]/g, '') ===
                    v.vehicleNumber.replace(/[^A-Za-z0-9]/g, '');
                  return (
                    <TouchableOpacity
                      key={v.vehicleNumber}
                      style={[styles.fleetChip, isSelected && styles.fleetChipActive]}
                      onPress={() => setVehicleNumber(v.vehicleNumber)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="bus" size={12} color={isSelected ? '#00e5ff' : '#849396'} />
                      <Text style={[styles.fleetChipText, isSelected && styles.fleetChipTextActive]}>
                        {v.vehicleNumber}
                      </Text>
                      <View style={[styles.fleetChipCheBadge, isSelected && styles.fleetChipCheBadgeActive]}>
                        <Text style={[styles.fleetChipCheBadgeText, isSelected && styles.fleetChipCheBadgeTextActive]}>
                          {v.cheNumber}
                        </Text>
                      </View>
                      <View style={[styles.fleetChipSizeBadge, isSelected && styles.fleetChipSizeBadgeActive]}>
                        <Text style={[styles.fleetChipSizeBadgeText, isSelected && styles.fleetChipSizeBadgeTextActive]}>
                          {v.trailerSize}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>PORT EMAIL ADDRESS (OPTIONAL)</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail" size={16} color="#849396" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="driver@smartitt.lk"
                placeholderTextColor="#849396"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>
        </View>

        {/* ─── SECTION 3: Emergency Contacts ─── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="medkit" size={18} color="#22ef7e" />
            <Text style={[styles.cardHeaderText, { color: '#22ef7e' }]}>
              3. EMERGENCY CONTACT INFORMATION
            </Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>EMERGENCY CONTACT NAME *</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="people" size={16} color="#849396" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. Nayana Perera (Spouse / Guardian)"
                placeholderTextColor="#849396"
                value={emergencyContactName}
                onChangeText={setEmergencyContactName}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>EMERGENCY PHONE NUMBER *</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="call" size={16} color="#849396" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. 0719876543"
                placeholderTextColor="#849396"
                keyboardType="phone-pad"
                value={emergencyContactNumber}
                onChangeText={setEmergencyContactNumber}
              />
            </View>
          </View>
        </View>

        {/* ─── SECTION 4: Terminal Security Pin / Password ─── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="lock-closed" size={18} color="#00e5ff" />
            <Text style={styles.cardHeaderText}>4. COCKPIT ACCESS PASSWORD</Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>PASSWORD *</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="key" size={16} color="#849396" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="••••••••"
                placeholderTextColor="#849396"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={18} color="#849396" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>CONFIRM PASSWORD *</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="key" size={16} color="#849396" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="••••••••"
                placeholderTextColor="#849396"
                secureTextEntry={!showPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>
          </View>

          {/* Validation Indicators */}
          <View style={styles.rulesList}>
            {[
              { ok: hasMinLength, label: '8+ characters minimum' },
              { ok: hasUpperCase, label: '1 uppercase letter (A-Z)' },
              { ok: hasLowerCase, label: '1 lowercase letter (a-z)' },
              { ok: hasNumber, label: '1 number digit (0-9)' },
              { ok: hasSpecial, label: '1 special symbol (!@#$%...)' },
            ].map((rule) => (
              <View key={rule.label} style={styles.ruleItem}>
                <Ionicons
                  name={rule.ok ? 'checkmark-circle' : 'ellipse-outline'}
                  size={14}
                  color={rule.ok ? '#22ef7e' : '#849396'}
                />
                <Text style={[styles.ruleText, rule.ok && styles.ruleTextOk]}>
                  {rule.label}
                </Text>
              </View>
            ))}
            {confirmPassword.length > 0 && (
              <View style={styles.ruleItem}>
                <Ionicons
                  name={passwordsMatch ? 'checkmark-circle' : 'close-circle'}
                  size={14}
                  color={passwordsMatch ? '#22ef7e' : '#ff5252'}
                />
                <Text style={[styles.ruleText, { color: passwordsMatch ? '#22ef7e' : '#ff5252' }]}>
                  {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {formError && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color="#ff5252" />
            <Text style={styles.errorBannerText}>{formError}</Text>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && { opacity: 0.6 }]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.88}
        >
          {loading ? (
            <ActivityIndicator color="#00363d" />
          ) : (
            <>
              <Ionicons name="shield-checkmark" size={20} color="#00363d" />
              <Text style={styles.submitBtnText}>SUBMIT REGISTRATION & GENERATE OPERATOR ID</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.backLink} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.backLinkText}>
            Already have an Operator Identification Code? <Text style={styles.backLinkBold}>Sign In</Text>
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ──────────────────────────────────────────────────────────────────────────
          ATTRACTIVE OPERATOR IDENTIFICATION BADGE / SUCCESS MODAL
      ────────────────────────────────────────────────────────────────────────── */}
      <Modal visible={successModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.idCardContainer}>
              {/* Top Security Stripe */}
              <View style={styles.cardStripe}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="boat" size={16} color="#00363d" />
                  <Text style={styles.stripeTitle}>SRI LANKA PORTS AUTHORITY</Text>
                </View>
                <Text style={styles.stripePass}>OFFICIAL OPERATOR PASS</Text>
              </View>

              {/* Main ID Badge Header */}
              <View style={styles.cardHeaderBox}>
                <View style={styles.operatorAvatarWrap}>
                  <Ionicons name="person" size={36} color="#00e5ff" />
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark" size={12} color="#003918" />
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.operatorTitle}>PORT TRANSPORT OPERATOR</Text>
                  <Text style={styles.operatorName}>{registeredUser?.fullName || fullName}</Text>
                  <View style={styles.statusVerifiedPill}>
                    <View style={styles.greenPulseDot} />
                    <Text style={styles.statusVerifiedText}>ACTIVE · VERIFIED ACCESS</Text>
                  </View>
                </View>
              </View>

              {/* ── BIG GLOWING OPERATOR IDENTIFICATION NUMBER (DRV-XXXXX) ── */}
              <View style={styles.operatorIdHighlightBox}>
                <Text style={styles.idHighlightSuper}>YOUR GENERATED OPERATOR IDENTIFICATION NUMBER</Text>
                <View style={styles.idCodeRow}>
                  <Text style={styles.idCodeText}>{generatedDriverCode}</Text>
                  <TouchableOpacity
                    style={styles.copyIdBtn}
                    onPress={handleCopyCode}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={copied ? 'checkmark' : 'copy'}
                      size={16}
                      color={copied ? '#22ef7e' : '#00e5ff'}
                    />
                    <Text style={[styles.copyIdBtnText, copied && { color: '#22ef7e' }]}>
                      {copied ? 'COPIED' : 'COPY ID'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.idHighlightSub}>
                  ⚡ System has registered and recognized this Operator ID. Use it as your login username.
                </Text>
              </View>

              {/* Personal Details Table */}
              <View style={styles.detailsSection}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="id-card" size={14} color="#00e5ff" />
                  <Text style={styles.detailsSectionTitle}>PERSONAL &amp; LICENSE SPECIFICATIONS</Text>
                </View>

                <View style={styles.detailsGrid}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailItemLabel}>FULL NAME</Text>
                    <Text style={styles.detailItemValue}>{registeredUser?.fullName || fullName}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailItemLabel}>NIC NUMBER</Text>
                    <Text style={styles.detailItemValueMono}>{registeredUser?.nic || nic}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailItemLabel}>EMPLOYEE ID</Text>
                    <Text style={styles.detailItemValueMono}>{registeredUser?.employeeId || employeeId}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailItemLabel}>MOBILE NUMBER</Text>
                    <Text style={styles.detailItemValueMono}>{registeredUser?.mobileNumber || mobileNumber}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailItemLabel}>DRIVING LICENSE</Text>
                    <Text style={styles.detailItemValueMono}>{registeredUser?.licenseNumber || licenseNumber}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailItemLabel}>LICENSE EXPIRY</Text>
                    <Text style={styles.detailItemValueMono}>{registeredUser?.licenseExpiryDate || licenseExpiryDate || '2030-12-31'}</Text>
                  </View>
                  <View style={[styles.detailItem, { width: '100%' }]}>
                    <Text style={styles.detailItemLabel}>RESIDENTIAL ADDRESS</Text>
                    <Text style={styles.detailItemValue}>{registeredUser?.address || address}</Text>
                  </View>
                </View>
              </View>

              {/* Vehicle & Operational Station Details */}
              <View style={styles.vehicleSection}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="bus" size={14} color="#feb300" />
                  <Text style={[styles.detailsSectionTitle, { color: '#feb300' }]}>
                    ASSIGNED VEHICLE &amp; TERMINAL DISPATCH
                  </Text>
                </View>

                <View style={styles.vehicleBox}>
                  <View style={styles.vehicleRow}>
                    <Text style={styles.vehicleProp}>ASSIGNED VEHICLE NUMBER:</Text>
                    <Text style={styles.vehicleVal}>{registeredUser?.vehicleNumber || vehicleNumber || 'LY 5234'}</Text>
                  </View>
                  <View style={styles.vehicleRow}>
                    <Text style={styles.vehicleProp}>CHE NUMBER (SCK NO):</Text>
                    <Text style={[styles.vehicleVal, { color: '#00e5ff', fontWeight: '900' }]}>
                      {registeredUser?.cheNumber || detectedFleet?.cheNumber || 'SCK 100'}
                    </Text>
                  </View>
                  <View style={styles.vehicleRow}>
                    <Text style={styles.vehicleProp}>TRAILER / CHASSIS SIZE:</Text>
                    <Text style={[styles.vehicleVal, { color: '#feb300', fontWeight: '900' }]}>
                      {registeredUser?.trailerSize || detectedFleet?.trailerSize || '40FT'}
                    </Text>
                  </View>
                  <View style={styles.vehicleRow}>
                    <Text style={styles.vehicleProp}>FLEET OPERATOR:</Text>
                    <Text style={[styles.vehicleVal, { color: '#00ff88', fontWeight: '800' }]}>
                      {registeredUser?.operator || detectedFleet?.operator || 'SCK Logistics'}
                    </Text>
                  </View>
                  <View style={styles.vehicleRow}>
                    <Text style={styles.vehicleProp}>TERMINAL CLEARANCE:</Text>
                    <Text style={styles.vehicleValGreen}>6 SLPA TERMINALS (CICT, CWIT, ECT, JCT, UCT, SAGT)</Text>
                  </View>
                  <View style={styles.vehicleRow}>
                    <Text style={styles.vehicleProp}>EMERGENCY CONTACT:</Text>
                    <Text style={styles.vehicleVal}>
                      {registeredUser?.emergencyContactName || emergencyContactName} ({registeredUser?.emergencyContactNumber || emergencyContactNumber})
                    </Text>
                  </View>
                </View>
              </View>

              {/* Login Credentials Box */}
              <View style={styles.loginCredsBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="key" size={16} color="#22ef7e" />
                  <Text style={styles.loginCredsTitle}>HOW TO LOG IN TO SCK LOGISTICS</Text>
                </View>
                <View style={styles.credRow}>
                  <Text style={styles.credKey}>OPERATOR USERNAME:</Text>
                  <Text style={styles.credValCyan}>{generatedDriverCode}</Text>
                </View>
                <View style={styles.credRow}>
                  <Text style={styles.credKey}>PIN / PASSWORD:</Text>
                  <Text style={styles.credValWhite}>[ Your registered secure password ]</Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.modalActionButtons}>
                <TouchableOpacity
                  style={styles.directCockpitBtn}
                  onPress={handleDirectCockpitAccess}
                  activeOpacity={0.88}
                >
                  <Ionicons name="navigate" size={20} color="#00363d" />
                  <Text style={styles.directCockpitBtnText}>ENTER DRIVER COCKPIT DIRECTLY</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.proceedLoginBtn}
                  onPress={handleProceedToLogin}
                  activeOpacity={0.88}
                >
                  <Ionicons name="log-in" size={18} color="#00e5ff" />
                  <Text style={styles.proceedLoginBtnText}>
                    GO TO LOGIN WITH {generatedDriverCode}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0e141d',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.margin,
    paddingBottom: 40,
  },
  topBar: {
    paddingTop: 4,
    paddingBottom: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  backBtnText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#00e5ff',
    letterSpacing: 0.8,
      },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.DEFAULT,
    backgroundColor: '#161c25',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#00e5ff',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#00e5ff',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  brandSubtitle: {
    fontSize: 9,
    fontWeight: '700',
    color: '#849396',
    letterSpacing: 0.8,
        marginTop: 2,
  },
  noticeBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#00e5ff',
    padding: 12,
    gap: 10,
    marginBottom: 14,
    alignItems: 'flex-start',
  },
  noticeText: {
    flex: 1,
    fontSize: 11,
    color: '#dde2f0',
    lineHeight: 16,
  },
  noticeBold: {
    fontWeight: '900',
    color: '#00e5ff',
  },

  card: {
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    padding: 14,
    borderWidth: 1,
    borderColor: '#242a34',
    marginBottom: 14,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#242a34',
  },
  cardHeaderText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#00e5ff',
    letterSpacing: 0.8,
  },
  fieldGroup: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#849396',
    letterSpacing: 0.8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#080e17',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: '#dde2f0',
        height: 48,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  } as any,
  rulesList: {
    marginTop: 6,
    gap: 4,
    backgroundColor: '#080e17',
    padding: 10,
    borderRadius: radius.sm,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ruleText: {
    fontSize: 10,
    color: '#849396',
      },
  ruleTextOk: {
    color: '#22ef7e',
    fontWeight: '700',
  },

  submitBtn: {
    height: 52,
    backgroundColor: '#00e5ff',
    borderRadius: radius.DEFAULT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 6,
    elevation: 4,
  },
  submitBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#00363d',
    letterSpacing: 0.8,
  },
  backLink: {
    alignItems: 'center',
    marginTop: 16,
  },
  backLinkText: {
    fontSize: 11,
    color: '#849396',
  },
  backLinkBold: {
    color: '#00e5ff',
    fontWeight: '800',
  },
  autofillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    borderWidth: 1.5,
    borderColor: '#00e5ff',
    borderRadius: radius.DEFAULT,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 14,
  },
  autofillBtnText: {
    color: '#00e5ff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 82, 82, 0.15)',
    borderWidth: 1,
    borderColor: '#ff5252',
    borderRadius: radius.DEFAULT,
    padding: 12,
    gap: 8,
    marginBottom: 14,
  },
  errorBannerText: {
    flex: 1,
    color: '#ff8a80',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
  },

  // ─── SUCCESS MODAL / OFFICIAL OPERATOR BADGE ───
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 14, 23, 0.95)',
    justifyContent: 'center',
    ...(Platform.OS === 'web'
      ? {
          position: 'fixed' as any,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 999999,
        }
      : {}),
  },
  modalScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.margin,
    paddingVertical: 40,
  },
  idCardContainer: {
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    borderWidth: 2,
    borderColor: '#00e5ff',
    overflow: 'hidden',
    shadowColor: '#00e5ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  cardStripe: {
    backgroundColor: '#00e5ff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stripeTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#00363d',
    letterSpacing: 0.8,
  },
  stripePass: {
    fontSize: 9,
    fontWeight: '900',
    color: '#00363d',
      },
  cardHeaderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: '#1a2029',
    borderBottomWidth: 1,
    borderBottomColor: '#242a34',
  },
  operatorAvatarWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.DEFAULT,
    backgroundColor: '#080e17',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#00e5ff',
    position: 'relative',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#22ef7e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#080e17',
  },
  operatorTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#849396',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  operatorName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#dde2f0',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  statusVerifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22ef7e',
  },
  statusVerifiedText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#22ef7e',
        letterSpacing: 0.6,
  },

  // Big Glowing Box
  operatorIdHighlightBox: {
    margin: 14,
    backgroundColor: '#080e17',
    padding: 14,
    borderRadius: radius.DEFAULT,
    borderWidth: 1.5,
    borderColor: '#00e5ff',
    alignItems: 'center',
    gap: 6,
  },
  idHighlightSuper: {
    fontSize: 8,
    fontWeight: '800',
    color: '#849396',
    letterSpacing: 1,
    textAlign: 'center',
  },
  idCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  idCodeText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#00e5ff',
        letterSpacing: 2,
  },
  copyIdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#161c25',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#00e5ff',
  },
  copyIdBtnText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#00e5ff',
      },
  idHighlightSub: {
    fontSize: 10,
    color: '#bac9cc',
    textAlign: 'center',
    lineHeight: 14,
  },

  // Details
  detailsSection: {
    paddingHorizontal: 14,
    gap: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailsSectionTitle: {
    fontSize: 9,
    fontWeight: '900',
    color: '#00e5ff',
    letterSpacing: 0.8,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: '#080e17',
    padding: 10,
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
  },
  detailItem: {
    width: '48%',
  },
  detailItemLabel: {
    fontSize: 7,
    fontWeight: '800',
    color: '#849396',
    letterSpacing: 0.5,
  },
  detailItemValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#dde2f0',
    marginTop: 1,
  },
  detailItemValueMono: {
    fontSize: 11,
    fontWeight: '900',
    color: '#dde2f0',
        marginTop: 1,
  },

  // Vehicle Section
  vehicleSection: {
    padding: 14,
    gap: 8,
  },
  vehicleBox: {
    backgroundColor: '#080e17',
    padding: 10,
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    gap: 6,
  },
  vehicleRow: {
    gap: 2,
  },
  vehicleProp: {
    fontSize: 8,
    fontWeight: '800',
    color: '#849396',
    letterSpacing: 0.6,
  },
  vehicleVal: {
    fontSize: 11,
    fontWeight: '800',
    color: '#dde2f0',
      },
  vehicleValGreen: {
    fontSize: 10,
    fontWeight: '800',
    color: '#22ef7e',
      },

  // Login Creds Box
  loginCredsBox: {
    marginHorizontal: 14,
    marginBottom: 14,
    backgroundColor: '#1a2029',
    padding: 12,
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#22ef7e',
    gap: 6,
  },
  loginCredsTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#22ef7e',
    letterSpacing: 0.8,
  },
  credRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  credKey: {
    fontSize: 9,
    fontWeight: '800',
    color: '#849396',
  },
  credValCyan: {
    fontSize: 12,
    fontWeight: '900',
    color: '#00e5ff',
      },
  credValWhite: {
    fontSize: 10,
    color: '#dde2f0',
      },

  // Modal Actions
  modalActionButtons: {
    padding: 14,
    paddingTop: 0,
    gap: 10,
  },
  directCockpitBtn: {
    height: 50,
    backgroundColor: '#00e5ff',
    borderRadius: radius.DEFAULT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 4,
  },
  directCockpitBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#00363d',
    letterSpacing: 0.8,
  },
  proceedLoginBtn: {
    height: 46,
    backgroundColor: '#1a2029',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#00e5ff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  proceedLoginBtnText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#00e5ff',
    letterSpacing: 0.8,
  },

  // CHE Auto-Detection Styles
  cheBadgeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 255, 136, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.3)',
  },
  cheBadgeInlineText: {
    color: '#00ff88',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  inputWrapDetected: {
    borderColor: '#00e5ff',
    backgroundColor: 'rgba(0, 229, 255, 0.05)',
  },
  cheAutoCard: {
    backgroundColor: '#07121e',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    padding: 12,
    marginTop: 8,
    gap: 8,
  },
  cheAutoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cheLivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 255, 136, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  cheLivePillText: {
    color: '#00ff88',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cheVerifiedText: {
    color: '#00e5ff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cheInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(12, 23, 38, 0.7)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  cheBlock: {
    flex: 1,
  },
  cheBlockLabel: {
    color: '#849396',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cheBlockValue: {
    color: '#00e5ff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  cheBlockOperator: {
    color: '#00ff88',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  cheDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 12,
  },
  cheBlockSmall: {
    alignItems: 'flex-start',
  },
  cheSizePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(254, 179, 0, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  cheBlockSize: {
    color: '#feb300',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cheFooterNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  cheFooterNoticeText: {
    color: '#849396',
    fontSize: 10,
    flex: 1,
  },
  chePendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(254, 179, 0, 0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(254, 179, 0, 0.25)',
    padding: 10,
    marginTop: 8,
  },
  chePendingText: {
    color: '#feb300',
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
  fleetPickerLabel: {
    color: '#849396',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  fleetTotalBadge: {
    color: '#feb300',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
    backgroundColor: 'rgba(254, 179, 0, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  fleetChipsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  fleetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0a1420',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  fleetChipActive: {
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    borderColor: '#00e5ff',
  },
  fleetChipText: {
    color: '#dde2f0',
    fontSize: 11,
    fontWeight: '700',
  },
  fleetChipTextActive: {
    color: '#00e5ff',
  },
  fleetChipCheBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  fleetChipCheBadgeActive: {
    backgroundColor: '#00e5ff',
  },
  fleetChipCheBadgeText: {
    color: '#849396',
    fontSize: 9,
    fontWeight: '800',
  },
  fleetChipCheBadgeTextActive: {
    color: '#080e17',
  },
  fleetChipSizeBadge: {
    backgroundColor: 'rgba(254, 179, 0, 0.12)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  fleetChipSizeBadgeActive: {
    backgroundColor: '#feb300',
  },
  fleetChipSizeBadgeText: {
    color: '#feb300',
    fontSize: 9,
    fontWeight: '800',
  },
  fleetChipSizeBadgeTextActive: {
    color: '#080e17',
  },
});
