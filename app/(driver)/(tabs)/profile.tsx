import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/store/authStore';
import { driverService, DriverProfile } from '../../../src/services/driverService';
import { colors, radius, spacing, shadow } from '../../../src/theme';
import { useResponsive } from '../../../src/hooks/useResponsive';

const COVER_PRESETS = [
  {
    id: 'c1',
    name: 'Port Cranes Dawn',
    url: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'c2',
    name: 'Container Yard',
    url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'c3',
    name: 'Heavy Prime Mover',
    url: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'c4',
    name: 'Harbour Night Glow',
    url: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'c5',
    name: 'Inter-Terminal Route',
    url: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=1200&q=80',
  },
];

const AVATAR_PRESETS = [
  {
    id: 'a1',
    name: 'Operator 1',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'a2',
    name: 'Operator 2',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'a3',
    name: 'Operator 3',
    url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'a4',
    name: 'Operator 4',
    url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'a5',
    name: 'Operator 5',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  },
];

export default function DriverProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const { topInset, bottomInset, contentMaxWidth, containerPaddingHorizontal } = useResponsive();

  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Photos State
  const [profilePhoto, setProfilePhoto] = useState<string | undefined>(user?.profilePhoto);
  const [coverImage, setCoverImage] = useState<string | undefined>(user?.coverImage);
  const [savingPhotos, setSavingPhotos] = useState(false);

  // Picker Modal State
  const [pickerModalVisible, setPickerModalVisible] = useState(false);
  const [pickerType, setPickerType] = useState<'avatar' | 'cover'>('avatar');
  const [customUrlInput, setCustomUrlInput] = useState('');

  const fetchProfile = useCallback(async () => {
    try {
      const driverIdentifier = user?.driverCode || user?.driverId || user?.username || 'DRV-00001';
      const data = await driverService.getProfile(driverIdentifier);
      setProfile(data);
      if (data) {
        if (data.profilePhoto) setProfilePhoto(data.profilePhoto);
        if (data.coverImage) setCoverImage(data.coverImage);
        updateUser({
          name: data.fullName,
          driverCode: data.driverCode,
          employeeId: data.employeeId,
          vehicleNumber: data.vehicleNumber,
          chassisNumber: data.chassisNumber || data.cheNumber,
          cheNumber: data.chassisNumber || data.cheNumber,
          operator: data.operator,
          nic: data.nic,
          mobileNumber: data.mobileNumber,
          email: data.email,
          address: data.address,
          licenseNumber: data.licenseNumber,
          licenseExpiryDate: data.licenseExpiryDate,
          dateOfBirth: data.dateOfBirth,
          emergencyContactName: data.emergencyContactName,
          emergencyContactNumber: data.emergencyContactNumber,
          status: data.status,
          profilePhoto: data.profilePhoto,
          coverImage: data.coverImage,
        });
      }
    } catch (err) {
      console.warn('Profile API fallback to cached state:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [updateUser]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleCopyCode = async (code: string) => {
    try {
      if (Platform.OS === 'web' && navigator?.clipboard) {
        await navigator.clipboard.writeText(code);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Sign out of SCK ITT?')) {
        logout();
        router.replace('/(auth)/login');
      }
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => { logout(); router.replace('/(auth)/login'); } },
      ]);
    }
  };

  const handleOpenPhotoPicker = (type: 'avatar' | 'cover') => {
    setPickerType(type);
    setCustomUrlInput('');
    setPickerModalVisible(true);
  };

  const handleSavePhotoChange = async (newUrl: string) => {
    const driverId = profile?.id || user?.id || user?.driverCode || 'DRV-00001';
    const nextAvatar = pickerType === 'avatar' ? newUrl : profilePhoto;
    const nextCover = pickerType === 'cover' ? newUrl : coverImage;

    if (pickerType === 'avatar') {
      setProfilePhoto(newUrl);
    } else {
      setCoverImage(newUrl);
    }
    setPickerModalVisible(false);

    setSavingPhotos(true);
    try {
      await driverService.updatePhotos(driverId, nextAvatar, nextCover);
      updateUser({ profilePhoto: nextAvatar, coverImage: nextCover });
    } catch (err) {
      console.warn('Could not persist photo change to backend:', err);
      updateUser({ profilePhoto: nextAvatar, coverImage: nextCover });
    } finally {
      setSavingPhotos(false);
    }
  };

  const handlePickLocalFile = () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const rawBase64 = event.target?.result as string;
            if (rawBase64) {
              const img = document.createElement('img');
              img.onload = () => {
                const maxDim = pickerType === 'avatar' ? 400 : 1200;
                let { width, height } = img;
                if (width > maxDim || height > maxDim) {
                  if (width > height) {
                    height = Math.round((height * maxDim) / width);
                    width = maxDim;
                  } else {
                    width = Math.round((width * maxDim) / height);
                    height = maxDim;
                  }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(img, 0, 0, width, height);
                  const compressed = canvas.toDataURL('image/jpeg', 0.85);
                  handleSavePhotoChange(compressed);
                } else {
                  handleSavePhotoChange(rawBase64);
                }
              };
              img.src = rawBase64;
            }
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      Alert.alert('File Picker', 'Select image URL or preset on mobile.');
    }
  };

  const driverCode = profile?.driverCode || user?.driverCode || user?.username || '—';
  const fullName = profile?.fullName || user?.name || '—';
  const employeeId = profile?.employeeId || user?.employeeId || '—';
  const nic = profile?.nic || user?.nic || '—';
  const mobileNumber = profile?.mobileNumber || user?.mobileNumber || '—';
  const address = profile?.address || user?.address || '—';
  const licenseNumber = profile?.licenseNumber || user?.licenseNumber || '—';
  const licenseExpiryDate = profile?.licenseExpiryDate || user?.licenseExpiryDate || '—';
  const dateOfBirth = profile?.dateOfBirth || user?.dateOfBirth || '—';
  const emergencyContactName = profile?.emergencyContactName || user?.emergencyContactName || '—';
  const emergencyContactNumber = profile?.emergencyContactNumber || user?.emergencyContactNumber || '—';
  const vehicleNumber = profile?.vehicleNumber || user?.vehicleNumber || 'LY 5234';
  const chassisNumber = profile?.chassisNumber || user?.chassisNumber || user?.cheNumber || 'SCK 100';
  const operatorName = profile?.operator || user?.operator || 'SCK Logistics';
  const email = profile?.email || user?.email || '—';
  const status = profile?.status || user?.status || 'ACTIVE';
  const isActive = status === 'ACTIVE';
  const initials = fullName !== '—' ? fullName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() : 'DR';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          maxWidth: contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
          paddingBottom: Math.max(bottomInset + 30, 48),
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchProfile(); }}
            tintColor={colors.primaryContainer}
          />
        }
      >
        {/* ─── Header with Cover Background & Editable Avatar ─── */}
        <View style={styles.header}>
          {/* Background Cover Image Banner */}
          <View style={[styles.coverBannerWrap, { height: 155 + topInset }]}>
            {coverImage ? (
              <Image source={{ uri: coverImage }} style={styles.coverImage} />
            ) : (
              <View style={styles.coverFallback}>
                <Ionicons name="boat" size={60} color="rgba(0, 229, 255, 0.12)" style={styles.coverBgIcon} />
                <Text style={styles.coverFallbackText}>SCK LOGISTICS • INTER TERMINAL FLEET</Text>
              </View>
            )}

            {/* Dark overlay for contrast */}
            <View style={styles.coverScrim} />

            {/* Edit Cover Photo Button */}
            <TouchableOpacity
              style={[styles.editCoverBtn, { top: Math.max(topInset + 10, 16) }]}
              activeOpacity={0.8}
              onPress={() => handleOpenPhotoPicker('cover')}
            >
              <Ionicons name="camera" size={14} color="#00e5ff" />
              <Text style={styles.editCoverBtnText}>Change Background</Text>
            </TouchableOpacity>
          </View>

          {/* Profile Avatar with Edit Trigger */}
          <View style={styles.avatarRow}>
            <View style={styles.avatarWrap}>
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              )}
              <View style={[styles.statusDot, { backgroundColor: isActive ? colors.primaryContainer : colors.error }]} />

              {/* Edit Avatar Badge Button */}
              <TouchableOpacity
                style={styles.editAvatarBadge}
                activeOpacity={0.85}
                onPress={() => handleOpenPhotoPicker('avatar')}
              >
                <Ionicons name="camera" size={14} color="#00363d" />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.driverName}>{fullName}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <View style={styles.operatorPill}>
              <Text style={styles.operatorPillText}>{operatorName}</Text>
            </View>
            <Text style={styles.driverRole}>Commercial Heavy Vehicle Driver</Text>
          </View>

          {/* Driver Code Pill */}
          <TouchableOpacity
            style={styles.driverCodePill}
            onPress={() => handleCopyCode(driverCode)}
            activeOpacity={0.8}
          >
            <Ionicons name="id-card-outline" size={14} color={colors.primaryFixedDim} />
            <Text style={styles.driverCodeLabel}>DRIVER CODE</Text>
            <Text style={styles.driverCodeValue}>{driverCode}</Text>
            <Ionicons
              name={copied ? 'checkmark-circle' : 'copy-outline'}
              size={15}
              color={copied ? colors.primaryContainer : colors.primaryFixedDim}
            />
          </TouchableOpacity>

          {savingPhotos && (
            <View style={styles.savingNotice}>
              <ActivityIndicator size="small" color="#00e5ff" />
              <Text style={styles.savingNoticeText}>Updating driver photos...</Text>
            </View>
          )}
        </View>

        {loading && !profile ? (
          <ActivityIndicator size="large" color={colors.primaryContainer} style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.content}>
            {/* ─── Profile Details Card ─── */}
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <Ionicons name="card-outline" size={18} color={colors.secondaryContainer} />
                <Text style={styles.cardTitle}>OFFICIAL DRIVER CREDENTIALS</Text>
                <View style={[styles.statusBadge, { backgroundColor: isActive ? 'rgba(0,229,255,0.1)' : 'rgba(255,75,75,0.1)' }]}>
                  <View style={[styles.statusDotSmall, { backgroundColor: isActive ? colors.primaryContainer : colors.error }]} />
                  <Text style={[styles.statusText, { color: isActive ? colors.primaryContainer : colors.error }]}>{status}</Text>
                </View>
              </View>

              {[
                { key: 'Driver Code', val: driverCode, icon: 'id-card-outline', highlight: true },
                { key: 'Full Name', val: fullName, icon: 'person-outline' },
                { key: 'Employee ID', val: employeeId, icon: 'business-outline', mono: true },
                { key: 'NIC Number', val: nic, icon: 'card-outline', mono: true },
                { key: 'Mobile', val: mobileNumber, icon: 'call-outline', mono: true },
                { key: 'Email', val: email, icon: 'mail-outline', mono: true },
                { key: 'Address', val: address, icon: 'location-outline' },
                { key: 'Driving License', val: licenseNumber, icon: 'car-outline', mono: true, highlight: true },
                { key: 'License Expiry', val: licenseExpiryDate, icon: 'time-outline', mono: true },
                { key: 'Date of Birth', val: dateOfBirth, icon: 'calendar-outline', mono: true },
                { key: 'Assigned Vehicle', val: vehicleNumber, icon: 'bus-outline', mono: true, vehicleColor: true },
                { key: 'CHE / Chassis No', val: chassisNumber, icon: 'hardware-chip-outline', mono: true, highlight: true },
                { key: 'Fleet Operator', val: operatorName, icon: 'shield-checkmark-outline' },
                { key: 'Emergency Contact', val: emergencyContactName, icon: 'medkit-outline' },
                { key: 'Emergency Phone', val: emergencyContactNumber, icon: 'call-outline', mono: true, warning: true },
              ].map(({ key, val, icon, mono, highlight, vehicleColor, warning }, i, arr) => (
                <View key={key} style={[styles.infoRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={styles.infoKeyRow}>
                    <Ionicons name={icon as any} size={13} color={colors.onSurfaceVariant} />
                    <Text style={styles.infoKey}>{key}</Text>
                  </View>
                  <Text style={[
                    styles.infoVal,
                    mono && styles.monoText,
                    highlight && { color: colors.secondaryContainer, fontWeight: '800' },
                    vehicleColor && { color: colors.tertiaryContainer, fontWeight: '800' },
                    warning && { color: colors.warning },
                  ]}>
                    {val}
                  </Text>
                </View>
              ))}
            </View>

            {/* ─── Sign Out ─── */}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.88}>
              <Ionicons name="log-out-outline" size={20} color={colors.white} />
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ─── PHOTO & BACKGROUND SELECTOR MODAL ─── */}
      <Modal
        visible={pickerModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPickerModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons
                  name={pickerType === 'avatar' ? 'person-circle-outline' : 'image-outline'}
                  size={20}
                  color="#00e5ff"
                />
                <Text style={styles.modalTitle}>
                  {pickerType === 'avatar' ? 'UPDATE DRIVER PHOTO' : 'UPDATE BACKGROUND IMAGE'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPickerModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={18} color="#dde2f0" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalSubheading}>
                {pickerType === 'avatar'
                  ? 'Select from commercial driver presets or upload your photo:'
                  : 'Select an official port/ITT landscape or upload a custom backdrop:'}
              </Text>

              {/* Upload Local File Action */}
              <TouchableOpacity style={styles.uploadLocalBtn} onPress={handlePickLocalFile} activeOpacity={0.85}>
                <Ionicons name="cloud-upload" size={18} color="#00363d" />
                <Text style={styles.uploadLocalBtnText}>Upload from Device / Computer</Text>
              </TouchableOpacity>

              {/* Presets Grid */}
              <Text style={styles.sectionSubtitle}>CURATED PRESETS</Text>
              <View style={styles.presetsGrid}>
                {(pickerType === 'avatar' ? AVATAR_PRESETS : COVER_PRESETS).map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.presetItem}
                    activeOpacity={0.8}
                    onPress={() => handleSavePhotoChange(item.url)}
                  >
                    <Image source={{ uri: item.url }} style={pickerType === 'avatar' ? styles.presetAvatarImg : styles.presetCoverImg} />
                    <Text style={styles.presetName} numberOfLines={1}>{item.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Custom Image URL Input */}
              <Text style={styles.sectionSubtitle}>OR ENTER IMAGE URL</Text>
              <View style={styles.urlInputRow}>
                <TextInput
                  style={styles.urlInput}
                  placeholder="https://example.com/photo.jpg"
                  placeholderTextColor="#849396"
                  value={customUrlInput}
                  onChangeText={setCustomUrlInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={[styles.applyUrlBtn, !customUrlInput.trim() && { opacity: 0.5 }]}
                  disabled={!customUrlInput.trim()}
                  onPress={() => handleSavePhotoChange(customUrlInput.trim())}
                >
                  <Text style={styles.applyUrlBtnText}>Apply</Text>
                </TouchableOpacity>
              </View>

              {/* Reset to Default */}
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => handleSavePhotoChange('')}
              >
                <Ionicons name="refresh" size={14} color="#849396" />
                <Text style={styles.resetBtnText}>Reset to Default System Theme</Text>
              </TouchableOpacity>

              <View style={{ height: 16 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    backgroundColor: colors.surfaceContainer,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.outlineVariant,
    overflow: 'hidden',
  },

  // ─── Cover Image Banner ───
  coverBannerWrap: {
    width: '100%',
    height: 155,
    backgroundColor: '#0c1522',
    position: 'relative',
    overflow: 'hidden',
  },
  coverImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverFallback: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
    backgroundColor: '#101d2c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverBgIcon: {
    position: 'absolute',
    right: 20,
    top: 20,
  },
  coverFallbackText: {
    color: '#00e5ff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    opacity: 0.7,
  },
  coverScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10, 16, 26, 0.45)',
  },
  editCoverBtn: {
    position: 'absolute',
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(8, 14, 23, 0.88)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#00e5ff',
    zIndex: 25,
    elevation: 6,
    shadowColor: '#00e5ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  editCoverBtnText: {
    color: '#00e5ff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // ─── Avatar ───
  avatarRow: {
    marginTop: -42,
    marginBottom: spacing.xs,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#161c25',
    ...shadow.glow,
  },
  avatarImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: '#00e5ff',
  },
  avatarText: {
    color: colors.onPrimaryContainer,
    fontSize: 32,
    fontWeight: '900',
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.surfaceContainer,
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#00e5ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#161c25',
  },

  driverName: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.onSurface,
    textAlign: 'center',
    marginTop: 4,
  },
  driverRole: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  operatorPill: {
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
  },
  operatorPillText: {
    color: '#00e5ff',
    fontSize: 9,
    fontWeight: '800',
  },

  driverCodePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.DEFAULT,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  driverCodeLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primaryFixedDim,
    letterSpacing: 1,
  },
  driverCodeValue: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.onSurface,
  },

  savingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  savingNoticeText: {
    color: '#00e5ff',
    fontSize: 10,
    fontWeight: '700',
  },

  content: { padding: spacing.md },

  card: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginBottom: spacing.md,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  cardTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    color: colors.onSurface,
    letterSpacing: 0.8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  statusDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  infoKeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  infoKey: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  infoVal: {
    fontSize: 12,
    color: colors.onSurface,
    fontWeight: '700',
    maxWidth: '55%',
    textAlign: 'right',
  },
  monoText: {
    letterSpacing: 0.5,
  },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 82, 82, 0.15)',
    borderWidth: 1,
    borderColor: colors.error,
    paddingVertical: 14,
    borderRadius: radius.DEFAULT,
  },
  logoutText: {
    color: colors.error,
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.5,
  },

  // ─── Modal Styles ───
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 16, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    backgroundColor: '#161c25',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#242a34',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#101721',
    borderBottomWidth: 1,
    borderBottomColor: '#242a34',
  },
  modalTitle: {
    color: '#dde2f0',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1a222f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubheading: {
    color: '#849396',
    fontSize: 11,
    marginBottom: 12,
  },
  uploadLocalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00e5ff',
    paddingVertical: 12,
    borderRadius: radius.DEFAULT,
    marginBottom: 16,
  },
  uploadLocalBtnText: {
    color: '#00363d',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    color: '#849396',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  presetItem: {
    alignItems: 'center',
    gap: 4,
    width: 80,
  },
  presetAvatarImg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#00e5ff',
  },
  presetCoverImg: {
    width: 80,
    height: 50,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#00e5ff',
  },
  presetName: {
    color: '#dde2f0',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
  urlInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  urlInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#080e17',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    paddingHorizontal: 12,
    color: '#dde2f0',
    fontSize: 11,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  } as any,
  applyUrlBtn: {
    backgroundColor: '#feb300',
    paddingHorizontal: 14,
    height: 40,
    borderRadius: radius.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyUrlBtnText: {
    color: '#00363d',
    fontWeight: '900',
    fontSize: 11,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  resetBtnText: {
    color: '#849396',
    fontSize: 11,
    fontWeight: '700',
  },
});
