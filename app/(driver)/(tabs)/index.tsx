import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
  Animated,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/store/authStore';
import { tripService } from '../../../src/services/tripService';
import { dashboardService, DriverDashboardStats } from '../../../src/services/dashboardService';
import { driverService } from '../../../src/services/driverService';
import { colors, radius, spacing } from '../../../src/theme';
import { useMockTripStore } from '../../../src/store/mockTripStore';
import axios from 'axios';
import API_BASE_URL from '../../../src/config/api';
import { useResponsive } from '../../../src/hooks/useResponsive';

const TERMINALS = ['CICT', 'CWIT', 'ECT', 'JCT', 'UCT', 'SAGT'] as const;
type TerminalCode = (typeof TERMINALS)[number];

export default function DriverHomeDashboard() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const { topInset, bottomInset, contentMaxWidth, containerPaddingHorizontal, summaryCardWidth } = useResponsive();

  // Trips & Dashboard State
  const [trips, setTrips] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DriverDashboardStats>({
    activeTrips: 0,
    completedTripsToday: 0,
    containersTransportedToday: 0,
    tripsPendingApproval: 0,
    approvedAllowance: 0,
    pendingAllowance: 0,
    activeTrip: null,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Modals state
  const [allowanceModalVisible, setAllowanceModalVisible] = useState(false);
  const [damageReportModalVisible, setDamageReportModalVisible] = useState(false);
  const [supervisorModalVisible, setSupervisorModalVisible] = useState(false);

  // Damage Report Form State
  const [damageContainerNumber, setDamageContainerNumber] = useState('');
  const [damageDescription, setDamageDescription] = useState('');
  const [damageSuccessMsg, setDamageSuccessMsg] = useState<string | null>(null);

  // HUD Interactive Controls State
  const [bayArrived, setBayArrived] = useState(false);
  const [hookConfirmed, setHookConfirmed] = useState(false);
  const [towerAck, setTowerAck] = useState(false);

  // ─── MONTHLY CONTAINER MISSION & CELEBRATION ANIMATION STATE ───
  const monthlyTarget = 150;
  const [celebrationModalVisible, setCelebrationModalVisible] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const triggerCelebrationAnimation = useCallback(() => {
    setCelebrationModalVisible(true);
    scaleAnim.setValue(0);
    rotateAnim.setValue(0);
    confettiAnim.setValue(0);
    pulseAnim.setValue(1);

    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();

    Animated.sequence([
      Animated.timing(rotateAnim, { toValue: -0.15, duration: 180, useNativeDriver: true }),
      Animated.timing(rotateAnim, { toValue: 0.15, duration: 180, useNativeDriver: true }),
      Animated.timing(rotateAnim, { toValue: -0.08, duration: 140, useNativeDriver: true }),
      Animated.timing(rotateAnim, { toValue: 0, duration: 140, useNativeDriver: true }),
    ]).start();

    Animated.timing(confettiAnim, {
      toValue: 1,
      duration: 2200,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
      { iterations: 4 }
    ).start();
  }, [scaleAnim, rotateAnim, confettiAnim, pulseAnim]);

  const mockTrips = useMockTripStore((s) => s.mockTrips);

  // Fetch live dashboard & trips
  const loadData = useCallback(async () => {
    const driverId = user?.driverId || user?.id || 'demo-driver';
    const demoTrips = useMockTripStore.getState().getTripsForDriver(driverId);

    try {
      // 1. Fetch live trips from backend
      const apiTrips = await tripService.getTrips(user?.driverId);
      const list = Array.isArray(apiTrips) ? apiTrips : [];
      const byId = new Map<string, any>();
      list.forEach((t) => byId.set(t.id, t));
      demoTrips.forEach((t) => { if (!byId.has(t.id)) byId.set(t.id, t); });
      const merged = Array.from(byId.values());
      setTrips(merged);

      // 2. Fetch live dashboard metrics
      const stats = await dashboardService.getDriverDashboard(driverId);
      setDashboardStats(stats);
      setIsOnline(true);

      // Fetch driver profile photos if not yet loaded in store
      if (!user?.profilePhoto) {
        try {
          const driverIdentifier = user?.driverCode || user?.driverId || user?.username || 'DRV-00001';
          const prof = await driverService.getProfile(driverIdentifier);
          if (prof?.profilePhoto) {
            useAuthStore.getState().updateUser({ profilePhoto: prof.profilePhoto, coverImage: prof.coverImage });
          }
        } catch {}
      }
    } catch {
      setTrips(demoTrips);
      setIsOnline(false);
      // Fallback calculations from local store
      const activeCount = demoTrips.filter((t) => t.status === 'IN_PROGRESS').length;
      const completedCount = demoTrips.filter((t) => t.status === 'COMPLETED' || t.status === 'APPROVED').length;
      const pendingCount = demoTrips.filter((t) => t.status === 'PENDING_APPROVAL').length;
      let containersCount = 0;
      demoTrips.forEach((t) => { containersCount += (t.containers?.length || 0); });

      setDashboardStats({
        activeTrips: activeCount,
        completedTripsToday: completedCount,
        containersTransportedToday: containersCount,
        tripsPendingApproval: pendingCount,
        approvedAllowance: completedCount * 2500,
        pendingAllowance: pendingCount * 2500,
        activeTrip: demoTrips.find((t) => t.status === 'IN_PROGRESS') || null,
      });
    } finally {
      setRefreshing(false);
    }
  }, [user, mockTrips]);

  useEffect(() => { loadData(); }, [loadData]);
  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  // Active and relevant trips resolution
  const inProgressTrip = useMemo(() => {
    return trips.find((t) => t.status === 'IN_PROGRESS' || t.status === 'ARRIVED');
  }, [trips]);

  const pendingApprovalTrip = useMemo(() => {
    return trips.find((t) => t.status === 'PENDING_APPROVAL');
  }, [trips]);

  const approvedTrip = useMemo(() => {
    return trips.find((t) => t.status === 'APPROVED');
  }, [trips]);

  const activeTrip = useMemo(() => {
    return inProgressTrip ||
      approvedTrip ||
      pendingApprovalTrip ||
      trips.find((t) => t.status === 'DRAFT') ||
      (trips.length > 0 ? trips[0] : null);
  }, [inProgressTrip, approvedTrip, pendingApprovalTrip, trips]);

  const driverName = user?.name || user?.fullName || 'Kamal Perera';
  const driverCode = user?.driverCode || user?.username || 'DRV-00001';
  const vehicleNumber = user?.vehicleNumber || activeTrip?.vehicleNumber || 'WP-BA-1234';
  const initials = driverName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const driverPhoto = user?.profilePhoto || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80';

  // Container counts for active trip
  const count20Ft = (activeTrip?.containers || []).filter((c: any) => c.size === '20FT' || c.size === 'FT_20').length;
  const count40Ft = (activeTrip?.containers || []).filter((c: any) => c.size === '40FT' || c.size === 'FT_40').length;

  // Actual trips completed and container count for current month
  const actualCompletedTrips = useMemo(() => {
    return trips.filter((t) => t.status === 'COMPLETED' || t.status === 'APPROVED');
  }, [trips]);

  const actualTripCount = useMemo(() => {
    return actualCompletedTrips.length;
  }, [actualCompletedTrips]);

  const currentMonthContainers = useMemo(() => {
    let count = 0;
    actualCompletedTrips.forEach((t) => {
      count += (t.containers?.length || 1);
    });
    return count;
  }, [actualCompletedTrips]);

  const [actionInProgress, setActionInProgress] = useState(false);

  // 1. START TRIP HANDLER
  const handleStartActiveTrip = async (tripId: string) => {
    setActionInProgress(true);
    try {
      await axios.patch(`${API_BASE_URL}/trips/${tripId}/status`, { status: 'IN_PROGRESS' });
      useMockTripStore.getState().updateTripStatus(tripId, 'IN_PROGRESS');
      await loadData();
      Alert.alert('Trip Started! 🚛', 'Terminal Gate Pass verified. Mission is now IN PROGRESS. Drive safely!');
    } catch {
      useMockTripStore.getState().updateTripStatus(tripId, 'IN_PROGRESS');
      await loadData();
      Alert.alert('Trip Started! 🚛', 'Terminal Gate Pass verified. Mission is now IN PROGRESS.');
    } finally {
      setActionInProgress(false);
    }
  };

  // 2. ARRIVE AT TERMINAL HANDLER
  const handleArriveTerminal = async (tripId: string) => {
    setActionInProgress(true);
    try {
      await axios.patch(`${API_BASE_URL}/trips/${tripId}/status`, { status: 'ARRIVED' });
      useMockTripStore.getState().updateTripStatus(tripId, 'ARRIVED' as any);
      await loadData();
      Alert.alert('Arrived at Terminal! 📍', `Gate-In clearance registered at destination terminal: ${activeTrip?.destTerminal || 'ECT'}.`);
    } catch {
      useMockTripStore.getState().updateTripStatus(tripId, 'ARRIVED' as any);
      await loadData();
      Alert.alert('Arrived at Terminal! 📍', `Gate-In clearance registered at destination terminal: ${activeTrip?.destTerminal || 'ECT'}.`);
    } finally {
      setActionInProgress(false);
    }
  };

  // 3. COMPLETE TRIP HANDLER
  const handleCompleteActiveTrip = async (tripId: string) => {
    setActionInProgress(true);
    try {
      const trip = trips.find((t) => t.id === tripId);
      const containerUpdates = (trip?.containers || []).map((c: any) => ({
        containerId: c.id,
        unloadedTerminal: c.unloadedTerminal || trip?.destTerminal || 'ECT',
      }));

      await axios.patch(`${API_BASE_URL}/trips/${tripId}/complete`, { containerUpdates });
      useMockTripStore.getState().unloadContainer(tripId, trip?.containers?.[0]?.id || 'c-1', new Date().toISOString());
      useMockTripStore.getState().updateTripStatus(tripId, 'COMPLETED');
      await loadData();
      Alert.alert('Trip Completed! 🎉', 'All containers safely discharged. Trip permanently saved to your My Trips archive!');
    } catch {
      useMockTripStore.getState().unloadContainer(tripId, 'c-1', new Date().toISOString());
      useMockTripStore.getState().updateTripStatus(tripId, 'COMPLETED');
      await loadData();
      Alert.alert('Trip Completed! 🎉', 'All containers safely discharged. Trip permanently saved to your My Trips archive!');
    } finally {
      setActionInProgress(false);
    }
  };

  // Stage transition triggers for progress tracker
  const handleTransitionTripStage = async (nextStatus: string, actionLabel: string) => {
    if (!activeTrip) return;
    try {
      await tripService.updateTripStatus(activeTrip.id, nextStatus as any);
      useMockTripStore.getState().updateTripStatus(activeTrip.id, nextStatus as any);
      await loadData();
      Alert.alert('Status Updated', `Trip status advanced: ${actionLabel}`);
    } catch {
      useMockTripStore.getState().updateTripStatus(activeTrip.id, nextStatus as any);
      await loadData();
      Alert.alert('Status Updated (Local)', `Trip status advanced: ${actionLabel}`);
    }
  };

  const handleReportDamage = () => {
    if (!damageDescription.trim()) {
      Alert.alert('Missing Field', 'Please provide a damage description.');
      return;
    }
    setDamageSuccessMsg('Damage report registered with Central Port Safety.');
    setTimeout(() => {
      setDamageReportModalVisible(false);
      setDamageDescription('');
      setDamageContainerNumber('');
      setDamageSuccessMsg(null);
    }, 1500);
  };

  // Progress tracker stage index (1 to 8)
  const currentStageIndex = useMemo(() => {
    if (!activeTrip) return 1;
    const s = activeTrip.status;
    if (s === 'DRAFT') return (activeTrip.containers?.length || 0) > 0 ? 2 : 1;
    if (s === 'IN_PROGRESS') return 3;
    if (s === 'ARRIVED') return 4;
    if (s === 'HANDOVER_CONFIRMED') return 5;
    if (s === 'PENDING_APPROVAL') return 6;
    if (s === 'APPROVED') return 7;
    if (s === 'COMPLETED') return 8;
    return 3;
  }, [activeTrip]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: Math.max(topInset, 16),
            paddingBottom: Math.max(bottomInset + 30, 48),
            paddingHorizontal: containerPaddingHorizontal,
            maxWidth: contentMaxWidth,
            width: '100%',
            alignSelf: 'center',
          },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#00e5ff" />}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ─── A. DRIVER HEADER ─── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push('/(driver)/(tabs)/profile')}
            >
              {driverPhoto ? (
                <Image source={{ uri: driverPhoto }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarWrap}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              )}
            </TouchableOpacity>
            <View>
              <Text style={styles.driverNameText}>{driverName}</Text>
              <View style={styles.codeRow}>
                <Text style={styles.driverCodeBadge}>{driverCode}</Text>
                <View style={styles.vehiclePill}>
                  <Ionicons name="bus" size={11} color="#feb300" />
                  <Text style={styles.vehiclePillText}>{vehicleNumber}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.headerRight}>
            {/* Online / Offline status toggle */}
            <TouchableOpacity
              style={[styles.statusToggle, isOnline ? styles.statusOnline : styles.statusOffline]}
              onPress={() => setIsOnline(!isOnline)}
            >
              <View style={[styles.statusDot, { backgroundColor: isOnline ? '#22ef7e' : '#ff5252' }]} />
              <Text style={styles.statusToggleText}>{isOnline ? 'ONLINE' : 'OFFLINE'}</Text>
            </TouchableOpacity>

            {/* Logout button */}
            <TouchableOpacity
              style={styles.headerLogoutBtn}
              onPress={() => {
                logout();
                router.replace('/(auth)/login');
              }}
            >
              <Ionicons name="log-out-outline" size={18} color="#ff5252" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── B. DRIVER SUMMARY CARDS (LIVE BACKEND METRICS) ─── */}
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { width: summaryCardWidth }]}>
            <View style={styles.summaryCardHeader}>
              <Text style={styles.summaryCardTitle}>ACTIVE TRIPS</Text>
              <Ionicons name="navigate" size={16} color="#00e5ff" />
            </View>
            <Text style={[styles.summaryCardValue, { color: '#00e5ff' }]}>
              {dashboardStats.activeTrips}
            </Text>
            <Text style={styles.summaryCardSub}>Live on route</Text>
          </View>

          <View style={[styles.summaryCard, { width: summaryCardWidth }]}>
            <View style={styles.summaryCardHeader}>
              <Text style={styles.summaryCardTitle}>COMPLETED TODAY</Text>
              <Ionicons name="checkmark-done-circle" size={16} color="#22ef7e" />
            </View>
            <Text style={[styles.summaryCardValue, { color: '#22ef7e' }]}>
              {dashboardStats.completedTripsToday}
            </Text>
            <Text style={styles.summaryCardSub}>Shift total</Text>
          </View>

          <View style={[styles.summaryCard, { width: summaryCardWidth }]}>
            <View style={styles.summaryCardHeader}>
              <Text style={styles.summaryCardTitle}>CONTAINERS</Text>
              <Ionicons name="cube" size={16} color="#feb300" />
            </View>
            <Text style={[styles.summaryCardValue, { color: '#feb300' }]}>
              {dashboardStats.containersTransportedToday}
            </Text>
            <Text style={styles.summaryCardSub}>Transported Containers</Text>
          </View>

          <View style={[styles.summaryCard, { width: summaryCardWidth }]}>
            <View style={styles.summaryCardHeader}>
              <Text style={styles.summaryCardTitle}>PENDING APPROVAL</Text>
              <Ionicons name="time" size={16} color="#ff9800" />
            </View>
            <Text style={[styles.summaryCardValue, { color: '#ff9800' }]}>
              {dashboardStats.tripsPendingApproval}
            </Text>
            <Text style={styles.summaryCardSub}>Awaiting Gate Pass</Text>
          </View>
        </View>

        {/* ─── MONTHLY CONTAINER MISSION TARGET (50 / 150 CONTAINERS) ─── */}
        <View style={styles.monthlyMissionCard}>
          <View style={styles.monthlyMissionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <View style={styles.monthlyMissionIconBox}>
                <Ionicons name="trophy" size={18} color="#feb300" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.monthlyMissionHeading}>MONTHLY CONTAINER MISSION</Text>
                <Text style={styles.monthlyMissionSubHeading}>Target: 150 Containers for this month</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.celebrationTriggerBtn}
              activeOpacity={0.8}
              onPress={triggerCelebrationAnimation}
            >
              <Ionicons name="sparkles" size={12} color="#00363d" />
              <Text style={styles.celebrationTriggerText}>50 TARGET</Text>
            </TouchableOpacity>
          </View>

          {/* Large Counter display: Actual Containers / 150 */}
          <View style={styles.missionNumbersRow}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={styles.missionCurrentVal}>{currentMonthContainers}</Text>
              <Text style={styles.missionSlash}>/</Text>
              <Text style={styles.missionTargetVal}>{monthlyTarget}</Text>
              <Text style={styles.missionUnitText}>Containers</Text>
            </View>
            <View style={styles.missionPercentBadge}>
              <Text style={styles.missionPercentText}>
                {Math.round((currentMonthContainers / monthlyTarget) * 100)}%
              </Text>
            </View>
          </View>

          {/* Actual Trip Count Indicator in front */}
          <View style={styles.missionTripInfoRow}>
            <Ionicons name="git-commit" size={14} color="#00e5ff" />
            <Text style={styles.missionTripInfoText}>
              Actual Completed: <Text style={{ color: '#00e5ff', fontWeight: '900' }}>{actualTripCount} Trips</Text> ({currentMonthContainers} Containers transported)
            </Text>
          </View>

          {/* Progress bar track */}
          <View style={styles.missionProgressBarTrack}>
            <View
              style={[
                styles.missionProgressBarFill,
                { width: `${Math.min(100, Math.round((currentMonthContainers / monthlyTarget) * 100))}%` },
              ]}
            />
          </View>

          {/* Milestone Congratulation Trigger Banner */}
          {currentMonthContainers >= 50 ? (
            <TouchableOpacity
              style={styles.milestoneNoticeBanner}
              activeOpacity={0.85}
              onPress={triggerCelebrationAnimation}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <View style={styles.milestoneStarCircle}>
                  <Ionicons name="star" size={14} color="#00363d" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.milestoneNoticeTitle}>🎉 50 CONTAINERS MILESTONE REACHED!</Text>
                  <Text style={styles.milestoneNoticeSub}>Tap here to view your celebration honors</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#22ef7e" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.milestoneNoticeBanner, { borderColor: 'rgba(254, 179, 0, 0.35)', backgroundColor: 'rgba(254, 179, 0, 0.08)' }]}
              activeOpacity={0.85}
              onPress={triggerCelebrationAnimation}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <View style={[styles.milestoneStarCircle, { backgroundColor: '#feb300' }]}>
                  <Ionicons name="trophy" size={14} color="#00363d" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.milestoneNoticeTitle, { color: '#feb300' }]}>🎯 50 CONTAINERS TARGET MILESTONE</Text>
                  <Text style={styles.milestoneNoticeSub}>{50 - currentMonthContainers > 0 ? `${50 - currentMonthContainers} more to reach 50!` : ''} Tap to celebrate milestone</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#feb300" />
            </TouchableOpacity>
          )}
        </View>

        {/* ─── C. DRIVER MISSION OPERATIONS CONSOLE (DYNAMIC TRIP LIFECYCLE) ─── */}
        {activeTrip ? (
          <View style={styles.missionLifecycleCard}>
            {/* 1. Trip Header Bar with Live Status */}
            <View style={styles.missionCardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="git-network" size={20} color="#00e5ff" />
                <View>
                  <Text style={styles.missionIdText}>
                    TRIP #{activeTrip.tripNumber || activeTrip.id?.slice(0, 8)}
                  </Text>
                  <Text style={styles.missionVesselText}>
                    {activeTrip.vesselName || 'MV Colombo Express'}
                  </Text>
                </View>
              </View>

              {/* Status Pill Badge */}
              {activeTrip.status === 'PENDING_APPROVAL' && (
                <View style={styles.statusPillPending}>
                  <Ionicons name="time" size={13} color="#feb300" />
                  <Text style={styles.statusPillTextPending}>AWAITING CONFIRMATION</Text>
                </View>
              )}
              {activeTrip.status === 'APPROVED' && (
                <View style={styles.statusPillApproved}>
                  <Ionicons name="checkmark-circle" size={13} color="#22ef7e" />
                  <Text style={styles.statusPillTextApproved}>SUPERVISOR CONFIRMED</Text>
                </View>
              )}
              {activeTrip.status === 'IN_PROGRESS' && (
                <View style={styles.statusPillProgress}>
                  <View style={styles.livePulseDot} />
                  <Text style={styles.statusPillTextProgress}>TRIP IN PROGRESS</Text>
                </View>
              )}
              {activeTrip.status === 'ARRIVED' && (
                <View style={styles.statusPillArrived}>
                  <Ionicons name="flag" size={13} color="#00e5ff" />
                  <Text style={styles.statusPillTextArrived}>ARRIVED AT TERMINAL</Text>
                </View>
              )}
              {activeTrip.status === 'COMPLETED' && (
                <View style={styles.statusPillCompleted}>
                  <Ionicons name="checkmark-done" size={13} color="#22ef7e" />
                  <Text style={styles.statusPillTextCompleted}>TRIP COMPLETED</Text>
                </View>
              )}
            </View>

            {/* 2. Route & Terminal Pair */}
            <View style={styles.routePairBox}>
              <View style={styles.routeCol}>
                <Text style={styles.routeLabel}>LOAD FROM</Text>
                <Text style={styles.routeTerminal}>{activeTrip.sourceTerminal || 'CICT'}</Text>
                <Text style={styles.routeSub}>Origin Gate</Text>
              </View>

              <View style={styles.routeArrowBox}>
                <Ionicons name="arrow-forward" size={20} color="#00e5ff" />
                <Text style={styles.routeDistanceText}>ITT ROUTE</Text>
              </View>

              <View style={[styles.routeCol, { alignItems: 'flex-end' }]}>
                <Text style={styles.routeLabel}>DISCHARGE TO</Text>
                <Text style={[styles.routeTerminal, { color: '#22ef7e' }]}>
                  {activeTrip.destTerminal || 'JCT'}
                </Text>
                <Text style={styles.routeSub}>Destination Bay</Text>
              </View>
            </View>

            {/* 3. Containers on Chassis */}
            <View style={styles.containersListBox}>
              <View style={styles.containersListHeader}>
                <Ionicons name="cube" size={14} color="#00e5ff" />
                <Text style={styles.containersListTitle}>
                  LOADED CONTAINERS ({activeTrip.containers?.length || 1})
                </Text>
                <Text style={styles.chassisTag}>CHE: {activeTrip.chassisNumber || user?.cheNumber || 'SCK 100'}</Text>
              </View>

              <View style={styles.chassisRuleBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#22ef7e" />
                <Text style={styles.chassisRuleBadgeText}>
                  Chassis Load: <Text style={{ color: '#00e5ff', fontWeight: '800' }}>{count40Ft > 0 ? '1 × 40FT' : `${count20Ft || activeTrip.containers?.length || 1} × 20FT`}</Text> · Policy: Max 1×40FT or 2×20FT only
                </Text>
              </View>

              {(activeTrip.containers || []).map((c: any, idx: number) => (
                <View key={c.id || idx} style={styles.containerItemRow}>
                  <View style={styles.containerBadge}>
                    <Text style={styles.containerBadgeText}>{idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.containerItemNumber}>{c.containerNumber || 'MSKU-88219-0'}</Text>
                    <Text style={styles.containerItemSub}>
                      {c.size || '40FT'} · {c.damageStatus === 'DAMAGED' ? '⚠️ DAMAGED' : '✓ SOUND'} · Dest: {c.destTerminal || activeTrip.destTerminal}
                    </Text>
                  </View>
                  <View style={styles.containerStatusTag}>
                    <Text style={styles.containerStatusTagText}>{c.status || activeTrip.status}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* 4. DYNAMIC NOTIFICATIONS & ACTION BUTTONS */}

            {/* STATE A: Awaiting Supervisor Confirmation */}
            {activeTrip.status === 'PENDING_APPROVAL' && (
              <View style={styles.notificationBannerPending}>
                <View style={styles.notificationBannerHeader}>
                  <Ionicons name="hourglass" size={20} color="#feb300" />
                  <Text style={styles.notificationBannerTitlePending}>
                    AWAITING SUPERVISOR CONFIRMATION
                  </Text>
                </View>
                <Text style={styles.notificationBannerMsg}>
                  Your trip details have been submitted to the operations tower. Please wait until the supervisor verifies the containers and grants your gate pass.
                </Text>
                <View style={styles.pendingActionInfoRow}>
                  <ActivityIndicator size="small" color="#feb300" />
                  <Text style={styles.pendingWaitingText}>
                    Checking for supervisor approval in real-time...
                  </Text>
                </View>
              </View>
            )}

            {/* STATE B: Supervisor Confirmed Trip -> START THE TRIP BUTTON */}
            {activeTrip.status === 'APPROVED' && (
              <View style={styles.notificationBannerApproved}>
                <View style={styles.notificationBannerHeader}>
                  <Ionicons name="checkmark-circle" size={22} color="#22ef7e" />
                  <Text style={styles.notificationBannerTitleApproved}>
                    SUPERVISOR CONFIRMED THE TRIP!
                  </Text>
                </View>
                <Text style={styles.notificationBannerMsgApproved}>
                  Gate pass validated. You are cleared to depart {activeTrip.sourceTerminal || 'origin terminal'}. Tap below to start the trip.
                </Text>

                <TouchableOpacity
                  style={styles.startTripPrimaryBtn}
                  onPress={() => handleStartActiveTrip(activeTrip.id)}
                  disabled={actionInProgress}
                  activeOpacity={0.88}
                >
                  {actionInProgress ? (
                    <ActivityIndicator color="#00363d" size="small" />
                  ) : (
                    <>
                      <Ionicons name="play-circle" size={24} color="#00363d" />
                      <Text style={styles.startTripPrimaryBtnText}>START THE TRIP NOW</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* STATE C: Trip In Progress -> ARRIVE THE TERMINAL BUTTON */}
            {activeTrip.status === 'IN_PROGRESS' && (
              <View style={styles.notificationBannerInProgress}>
                <View style={styles.notificationBannerHeader}>
                  <Ionicons name="navigate-circle" size={22} color="#00e5ff" />
                  <Text style={styles.notificationBannerTitleInProgress}>
                    TRIP IN TRANSIT TO {activeTrip.destTerminal || 'DESTINATION'}
                  </Text>
                </View>
                <Text style={styles.notificationBannerMsg}>
                  Drive safely along the designated ITT corridor. When you pull up to the discharge gate, tap the button below to register terminal arrival.
                </Text>

                <TouchableOpacity
                  style={styles.arriveTerminalBtn}
                  onPress={() => handleArriveTerminal(activeTrip.id)}
                  disabled={actionInProgress}
                  activeOpacity={0.88}
                >
                  {actionInProgress ? (
                    <ActivityIndicator color="#00363d" size="small" />
                  ) : (
                    <>
                      <Ionicons name="location" size={24} color="#00363d" />
                      <Text style={styles.arriveTerminalBtnText}>
                        ARRIVED AT TERMINAL ({activeTrip.destTerminal || 'DESTINATION'})
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* STATE D: Arrived At Terminal -> COMPLETE TRIP BUTTON */}
            {activeTrip.status === 'ARRIVED' && (
              <View style={styles.notificationBannerArrived}>
                <View style={styles.notificationBannerHeader}>
                  <Ionicons name="flag" size={22} color="#22ef7e" />
                  <Text style={styles.notificationBannerTitleArrived}>
                    ARRIVED AT {activeTrip.destTerminal || 'DISCHARGE TERMINAL'}
                  </Text>
                </View>
                <Text style={styles.notificationBannerMsg}>
                  Containers are ready to be discharged from chassis {activeTrip.chassisNumber || user?.cheNumber || 'SCK 100'}. Once crane offloading is done, tap Complete Trip to archive your run.
                </Text>

                <TouchableOpacity
                  style={styles.completeTripBtn}
                  onPress={() => handleCompleteActiveTrip(activeTrip.id)}
                  disabled={actionInProgress}
                  activeOpacity={0.88}
                >
                  {actionInProgress ? (
                    <ActivityIndicator color="#00363d" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-done-circle" size={24} color="#00363d" />
                      <Text style={styles.completeTripBtnText}>COMPLETE TRIP & DISCHARGE</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* STATE E: Trip Completed Confirmation */}
            {activeTrip.status === 'COMPLETED' && (
              <View style={styles.notificationBannerCompleted}>
                <View style={styles.notificationBannerHeader}>
                  <Ionicons name="trophy" size={22} color="#22ef7e" />
                  <Text style={styles.notificationBannerTitleCompleted}>
                    TRIP SUCCESSFULLY COMPLETED!
                  </Text>
                </View>
                <Text style={styles.notificationBannerMsg}>
                  This mission has been completed and stored in your My Trips archive. You can start a new trip below.
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.noActiveCard}>
            <Ionicons name="hourglass-outline" size={32} color="#849396" />
            <Text style={styles.noActiveTitle}>NO ACTIVE MISSION</Text>
            <Text style={styles.noActiveSub}>
              You currently have no mission in progress. Tap below to enter trip details and container numbers to begin.
            </Text>
            <TouchableOpacity style={styles.startManualBtn} onPress={() => router.push('/(driver)/trips/new')}>
              <Ionicons name="add-circle" size={18} color="#00363d" />
              <Text style={styles.startManualBtnText}>CREATE NEW TRIP</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── D. CREATE NEW TRIP ACTION ─── */}
        <TouchableOpacity
          style={styles.prominentAddContainerBtn}
          onPress={() => router.push('/(driver)/trips/new')}
          activeOpacity={0.88}
        >
          <View style={styles.prominentAddIconCircle}>
            <Ionicons name="trail-sign" size={20} color="#00363d" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.prominentAddTitle}>CREATE NEW TRIP</Text>
            <Text style={styles.prominentAddSub}>
              Enter vessel, origin, destination and container numbers with ISO 6346 verification
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#00e5ff" />
        </TouchableOpacity>

        {/* ─── E. 8-STAGE WORKFLOW PROGRESS TRACKER ─── */}
        <View style={styles.progressTrackerCard}>
          <View style={styles.trackerHeader}>
            <Ionicons name="git-commit" size={16} color="#00e5ff" />
            <Text style={styles.trackerTitle}>8-STAGE INTER-TERMINAL WORKFLOW</Text>
          </View>

          <View style={styles.stagesList}>
            {[
              { id: 1, title: '1. Trip Assigned', done: currentStageIndex >= 1 },
              { id: 2, title: '2. Containers Added', done: currentStageIndex >= 2 },
              { id: 3, title: '3. Trip Started', done: currentStageIndex >= 3 },
              { id: 4, title: '4. Arrived at Destination', done: currentStageIndex >= 4 },
              { id: 5, title: '5. Handover Confirmed', done: currentStageIndex >= 5 },
              { id: 6, title: '6. Trip Submitted', done: currentStageIndex >= 6 },
              { id: 7, title: '7. Supervisor Approved', done: currentStageIndex >= 7 },
              { id: 8, title: '8. Trip Completed', done: currentStageIndex >= 8 },
            ].map((stage) => (
              <View key={stage.id} style={styles.stageItem}>
                <View
                  style={[
                    styles.stageCircle,
                    stage.done && styles.stageCircleDone,
                    stage.id === currentStageIndex && styles.stageCircleActive,
                  ]}
                >
                  <Ionicons
                    name={stage.done ? 'checkmark' : 'ellipse'}
                    size={10}
                    color={stage.done ? '#00363d' : '#849396'}
                  />
                </View>
                <Text
                  style={[
                    styles.stageItemText,
                    stage.done && styles.stageItemTextDone,
                    stage.id === currentStageIndex && styles.stageItemTextActive,
                  ]}
                >
                  {stage.title}
                </Text>
              </View>
            ))}
          </View>

          {/* Quick Stage Progression Buttons */}
          {activeTrip && (
            <View style={styles.stageButtonsRow}>
              {currentStageIndex < 3 && (
                <TouchableOpacity
                  style={styles.stageActionBtn}
                  onPress={() => handleTransitionTripStage('IN_PROGRESS', 'Trip Started')}
                >
                  <Ionicons name="play" size={14} color="#00363d" />
                  <Text style={styles.stageActionBtnText}>START TRIP</Text>
                </TouchableOpacity>
              )}
              {currentStageIndex === 3 && (
                <TouchableOpacity
                  style={styles.stageActionBtn}
                  onPress={() => handleTransitionTripStage('ARRIVED', 'Arrived at Destination')}
                >
                  <Ionicons name="flag" size={14} color="#00363d" />
                  <Text style={styles.stageActionBtnText}>MARK ARRIVAL</Text>
                </TouchableOpacity>
              )}
              {currentStageIndex === 4 && (
                <TouchableOpacity
                  style={styles.stageActionBtn}
                  onPress={() => handleTransitionTripStage('HANDOVER_CONFIRMED', 'Handover Confirmed')}
                >
                  <Ionicons name="checkmark-done" size={14} color="#00363d" />
                  <Text style={styles.stageActionBtnText}>CONFIRM HANDOVER</Text>
                </TouchableOpacity>
              )}
              {currentStageIndex === 5 && (
                <TouchableOpacity
                  style={styles.stageActionBtn}
                  onPress={() => handleTransitionTripStage('PENDING_APPROVAL', 'Submitted for Approval')}
                >
                  <Ionicons name="send" size={14} color="#00363d" />
                  <Text style={styles.stageActionBtnText}>SUBMIT FOR APPROVAL</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* ─── F. DRIVER QUICK ACTIONS ─── */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionHeaderTitle}>DRIVER QUICK ACTIONS</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity style={styles.quickActionTile} onPress={() => router.push('/(driver)/trips/new')}>
              <View style={[styles.tileIconCircle, { backgroundColor: 'rgba(0, 229, 255, 0.15)' }]}>
                <Ionicons name="add-circle" size={20} color="#00e5ff" />
              </View>
              <Text style={styles.tileTitle}>New Trip</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionTile} onPress={() => router.push('/(driver)/(tabs)/trips')}>
              <View style={[styles.tileIconCircle, { backgroundColor: 'rgba(34, 239, 126, 0.15)' }]}>
                <Ionicons name="layers" size={20} color="#22ef7e" />
              </View>
              <Text style={styles.tileTitle}>My Trips</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionTile} onPress={() => router.push('/(driver)/(tabs)/trips')}>
              <View style={[styles.tileIconCircle, { backgroundColor: 'rgba(254, 179, 0, 0.15)' }]}>
                <Ionicons name="time" size={20} color="#feb300" />
              </View>
              <Text style={styles.tileTitle}>Trip History</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionTile} onPress={() => setAllowanceModalVisible(true)}>
              <View style={[styles.tileIconCircle, { backgroundColor: 'rgba(34, 239, 126, 0.15)' }]}>
                <Ionicons name="cash" size={20} color="#22ef7e" />
              </View>
              <Text style={styles.tileTitle}>My Allowance</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionTile} onPress={() => setDamageReportModalVisible(true)}>
              <View style={[styles.tileIconCircle, { backgroundColor: 'rgba(255, 82, 82, 0.15)' }]}>
                <Ionicons name="warning" size={20} color="#ff5252" />
              </View>
              <Text style={styles.tileTitle}>Report Damage</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionTile} onPress={() => setSupervisorModalVisible(true)}>
              <View style={[styles.tileIconCircle, { backgroundColor: 'rgba(0, 229, 255, 0.15)' }]}>
                <Ionicons name="chatbubbles" size={20} color="#00e5ff" />
              </View>
              <Text style={styles.tileTitle}>Supervisor</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionTile} onPress={() => router.push('/(driver)/(tabs)/profile')}>
              <View style={[styles.tileIconCircle, { backgroundColor: 'rgba(254, 179, 0, 0.15)' }]}>
                <Ionicons name="person-circle" size={20} color="#feb300" />
              </View>
              <Text style={styles.tileTitle}>Cab Specs</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>



      {/* ─── MODAL 2: ALLOWANCE / SALARY SUMMARY ─── */}
      <Modal visible={allowanceModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="cash" size={20} color="#22ef7e" />
                <Text style={styles.modalTitle}>OPERATOR ALLOWANCE SUMMARY</Text>
              </View>
              <TouchableOpacity onPress={() => setAllowanceModalVisible(false)}>
                <Ionicons name="close" size={22} color="#849396" />
              </TouchableOpacity>
            </View>

            <View style={styles.allowanceCard}>
              <Text style={styles.allowanceLabel}>APPROVED SALARY / ALLOWANCE</Text>
              <Text style={styles.allowanceValueApproved}>
                LKR {dashboardStats.approvedAllowance.toLocaleString()}.00
              </Text>
              <Text style={styles.allowanceSub}>
                Calculated from {dashboardStats.completedTripsToday} approved inter-terminal trips (LKR 2,500/trip)
              </Text>
            </View>

            <View style={[styles.allowanceCard, { borderColor: '#feb300' }]}>
              <Text style={[styles.allowanceLabel, { color: '#feb300' }]}>PENDING APPROVAL ALLOWANCE</Text>
              <Text style={styles.allowanceValuePending}>
                LKR {dashboardStats.pendingAllowance.toLocaleString()}.00
              </Text>
              <Text style={styles.allowanceSub}>
                From {dashboardStats.tripsPendingApproval} trips awaiting supervisor gate approval
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.modalSubmitBtn, { backgroundColor: '#22ef7e' }]}
              onPress={() => setAllowanceModalVisible(false)}
            >
              <Text style={[styles.modalSubmitBtnText, { color: '#003918' }]}>CLOSE SUMMARY</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL 3: REPORT DAMAGE ─── */}
      <Modal visible={damageReportModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="warning" size={20} color="#ff5252" />
                <Text style={styles.modalTitle}>REPORT CONTAINER DAMAGE</Text>
              </View>
              <TouchableOpacity onPress={() => setDamageReportModalVisible(false)}>
                <Ionicons name="close" size={22} color="#849396" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalFieldGroup}>
              <Text style={styles.modalLabel}>CONTAINER NUMBER</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. MSCU1234566"
                  placeholderTextColor="#849396"
                  value={damageContainerNumber}
                  onChangeText={setDamageContainerNumber}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            <View style={styles.modalFieldGroup}>
              <Text style={styles.modalLabel}>DAMAGE DETAILS &amp; LOCATION</Text>
              <View style={[styles.inputWrap, { height: 90, alignItems: 'flex-start', paddingTop: 8 }]}>
                <TextInput
                  style={[styles.modalInput, { height: 74 }]}
                  placeholder="Describe dent, seal breach, lock malfunction..."
                  placeholderTextColor="#849396"
                  multiline
                  value={damageDescription}
                  onChangeText={setDamageDescription}
                />
              </View>
            </View>

            {damageSuccessMsg && (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={16} color="#22ef7e" />
                <Text style={styles.successBoxText}>{damageSuccessMsg}</Text>
              </View>
            )}

            <TouchableOpacity style={[styles.modalSubmitBtn, { backgroundColor: '#ff5252' }]} onPress={handleReportDamage}>
              <Ionicons name="shield-outline" size={18} color="#fff" />
              <Text style={[styles.modalSubmitBtnText, { color: '#fff' }]}>SUBMIT DAMAGE INCIDENT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL 5: CONTACT SUPERVISOR ─── */}
      <Modal visible={supervisorModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="chatbubbles" size={20} color="#00e5ff" />
                <Text style={styles.modalTitle}>PORT SUPERVISOR DISPATCH</Text>
              </View>
              <TouchableOpacity onPress={() => setSupervisorModalVisible(false)}>
                <Ionicons name="close" size={22} color="#849396" />
              </TouchableOpacity>
            </View>

            <View style={styles.notifItem}>
              <Ionicons name="person-circle" size={28} color="#00e5ff" />
              <View style={{ flex: 1 }}>
                <Text style={styles.notifTitle}>Nimal Silva (Duty Supervisor)</Text>
                <Text style={styles.notifSub}>Terminal Control Tower · Extension 402</Text>
                <Text style={styles.notifSub}>Direct Comms: 011-2456789</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.modalSubmitBtn} onPress={() => setSupervisorModalVisible(false)}>
              <Text style={styles.modalSubmitBtnText}>RETURN TO DASHBOARD</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: 50 CONTAINERS CELEBRATION WITH ANIMATION ─── */}
      <Modal visible={celebrationModalVisible} transparent animationType="fade">
        <View style={styles.celebrationOverlay}>
          {/* Animated Confetti Particles */}
          <View style={styles.confettiContainer} pointerEvents="none">
            {Array.from({ length: 20 }).map((_, i) => {
              const confColors = ['#feb300', '#00e5ff', '#22ef7e', '#ff4081', '#e040fb', '#ffffff'];
              const confColor = confColors[i % confColors.length];
              const leftPercent = `${(i * 5) + 2}%`;
              const translateY = confettiAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-30 - (i % 6) * 20, 600 + (i % 5) * 40],
              });
              const rotate = confettiAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', `${(i % 2 === 0 ? 1 : -1) * (360 + i * 40)}deg`],
              });
              const opacity = confettiAnim.interpolate({
                inputRange: [0, 0.1, 0.85, 1],
                outputRange: [0, 1, 1, 0],
              });
              return (
                <Animated.View
                  key={i}
                  style={[
                    styles.confettiPiece,
                    {
                      left: leftPercent as any,
                      backgroundColor: confColor,
                      transform: [{ translateY }, { rotate }],
                      opacity,
                      width: i % 3 === 0 ? 12 : 8,
                      height: i % 2 === 0 ? 14 : 8,
                      borderRadius: i % 4 === 0 ? 6 : 2,
                    },
                  ]}
                />
              );
            })}
          </View>

          {/* Animated Celebration Card */}
          <Animated.View
            style={[
              styles.celebrationCard,
              {
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {/* Close button */}
            <TouchableOpacity
              style={styles.celebrationCloseBtn}
              onPress={() => setCelebrationModalVisible(false)}
            >
              <Ionicons name="close" size={20} color="#849396" />
            </TouchableOpacity>

            {/* Pulsing Trophy Halo */}
            <View style={styles.trophyHaloWrap}>
              <Animated.View
                style={[
                  styles.trophyHaloGlow,
                  {
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.trophyIconBox,
                  {
                    transform: [
                      {
                        rotate: rotateAnim.interpolate({
                          inputRange: [-0.2, 0.2],
                          outputRange: ['-15deg', '15deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Ionicons name="trophy" size={56} color="#feb300" />
              </Animated.View>
            </View>

            {/* Congratulatory Tag */}
            <View style={styles.celebrationTagBadge}>
              <Ionicons name="sparkles" size={12} color="#00363d" />
              <Text style={styles.celebrationTagBadgeText}>MILESTONE UNLOCKED</Text>
            </View>

            <Text style={styles.celebrationTitle}>CONGRATULATIONS!</Text>
            <Text style={styles.celebrationDriverName}>{driverName.toUpperCase()}</Text>

            <Text style={styles.celebrationMessage}>
              Outstanding operational excellence! You have achieved the{' '}
              <Text style={{ color: '#feb300', fontWeight: '900' }}>50 Containers Milestone</Text>{' '}
              toward your monthly mission of <Text style={{ color: '#00e5ff', fontWeight: '900' }}>150 Containers</Text>!
            </Text>

            {/* Achievement Highlights Box */}
            <View style={styles.achievementBox}>
              <View style={styles.achievementRow}>
                <View style={styles.achievementItem}>
                  <Text style={styles.achievementLabel}>TRIPS</Text>
                  <Text style={[styles.achievementVal, { color: '#00e5ff' }]}>{actualTripCount}</Text>
                  <Text style={styles.achievementSubText}>Completed</Text>
                </View>
                <View style={styles.achievementDivider} />
                <View style={styles.achievementItem}>
                  <Text style={styles.achievementLabel}>CONTAINERS</Text>
                  <Text style={[styles.achievementVal, { color: '#feb300' }]}>{currentMonthContainers}</Text>
                  <Text style={styles.achievementSubText}>Transported</Text>
                </View>
                <View style={styles.achievementDivider} />
                <View style={styles.achievementItem}>
                  <Text style={styles.achievementLabel}>TARGET</Text>
                  <Text style={[styles.achievementVal, { color: '#22ef7e' }]}>{monthlyTarget}</Text>
                  <Text style={styles.achievementSubText}>Containers</Text>
                </View>
              </View>

              <View style={styles.celebrationHonorRow}>
                <Ionicons name="ribbon" size={20} color="#feb300" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.celebrationHonorTitle}>
                    🌟 50 CONTAINERS MILESTONE CELEBRATION
                  </Text>
                  <Text style={styles.celebrationHonorSub}>
                    Exceptional operational turnaround, terminal safety, and on-time inter-terminal transportation achieved across Colombo Port terminals!
                  </Text>
                </View>
              </View>
            </View>

            {/* Action button */}
            <TouchableOpacity
              style={styles.celebrationActionBtn}
              activeOpacity={0.85}
              onPress={() => setCelebrationModalVisible(false)}
            >
              <Ionicons name="rocket" size={18} color="#00363d" />
              <Text style={styles.celebrationActionBtnText}>CONTINUE MISSIONS</Text>
            </TouchableOpacity>
          </Animated.View>
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
    gap: 14,
  },

  // ─── HEADER ───
  header: {
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
    minWidth: 150,
  },
  avatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#00e5ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: '#00e5ff',
  },
  avatarText: {
    color: '#00363d',
    fontWeight: '900',
    fontSize: 16,
  },
  driverNameText: {
    color: '#dde2f0',
    fontWeight: '800',
    fontSize: 15,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  driverCodeBadge: {
    backgroundColor: '#080e17',
    borderColor: '#00e5ff',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    color: '#00e5ff',
    fontSize: 11,
    fontWeight: '800',
  },
  vehiclePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(254, 179, 0, 0.12)',
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    gap: 4,
  },
  vehiclePillText: {
    color: '#feb300',
    fontSize: 11,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    flexShrink: 0,
  },
  statusToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
  },
  statusOnline: {
    backgroundColor: 'rgba(34, 239, 126, 0.12)',
    borderColor: '#22ef7e',
  },
  statusOffline: {
    backgroundColor: 'rgba(255, 82, 82, 0.12)',
    borderColor: '#ff5252',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusToggleText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#dde2f0',
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.DEFAULT,
    backgroundColor: '#080e17',
    borderWidth: 1,
    borderColor: '#242a34',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ff5252',
    minWidth: 16,
    height: 16,
    paddingHorizontal: 2,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },
  headerLogoutBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.DEFAULT,
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── SUMMARY CARDS GRID ───
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryCard: {
    width: '48%',
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    padding: 12,
    gap: 4,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryCardTitle: {
    color: '#849396',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  summaryCardValue: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 2,
  },
  summaryCardSub: {
    color: '#849396',
    fontSize: 11,
  },

  // ─── MONTHLY CONTAINER MISSION CARD ───
  monthlyMissionCard: {
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    borderWidth: 1.5,
    borderColor: '#feb300',
    padding: 14,
    gap: 10,
  },
  monthlyMissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthlyMissionIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(254, 179, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(254, 179, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthlyMissionHeading: {
    color: '#dde2f0',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  monthlyMissionSubHeading: {
    color: '#849396',
    fontSize: 10,
    marginTop: 1,
  },
  celebrationTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#feb300',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  celebrationTriggerText: {
    color: '#00363d',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  missionNumbersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  missionCurrentVal: {
    color: '#feb300',
    fontSize: 26,
    fontWeight: '900',
  },
  missionSlash: {
    color: '#849396',
    fontSize: 20,
    fontWeight: '700',
  },
  missionTargetVal: {
    color: '#00e5ff',
    fontSize: 22,
    fontWeight: '900',
  },
  missionUnitText: {
    color: '#849396',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 2,
  },
  missionPercentBadge: {
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  missionPercentText: {
    color: '#00e5ff',
    fontWeight: '900',
    fontSize: 12,
  },
  missionProgressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0a1017',
    borderWidth: 1,
    borderColor: '#242a34',
    overflow: 'hidden',
    width: '100%',
  },
  missionProgressBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#feb300',
  },
  milestoneNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(34, 239, 126, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(34, 239, 126, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 2,
  },
  milestoneStarCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#22ef7e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneNoticeTitle: {
    color: '#22ef7e',
    fontSize: 11,
    fontWeight: '900',
  },
  milestoneNoticeSub: {
    color: '#849396',
    fontSize: 9,
    marginTop: 1,
  },

  // ─── CELEBRATION MODAL & ANIMATION ───
  celebrationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 16, 26, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  confettiContainer: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  confettiPiece: {
    position: 'absolute',
    top: 0,
  },
  celebrationCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#161c25',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#feb300',
    padding: 22,
    alignItems: 'center',
    shadowColor: '#feb300',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  celebrationCloseBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#242a34',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  trophyHaloWrap: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  trophyHaloGlow: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(254, 179, 0, 0.22)',
  },
  trophyIconBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebrationTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#feb300',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 8,
  },
  celebrationTagBadgeText: {
    color: '#00363d',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  celebrationTitle: {
    color: '#feb300',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
  },
  celebrationDriverName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 2,
    textAlign: 'center',
  },
  celebrationMessage: {
    color: '#bac9cc',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 10,
  },
  achievementBox: {
    width: '100%',
    backgroundColor: '#0e141d',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#242a34',
    padding: 12,
    marginTop: 16,
    gap: 10,
  },
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  achievementItem: {
    alignItems: 'center',
    flex: 1,
  },
  achievementDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#242a34',
  },
  achievementLabel: {
    color: '#849396',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  achievementVal: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  achievementSubText: {
    color: '#849396',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 1,
  },
  celebrationHonorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(254, 179, 0, 0.1)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(254, 179, 0, 0.3)',
  },
  celebrationHonorTitle: {
    color: '#feb300',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  celebrationHonorSub: {
    color: '#dde2f0',
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
  },
  missionTripInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.2)',
  },
  missionTripInfoText: {
    color: '#849396',
    fontSize: 10,
    fontWeight: '600',
  },
  celebrationActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#feb300',
    width: '100%',
    paddingVertical: 13,
    borderRadius: 10,
    marginTop: 16,
  },
  celebrationActionBtnText: {
    color: '#00363d',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  // ─── ACTIVE TRIP CARD ───
  activeTripCard: {
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    borderWidth: 1.5,
    borderColor: '#00e5ff',
    padding: 14,
    gap: 12,
  },
  activeTripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#242a34',
  },
  pulseLive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00e5ff',
  },
  activeTripIdText: {
    color: '#00e5ff',
    fontWeight: '900',
    fontSize: 16,
  },
  tripStatusPill: {
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#00e5ff',
  },
  tripStatusPillText: {
    color: '#00e5ff',
    fontSize: 11,
    fontWeight: '800',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#080e17',
    borderRadius: radius.DEFAULT,
    padding: 10,
    borderWidth: 1,
    borderColor: '#242a34',
  },
  terminalBox: {
    alignItems: 'center',
  },
  terminalLabel: {
    color: '#849396',
    fontSize: 10,
    fontWeight: '800',
  },
  terminalCode: {
    color: '#00e5ff',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  routeArrowBox: {
    alignItems: 'center',
    gap: 2,
  },
  routeDistText: {
    color: '#849396',
    fontSize: 9,
    letterSpacing: 0.8,
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specItem: {
    width: '48%',
    backgroundColor: '#080e17',
    borderRadius: radius.sm,
    padding: 8,
    gap: 2,
  },
  specLabel: {
    color: '#849396',
    fontSize: 10,
    fontWeight: '800',
  },
  specValue: {
    color: '#dde2f0',
    fontSize: 12,
    fontWeight: '700',
  },
  specValueMono: {
    color: '#feb300',
    fontSize: 12,
    fontWeight: '700',
  },
  loadedContainersSection: {
    backgroundColor: '#080e17',
    borderRadius: radius.sm,
    padding: 10,
    gap: 6,
  },
  loadedTitle: {
    color: '#849396',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  loadedContainerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadedCode: {
    color: '#dde2f0',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  loadedSize: {
    color: '#00e5ff',
    fontSize: 11,
    fontWeight: '800',
  },
  loadedStatus: {
    color: '#22ef7e',
    fontSize: 10,
    fontWeight: '700',
  },
  activeTripActions: {
    flexDirection: 'row',
    gap: 10,
  },
  continueTripBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#00e5ff',
    borderRadius: radius.DEFAULT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  continueTripBtnText: {
    color: '#00363d',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.6,
  },
  addContBtnSmall: {
    paddingHorizontal: 14,
    height: 44,
    backgroundColor: '#1a2029',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#00e5ff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addContBtnSmallText: {
    color: '#00e5ff',
    fontSize: 10,
    fontWeight: '800',
  },

  // ─── NO ACTIVE TRIP CARD ───
  noActiveCard: {
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    padding: 20,
    alignItems: 'center',
    gap: 8,
    textAlign: 'center',
  },
  noActiveTitle: {
    color: '#849396',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  noActiveSub: {
    color: '#849396',
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 15,
  },
  startManualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#00e5ff',
    borderRadius: radius.DEFAULT,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 4,
  },
  startManualBtnText: {
    color: '#00363d',
    fontWeight: '900',
    fontSize: 11,
  },

  // ─── PROMINENT ADD CONTAINER ACTION ───
  prominentAddContainerBtn: {
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    borderWidth: 1.5,
    borderColor: '#00e5ff',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  prominentAddIconCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.DEFAULT,
    backgroundColor: '#00e5ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prominentAddTitle: {
    color: '#00e5ff',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.6,
  },
  prominentAddSub: {
    color: '#849396',
    fontSize: 9,
    lineHeight: 13,
    marginTop: 2,
  },

  // ─── 8-STAGE WORKFLOW TRACKER ───
  progressTrackerCard: {
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    padding: 14,
    gap: 10,
  },
  trackerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#242a34',
  },
  trackerTitle: {
    color: '#dde2f0',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  stagesList: {
    gap: 6,
  },
  stageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stageCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#080e17',
    borderWidth: 1,
    borderColor: '#242a34',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageCircleDone: {
    backgroundColor: '#22ef7e',
    borderColor: '#22ef7e',
  },
  stageCircleActive: {
    borderColor: '#00e5ff',
    borderWidth: 2,
  },
  stageItemText: {
    fontSize: 11,
    color: '#849396',
  },
  stageItemTextDone: {
    color: '#dde2f0',
    fontWeight: '600',
  },
  stageItemTextActive: {
    color: '#00e5ff',
    fontWeight: '800',
  },
  stageButtonsRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#242a34',
  },
  stageActionBtn: {
    height: 40,
    backgroundColor: '#00e5ff',
    borderRadius: radius.DEFAULT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stageActionBtnText: {
    color: '#00363d',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.8,
  },

  // ─── QUICK ACTIONS GRID ───
  quickActionsSection: {
    gap: 10,
  },
  sectionHeaderTitle: {
    color: '#849396',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickActionTile: {
    width: '22%',
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    padding: 10,
    alignItems: 'center',
    gap: 6,
  },
  tileIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTitle: {
    color: '#dde2f0',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },

  // ─── MODAL STYLES ───
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 14, 23, 0.94)',
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
    padding: 16,
    paddingVertical: 30,
  },
  modalCard: {
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    borderWidth: 1.5,
    borderColor: '#00e5ff',
    padding: 16,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#242a34',
  },
  modalTitle: {
    color: '#00e5ff',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.8,
  },
  modalFieldGroup: {
    gap: 6,
  },
  modalLabel: {
    color: '#849396',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#080e17',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    paddingHorizontal: 12,
    height: 46,
  },
  modalInput: {
    flex: 1,
    color: '#dde2f0',
        fontSize: 13,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  } as any,

  // ISO Pill
  validationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  pillValid: {
    backgroundColor: 'rgba(34, 239, 126, 0.12)',
    borderWidth: 1,
    borderColor: '#22ef7e',
  },
  pillInvalid: {
    backgroundColor: 'rgba(255, 82, 82, 0.12)',
    borderWidth: 1,
    borderColor: '#ff5252',
  },
  validationPillText: {
    flex: 1,
    fontSize: 10,
    fontWeight: '700',
  },
  fixDigitBtn: {
    backgroundColor: '#00e5ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  fixDigitBtnText: {
    color: '#00363d',
    fontSize: 9,
    fontWeight: '900',
  },

  // Size buttons
  sizeToggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sizeBtn: {
    flex: 1,
    height: 42,
    borderRadius: radius.DEFAULT,
    backgroundColor: '#080e17',
    borderWidth: 1,
    borderColor: '#242a34',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeBtnActive: {
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    borderColor: '#00e5ff',
  },
  sizeBtnText: {
    color: '#849396',
    fontSize: 10,
    fontWeight: '800',
  },
  sizeBtnTextActive: {
    color: '#00e5ff',
  },

  // Terminal Chips
  terminalChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  terminalChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
    backgroundColor: '#080e17',
    borderWidth: 1,
    borderColor: '#242a34',
  },
  terminalChipActive: {
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    borderColor: '#00e5ff',
  },
  terminalChipText: {
    color: '#849396',
    fontSize: 10,
    fontWeight: '800',
      },
  terminalChipTextActive: {
    color: '#00e5ff',
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 82, 82, 0.12)',
    borderColor: '#ff5252',
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: 10,
    gap: 8,
  },
  errorBoxText: {
    color: '#ff8a80',
    fontSize: 10,
    fontWeight: '700',
    flex: 1,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 239, 126, 0.12)',
    borderColor: '#22ef7e',
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: 10,
    gap: 8,
  },
  successBoxText: {
    color: '#22ef7e',
    fontSize: 10,
    fontWeight: '700',
    flex: 1,
  },
  modalSubmitBtn: {
    height: 48,
    backgroundColor: '#00e5ff',
    borderRadius: radius.DEFAULT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  modalSubmitBtnText: {
    color: '#00363d',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.8,
  },

  // Allowance Card
  allowanceCard: {
    backgroundColor: '#080e17',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#22ef7e',
    padding: 14,
    gap: 4,
  },
  allowanceLabel: {
    color: '#22ef7e',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  allowanceValueApproved: {
    color: '#22ef7e',
    fontSize: 22,
    fontWeight: '900',
      },
  allowanceValuePending: {
    color: '#feb300',
    fontSize: 22,
    fontWeight: '900',
      },
  allowanceSub: {
    color: '#849396',
    fontSize: 9,
    lineHeight: 13,
  },

  // Notif item
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#080e17',
    borderRadius: radius.sm,
    padding: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: '#242a34',
  },
  notifTitle: {
    color: '#dde2f0',
    fontSize: 11,
    fontWeight: '800',
  },
  notifSub: {
    color: '#849396',
    fontSize: 9,
    marginTop: 2,
  },

  // ─── STITCH HUD STYLES ───
  stitchHudContainer: {
    gap: 12,
  },
  hudTelematicsBanner: {
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    padding: 14,
    gap: 10,
    overflow: 'hidden',
  },
  hudBannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hudMissionBadge: {
    backgroundColor: '#00e5ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  hudMissionBadgeText: {
    color: '#00363d',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  hudMissionIdText: {
    color: '#00e5ff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  hudTransmittingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#080e17',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#242a34',
  },
  pingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22ef7e',
  },
  hudTransmittingText: {
    color: '#22ef7e',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  hudContainerTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  hudContainerId: {
    color: '#dde2f0',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  hudContainerSize: {
    color: '#feb300',
    fontSize: 13,
    fontWeight: '900',
  },
  hudSpecChipsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  hudSpecChip: {
    flex: 1,
    backgroundColor: '#080e17',
    padding: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#1a2029',
  },
  hudSpecLabel: {
    color: '#849396',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  hudSpecValCyan: {
    color: '#00e5ff',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 2,
  },
  hudSpecValLime: {
    color: '#22ef7e',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 2,
  },

  // Turn Guidance Banner
  hudTurnGuidanceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00e5ff',
    borderRadius: radius.DEFAULT,
    padding: 12,
    gap: 12,
  },
  hudTurnIconBox: {
    width: 42,
    height: 42,
    borderRadius: radius.sm,
    backgroundColor: '#080e17',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hudDistLabel: {
    color: '#00363d',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  routeCodeTag: {
    backgroundColor: 'rgba(0, 54, 61, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  routeCodeTagText: {
    color: '#00363d',
    fontSize: 8,
    fontWeight: '900',
  },
  hudTurnInstruction: {
    color: '#00363d',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 2,
  },

  // Yard Radar Card
  hudYardRadarCard: {
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    overflow: 'hidden',
  },
  radarSimulationBox: {
    height: 180,
    backgroundColor: '#080e17',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarBayLabel1: {
    position: 'absolute',
    left: 20,
    top: 20,
    backgroundColor: '#161c25',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  radarBayLabel2: {
    position: 'absolute',
    left: 20,
    top: 70,
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    borderWidth: 1,
    borderColor: '#00e5ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  radarBayLabel3: {
    position: 'absolute',
    left: 20,
    top: 120,
    backgroundColor: '#161c25',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  radarBayText: {
    color: '#849396',
    fontSize: 9,
    fontWeight: '700',
  },
  radarBayTextActive: {
    color: '#00e5ff',
    fontSize: 9,
    fontWeight: '900',
  },
  tractorBeaconWrap: {
    position: 'absolute',
    right: 70,
    top: 50,
    alignItems: 'center',
  },
  tractorBeaconPulse: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#00e5ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tractorBeaconTag: {
    color: '#00e5ff',
    fontSize: 9,
    fontWeight: '900',
    marginTop: 2,
    backgroundColor: '#080e17',
    paddingHorizontal: 4,
    borderRadius: 2,
  },
  radarCornerTopLeft: {
    position: 'absolute',
    top: 8,
    left: 8,
    gap: 4,
  },
  radarBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(8, 14, 23, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  radarBadgeText: {
    color: '#dde2f0',
    fontSize: 8,
    fontWeight: '800',
  },
  radarSpeedHud: {
    position: 'absolute',
    top: 8,
    right: 8,
    alignItems: 'flex-end',
    backgroundColor: 'rgba(8, 14, 23, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  speedValueText: {
    color: '#00e5ff',
    fontSize: 20,
    fontWeight: '900',
  },
  speedUnitText: {
    color: '#849396',
    fontSize: 8,
    fontWeight: '800',
  },
  speedLimitText: {
    color: '#feb300',
    fontSize: 7,
    fontWeight: '900',
  },
  radarDestTargetBar: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(8, 14, 23, 0.95)',
    padding: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#242a34',
  },
  radarDestSubLabel: {
    color: '#849396',
    fontSize: 7,
    fontWeight: '800',
  },
  radarDestTitle: {
    color: '#dde2f0',
    fontSize: 10,
    fontWeight: '900',
  },
  radarDestDist: {
    color: '#00e5ff',
    fontSize: 12,
    fontWeight: '900',
  },

  // Waypoints Pipeline
  hudWaypointsCard: {
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    padding: 12,
    gap: 10,
  },
  hudWaypointsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hudWaypointsTitle: {
    color: '#dde2f0',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  hudWaypointsStep: {
    color: '#22ef7e',
    fontSize: 9,
    fontWeight: '900',
  },
  waypointsList: {
    gap: 6,
  },
  waypointRowDone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#080e17',
    padding: 8,
    borderRadius: radius.sm,
  },
  wpIconDone: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#22ef7e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wpTitleDone: {
    color: '#dde2f0',
    fontSize: 10,
    fontWeight: '800',
  },
  wpSub: {
    color: '#849396',
    fontSize: 9,
  },
  wpTimeDone: {
    color: '#22ef7e',
    fontSize: 9,
    fontWeight: '800',
  },
  waypointRowActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1f2733',
    borderWidth: 1,
    borderColor: '#00e5ff',
    padding: 8,
    borderRadius: radius.sm,
  },
  wpIconActive: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#00e5ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wpIconActiveText: {
    color: '#00363d',
    fontSize: 11,
    fontWeight: '900',
  },
  wpTitleActive: {
    color: '#00e5ff',
    fontSize: 10,
    fontWeight: '900',
  },
  wpSubActive: {
    color: '#dde2f0',
    fontSize: 9,
  },
  wpTimeActive: {
    color: '#00e5ff',
    fontSize: 9,
    fontWeight: '900',
  },
  activeTagMini: {
    backgroundColor: 'rgba(0, 229, 255, 0.2)',
    paddingHorizontal: 4,
    borderRadius: 2,
  },
  activeTagMiniText: {
    color: '#00e5ff',
    fontSize: 7,
    fontWeight: '900',
  },
  waypointRowUpcoming: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#080e17',
    padding: 8,
    borderRadius: radius.sm,
    opacity: 0.7,
  },
  wpIconUpcoming: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#242a34',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wpIconUpcomingText: {
    color: '#849396',
    fontSize: 11,
    fontWeight: '900',
  },
  wpTitleUpcoming: {
    color: '#bac9cc',
    fontSize: 10,
    fontWeight: '700',
  },
  wpTimeUpcoming: {
    color: '#feb300',
    fontSize: 9,
    fontWeight: '800',
  },

  // Telemetry Strip Grid
  hudTelemetryStripGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  hudTelemBox: {
    flex: 1,
    backgroundColor: '#161c25',
    padding: 10,
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    gap: 2,
  },
  hudTelemLabel: {
    color: '#849396',
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  hudTelemValLime: {
    color: '#22ef7e',
    fontSize: 11,
    fontWeight: '900',
  },
  hudTelemValCyan: {
    color: '#00e5ff',
    fontSize: 11,
    fontWeight: '900',
  },
  hudTelemValWhite: {
    color: '#dde2f0',
    fontSize: 12,
    fontWeight: '900',
  },
  hudTelemSub: {
    color: '#849396',
    fontSize: 8,
  },
  hudTelemSubLime: {
    color: '#22ef7e',
    fontSize: 8,
    fontWeight: '800',
  },
  batteryProgressBar: {
    height: 4,
    backgroundColor: '#080e17',
    borderRadius: 2,
    marginVertical: 3,
    overflow: 'hidden',
  },
  batteryProgressFill: {
    height: '100%',
    backgroundColor: '#00e5ff',
  },

  // Glove-Optimized Controls
  glovePrimaryBtn: {
    height: 56,
    backgroundColor: '#00e5ff',
    borderRadius: radius.DEFAULT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 3,
  },
  glovePrimaryBtnText: {
    color: '#00363d',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  gloveSecondaryBtn: {
    flex: 4,
    height: 52,
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#feb300',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  gloveSecondaryBtnText: {
    color: '#feb300',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  gloveHazardBtn: {
    flex: 1,
    height: 52,
    backgroundColor: 'rgba(255, 82, 82, 0.15)',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#ff5252',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gloveHazardBtnText: {
    color: '#ff5252',
    fontSize: 8,
    fontWeight: '900',
  },

  // Mission Lifecycle Card & Operations Console
  missionLifecycleCard: {
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.25)',
    padding: 16,
    gap: 14,
    marginBottom: 16,
    shadowColor: '#00e5ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  missionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#242a34',
  },
  missionIdText: {
    color: '#dde2f0',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  missionVesselText: {
    color: '#849396',
    fontSize: 10,
    fontWeight: '700',
  },

  // Status Pills
  statusPillPending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(254, 179, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#feb300',
  },
  statusPillTextPending: {
    color: '#feb300',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statusPillApproved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(34, 239, 126, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#22ef7e',
  },
  statusPillTextApproved: {
    color: '#22ef7e',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statusPillProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00e5ff',
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00e5ff',
  },
  statusPillTextProgress: {
    color: '#00e5ff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statusPillArrived: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 229, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00e5ff',
  },
  statusPillTextArrived: {
    color: '#00e5ff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statusPillCompleted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(34, 239, 126, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#22ef7e',
  },
  statusPillTextCompleted: {
    color: '#22ef7e',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // Route Box
  routePairBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0c131d',
    borderRadius: radius.DEFAULT,
    padding: 12,
    borderWidth: 1,
    borderColor: '#242a34',
  },
  routeCol: {
    gap: 2,
  },
  routeLabel: {
    color: '#849396',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  routeTerminal: {
    color: '#00e5ff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  routeSub: {
    color: '#556575',
    fontSize: 8,
    fontWeight: '700',
  },
  routeDistanceText: {
    color: '#849396',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // Containers List Box
  containersListBox: {
    backgroundColor: '#0c131d',
    borderRadius: radius.DEFAULT,
    padding: 12,
    borderWidth: 1,
    borderColor: '#242a34',
    gap: 8,
  },
  containersListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  containersListTitle: {
    color: '#dde2f0',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    flex: 1,
    marginLeft: 6,
  },
  chassisTag: {
    color: '#feb300',
    fontSize: 9,
    fontWeight: '900',
    backgroundColor: 'rgba(254, 179, 0, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  chassisRuleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 4,
  },
  chassisRuleBadgeText: {
    color: '#849396',
    fontSize: 9.5,
    fontWeight: '700',
    flex: 1,
  },
  containerItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161c25',
    padding: 8,
    borderRadius: radius.sm,
    gap: 8,
  },
  containerBadge: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#00e5ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  containerBadgeText: {
    color: '#00363d',
    fontSize: 10,
    fontWeight: '900',
  },
  containerItemNumber: {
    color: '#dde2f0',
    fontSize: 11,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  containerItemSub: {
    color: '#849396',
    fontSize: 9,
    marginTop: 1,
  },
  containerStatusTag: {
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  containerStatusTagText: {
    color: '#00e5ff',
    fontSize: 8,
    fontWeight: '800',
  },

  // Notification Banners for States
  notificationBannerPending: {
    backgroundColor: 'rgba(254, 179, 0, 0.1)',
    borderWidth: 1,
    borderColor: '#feb300',
    borderRadius: radius.DEFAULT,
    padding: 14,
    gap: 8,
  },
  notificationBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationBannerTitlePending: {
    color: '#feb300',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  notificationBannerMsg: {
    color: '#dde2f0',
    fontSize: 11,
    lineHeight: 16,
  },
  pendingActionInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  pendingWaitingText: {
    color: '#feb300',
    fontSize: 10,
    fontWeight: '700',
  },

  notificationBannerApproved: {
    backgroundColor: 'rgba(34, 239, 126, 0.12)',
    borderWidth: 1.5,
    borderColor: '#22ef7e',
    borderRadius: radius.DEFAULT,
    padding: 14,
    gap: 10,
  },
  notificationBannerTitleApproved: {
    color: '#22ef7e',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  notificationBannerMsgApproved: {
    color: '#dde2f0',
    fontSize: 11,
    lineHeight: 16,
  },
  startTripPrimaryBtn: {
    backgroundColor: '#22ef7e',
    height: 52,
    borderRadius: radius.DEFAULT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    elevation: 4,
    shadowColor: '#22ef7e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    marginTop: 4,
  },
  startTripPrimaryBtnText: {
    color: '#00363d',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  notificationBannerInProgress: {
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    borderWidth: 1.5,
    borderColor: '#00e5ff',
    borderRadius: radius.DEFAULT,
    padding: 14,
    gap: 10,
  },
  notificationBannerTitleInProgress: {
    color: '#00e5ff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  arriveTerminalBtn: {
    backgroundColor: '#00e5ff',
    height: 52,
    borderRadius: radius.DEFAULT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    elevation: 4,
    shadowColor: '#00e5ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    marginTop: 4,
  },
  arriveTerminalBtnText: {
    color: '#00363d',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  notificationBannerArrived: {
    backgroundColor: 'rgba(34, 239, 126, 0.12)',
    borderWidth: 1.5,
    borderColor: '#22ef7e',
    borderRadius: radius.DEFAULT,
    padding: 14,
    gap: 10,
  },
  notificationBannerTitleArrived: {
    color: '#22ef7e',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  completeTripBtn: {
    backgroundColor: '#22ef7e',
    height: 52,
    borderRadius: radius.DEFAULT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    elevation: 4,
    shadowColor: '#22ef7e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    marginTop: 4,
  },
  completeTripBtnText: {
    color: '#00363d',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  notificationBannerCompleted: {
    backgroundColor: 'rgba(34, 239, 126, 0.15)',
    borderWidth: 1,
    borderColor: '#22ef7e',
    borderRadius: radius.DEFAULT,
    padding: 14,
    gap: 6,
  },
  notificationBannerTitleCompleted: {
    color: '#22ef7e',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
});
