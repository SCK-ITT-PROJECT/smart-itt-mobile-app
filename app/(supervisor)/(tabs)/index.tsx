import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/store/authStore';
import { tripService } from '../../../src/services/tripService';
import { dashboardService, SupervisorDashboardStats } from '../../../src/services/dashboardService';
import { driverService, DriverProfile } from '../../../src/services/driverService';
import { useMockTripStore } from '../../../src/store/mockTripStore';
import { colors, radius, spacing } from '../../../src/theme';
import { resolveCheNumber, resolveOperator, findFleetVehicle } from '../../../src/config/fleet';
import { useResponsive } from '../../../src/hooks/useResponsive';


const DRIVER_PHOTO_POOL = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1528892952291-009c663ce843?auto=format&fit=crop&w=300&q=80',
];

export default function SupervisorHomeDashboard() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const { topInset, bottomInset, contentMaxWidth, containerPaddingHorizontal, isSmallMobile, isMobile } = useResponsive();

  const metricCardWidth = isSmallMobile ? '100%' : isMobile ? '48%' : '31.5%';

  // Data States
  const [stats, setStats] = useState<SupervisorDashboardStats>({
    totalTripsToday: 0,
    activeTrips: 0,
    tripsPendingApproval: 0,
    completedTripsToday: 0,
    approvedTrips: 0,
    rejectedTrips: 0,
    totalContainersTransportedToday: 0,
    registeredDrivers: 0,
    activeDrivers: 0,
    terminalWiseTrips: {
      CICT: 0,
      CWIT: 0,
      ECT: 0,
      JCT: 0,
      UCT: 0,
      SAGT: 0,
    },
  });
  const [trips, setTrips] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [refreshing, setRefreshing] = useState(false);


  // Terminal Consolidated Panel Filter States (Weekly, Monthly, Daily)
  const [terminalPanelPeriod, setTerminalPanelPeriod] = useState<'WEEKLY' | 'MONTHLY' | 'TODAY' | 'ALL'>('WEEKLY');
  const [terminalPanelTrafficType, setTerminalPanelTrafficType] = useState<'ALL' | 'ORIGIN' | 'DESTINATION'>('ALL');

  // Modal States
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [tripToReject, setTripToReject] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);

  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [damageReviewModalVisible, setDamageReviewModalVisible] = useState(false);

  const mockTrips = useMockTripStore((s) => s.mockTrips);

  // Fetch live supervisor data
  const loadDashboardData = useCallback(async () => {
    try {
      // 1. Fetch live dashboard metrics
      const dashMetrics = await dashboardService.getSupervisorDashboard();
      setStats(dashMetrics);

      // 2. Fetch live trips from backend
      const apiTrips = await tripService.getTrips();
      const tripList = Array.isArray(apiTrips) ? apiTrips : [];
      const byId = new Map<string, any>();
      tripList.forEach((t) => byId.set(t.id, t));
      mockTrips.forEach((t) => { if (!byId.has(t.id)) byId.set(t.id, t); });
      setTrips(Array.from(byId.values()));

      // 3. Fetch registered drivers
      try {
        const driversList = await driverService.getAllDrivers();
        setDrivers(Array.isArray(driversList) ? driversList : []);
      } catch {
        // Fallback demo drivers
        setDrivers([
          {
            id: 'drv-1',
            driverCode: 'DRV-00001',
            username: 'DRV-00001',
            fullName: 'Kamal Perera',
            employeeId: 'DRV001',
            nic: '198512345678',
            mobileNumber: '0779876543',
            vehicleNumber: 'LY 5234',
            chassisNumber: 'SCK 100',
            cheNumber: 'SCK 100',
            operator: 'SCK Logistics',
            status: 'ACTIVE',
          },
          {
            id: 'drv-2',
            driverCode: 'DRV-00002',
            username: 'DRV-00002',
            fullName: 'Kasun Chamara Perera',
            employeeId: 'EMP-3273',
            nic: '19923273042V',
            mobileNumber: '077327321',
            vehicleNumber: 'LY 5235',
            chassisNumber: 'SCK 101',
            cheNumber: 'SCK 101',
            operator: 'SCK Logistics',
            status: 'ACTIVE',
          },
          {
            id: 'drv-3',
            driverCode: 'DRV-00003',
            username: 'DRV-00003',
            fullName: 'Saman Kumara Wickramasinghe',
            employeeId: 'EMP-8227',
            nic: '19888227042V',
            mobileNumber: '077822712',
            vehicleNumber: 'LY 5236',
            chassisNumber: 'SCK 102',
            cheNumber: 'SCK 102',
            operator: 'SCK Logistics',
            status: 'ACTIVE',
          },
        ]);
      }
    } catch (e) {
      console.warn('Dashboard loading fallback:', e);
      setTrips(mockTrips);
    } finally {
      setRefreshing(false);
    }
  }, [mockTrips]);

  useEffect(() => { loadDashboardData(); }, [loadDashboardData]);

  const supervisorName = user?.name || user?.fullName || 'Nimal Silva';
  const supervisorInitials = supervisorName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const currentDateFormatted = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).toUpperCase();


  // Terminal-Wise Consolidated Analytics with Weekly & Monthly Filtering
  const terminalWiseStats = useMemo(() => {
    const terminals = ['CICT', 'CWIT', 'ECT', 'JCT', 'UCT', 'SAGT'];
    const now = new Date();

    // 1. Filter trips based on the chosen period
    const periodTrips = trips.filter((t) => {
      const rawDate = t.operationDate || t.startTime || t.createdAt;
      if (!rawDate) return true;
      const tripDate = new Date(rawDate);
      if (isNaN(tripDate.getTime())) return true;

      if (terminalPanelPeriod === 'TODAY') {
        return (
          tripDate.getDate() === now.getDate() &&
          tripDate.getMonth() === now.getMonth() &&
          tripDate.getFullYear() === now.getFullYear()
        );
      } else if (terminalPanelPeriod === 'WEEKLY') {
        const diffMs = now.getTime() - tripDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 7;
      } else if (terminalPanelPeriod === 'MONTHLY') {
        const diffMs = now.getTime() - tripDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 30;
      }
      return true; // 'ALL'
    });

    // 2. Aggregate per terminal
    const res: Record<string, { totalTrips: number; containers: number; originTrips: number; destTrips: number }> = {};
    terminals.forEach((term) => {
      res[term] = { totalTrips: 0, containers: 0, originTrips: 0, destTrips: 0 };
    });

    periodTrips.forEach((t) => {
      const orig = t.sourceTerminal;
      const dest = t.destTerminal;
      const cCount = t.containers?.length || 1;

      if (orig && res[orig]) {
        res[orig].originTrips += 1;
        if (terminalPanelTrafficType === 'ALL' || terminalPanelTrafficType === 'ORIGIN') {
          res[orig].totalTrips += 1;
          res[orig].containers += cCount;
        }
      }
      if (dest && res[dest]) {
        res[dest].destTrips += 1;
        if (terminalPanelTrafficType === 'ALL' || terminalPanelTrafficType === 'DESTINATION') {
          res[dest].totalTrips += 1;
          res[dest].containers += cCount;
        }
      }
    });

    const grandTotalTrips = periodTrips.length;
    const grandTotalContainers = periodTrips.reduce((acc, t) => acc + (t.containers?.length || 1), 0);

    return {
      perTerminal: res,
      periodTripsCount: periodTrips.length,
      grandTotalTrips,
      grandTotalContainers,
    };
  }, [trips, terminalPanelPeriod, terminalPanelTrafficType]);

  // Trips pending supervisor approval
  const pendingTrips = useMemo(() => {
    return trips.filter((t) => t.status === 'PENDING_APPROVAL');
  }, [trips]);

  // Approval actions
  const handleApproveTrip = async (trip: any) => {
    try {
      await tripService.approveTrip(trip.id, user?.id || 'sup-001', 'Approved by Operations Supervisor');
      useMockTripStore.getState().updateTripStatus(trip.id, 'APPROVED');
      Alert.alert('Gate Pass Approved', `Trip ${trip.tripNumber || trip.id} is approved.`);
      await loadDashboardData();
    } catch {
      useMockTripStore.getState().updateTripStatus(trip.id, 'APPROVED');
      Alert.alert('Gate Pass Approved (Local)', `Trip ${trip.tripNumber || trip.id} is approved.`);
      await loadDashboardData();
    }
  };

  const handleOpenRejectModal = (trip: any) => {
    setTripToReject(trip);
    setRejectionReason('');
    setRejectModalVisible(true);
  };

  const handleConfirmRejection = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert('Mandatory Reason', 'Please provide a reason for rejecting this trip submission.');
      return;
    }

    setSubmittingDecision(true);
    try {
      await tripService.rejectTrip(tripToReject.id, user?.id || 'sup-001', rejectionReason.trim());
      useMockTripStore.getState().updateTripStatus(tripToReject.id, 'REJECTED');
      setRejectModalVisible(false);
      Alert.alert('Trip Rejected', `Trip ${tripToReject.tripNumber} rejected: ${rejectionReason}`);
      await loadDashboardData();
    } catch {
      useMockTripStore.getState().updateTripStatus(tripToReject.id, 'REJECTED');
      setRejectModalVisible(false);
      Alert.alert('Trip Rejected (Local)', `Trip ${tripToReject.tripNumber} rejected.`);
      await loadDashboardData();
    } finally {
      setSubmittingDecision(false);
    }
  };

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
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDashboardData(); }} tintColor="#00e5ff" />}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── A. SUPERVISOR HEADER ─── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{supervisorInitials}</Text>
            </View>
            <View>
              <Text style={styles.supervisorNameText}>{supervisorName}</Text>
              <View style={styles.roleDateRow}>
                <View style={styles.rolePill}>
                  <Text style={styles.rolePillText}>PORT OPERATIONS SUPERVISOR</Text>
                </View>
                <Text style={styles.dateText}>{currentDateFormatted}</Text>
              </View>
            </View>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerIconBtn} onPress={() => setNotificationsModalVisible(true)}>
              <Ionicons name="notifications" size={18} color="#00e5ff" />
              <View style={styles.unreadDot} />
            </TouchableOpacity>

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

        {/* ─── B. SUPERVISOR SUMMARY METRIC CARDS (LIVE BACKEND DATA) ─── */}
        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, { width: metricCardWidth }]}>
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricLabel}>TOTAL TRIPS TODAY</Text>
              <Ionicons name="layers" size={16} color="#00e5ff" />
            </View>
            <Text style={[styles.metricValue, { color: '#00e5ff' }]}>{stats.totalTripsToday}</Text>
            <Text style={styles.metricSub}>Port Movements</Text>
          </View>

          <View style={[styles.metricCard, { width: metricCardWidth }]}>
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricLabel}>ACTIVE TRIPS</Text>
              <Ionicons name="navigate" size={16} color="#22ef7e" />
            </View>
            <Text style={[styles.metricValue, { color: '#22ef7e' }]}>{stats.activeTrips}</Text>
            <Text style={styles.metricSub}>In Transit</Text>
          </View>

          <View style={[styles.metricCard, { borderColor: '#feb300', width: metricCardWidth }]}>
            <View style={styles.metricCardHeader}>
              <Text style={[styles.metricLabel, { color: '#feb300' }]}>PENDING APPROVAL</Text>
              <Ionicons name="time" size={16} color="#feb300" />
            </View>
            <Text style={[styles.metricValue, { color: '#feb300' }]}>{stats.tripsPendingApproval}</Text>
            <Text style={styles.metricSub}>Needs Action</Text>
          </View>

          <View style={[styles.metricCard, { width: metricCardWidth }]}>
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricLabel}>COMPLETED TODAY</Text>
              <Ionicons name="checkmark-done" size={16} color="#22ef7e" />
            </View>
            <Text style={[styles.metricValue, { color: '#22ef7e' }]}>{stats.completedTripsToday}</Text>
            <Text style={styles.metricSub}>Discharged</Text>
          </View>

          <View style={[styles.metricCard, { width: metricCardWidth }]}>
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricLabel}>CONTAINERS</Text>
              <Ionicons name="cube" size={16} color="#00e5ff" />
            </View>
            <Text style={[styles.metricValue, { color: '#00e5ff' }]}>{stats.totalContainersTransportedToday}</Text>
            <Text style={styles.metricSub}>Loaded/Handed</Text>
          </View>

          <View style={[styles.metricCard, { width: metricCardWidth }]}>
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricLabel}>REGISTERED DRIVERS</Text>
              <Ionicons name="people" size={16} color="#849396" />
            </View>
            <Text style={[styles.metricValue, { color: '#dde2f0' }]}>{stats.registeredDrivers}</Text>
            <Text style={styles.metricSub}>{stats.activeDrivers} Active on Duty</Text>
          </View>
        </View>

        {/* ─── D. TRIP APPROVAL MANAGEMENT (PENDING APPROVALS SECTION) ─── */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="shield-checkmark" size={18} color="#feb300" />
            <Text style={[styles.sectionTitle, { color: '#feb300' }]}>
              PENDING GATE PASS APPROVALS ({pendingTrips.length})
            </Text>
          </View>

          {pendingTrips.length === 0 ? (
            <View style={styles.emptyPendingCard}>
              <Ionicons name="checkmark-circle-outline" size={28} color="#22ef7e" />
              <Text style={styles.emptyPendingText}>ALL SUBMITTED TRIPS HAVE BEEN REVIEWED</Text>
              <Text style={styles.emptyPendingSub}>No ITT missions currently awaiting supervisor clearance.</Text>
            </View>
          ) : (
            pendingTrips.map((trip) => {
              const c20 = (trip.containers || []).filter((c: any) => c.size === '20FT' || c.size === 'FT_20').length;
              const c40 = (trip.containers || []).filter((c: any) => c.size === '40FT' || c.size === 'FT_40').length;
              return (
                <View key={trip.id} style={styles.pendingCard}>
                  <View style={styles.pendingCardHeader}>
                    <View>
                      <Text style={styles.pendingTripId}>{trip.tripNumber || `ITT-${trip.id?.slice(0, 6)}`}</Text>
                      <Text style={styles.pendingDriver}>
                        Driver: {trip.driverName || 'Kamal Perera'} · Truck: {trip.vehicleNumber || 'LY 5234'} · CHE: {resolveCheNumber(trip.vehicleNumber, trip.chassisNumber)}
                      </Text>
                    </View>
                    <View style={styles.pendingAwaitingTag}>
                      <Text style={styles.pendingAwaitingTagText}>AWAITING GATE PASS</Text>
                    </View>
                  </View>

                  {/* Route & Cargo details */}
                  <View style={styles.pendingSpecsRow}>
                    <Text style={styles.pendingSpec}>
                      Route: <Text style={styles.pendingSpecHighlight}>{trip.sourceTerminal} ➔ {trip.destTerminal}</Text>
                    </Text>
                    <Text style={styles.pendingSpec}>
                      Vessel: <Text style={styles.pendingSpecHighlight}>{trip.vesselName || 'MV Colombo Star'}</Text>
                    </Text>
                    <Text style={styles.pendingSpec}>
                      CHE No: <Text style={styles.pendingSpecHighlight}>{resolveCheNumber(trip.vehicleNumber, trip.chassisNumber)}</Text>
                    </Text>
                    <Text style={styles.pendingSpec}>
                      Operator: <Text style={styles.pendingSpecHighlight}>{resolveOperator(trip.vehicleNumber, trip.operator)}</Text>
                    </Text>
                    <Text style={styles.pendingSpec}>
                      Containers: <Text style={styles.pendingSpecHighlight}>{c20}×20FT · {c40}×40FT</Text>
                    </Text>
                  </View>

                  {/* Containers manifest list */}
                  {trip.containers && trip.containers.length > 0 && (
                    <View style={styles.pendingContainersList}>
                      {trip.containers.map((c: any, idx: number) => (
                        <View key={c.id || idx} style={styles.pendingContainerPill}>
                          <Ionicons name="cube" size={12} color="#00e5ff" />
                          <Text style={styles.pendingContNum}>{c.containerNumber}</Text>
                          <Text style={styles.pendingContSize}>({c.size})</Text>
                          <Text style={styles.pendingContStatus}>Status: {c.status}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Supervisor Decision Buttons */}
                  <View style={styles.decisionButtonsRow}>
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => handleApproveTrip(trip)}
                    >
                      <Ionicons name="checkmark-circle" size={16} color="#00363d" />
                      <Text style={styles.approveBtnText}>APPROVE GATE PASS</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => handleOpenRejectModal(trip)}
                    >
                      <Ionicons name="close-circle" size={16} color="#ff5252" />
                      <Text style={styles.rejectBtnText}>REJECT</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
          {/* Quick link to Trips Section for all trip details */}
          <TouchableOpacity
            style={styles.viewAllTripsLink}
            activeOpacity={0.85}
            onPress={() => router.push('/(supervisor)/(tabs)/trips' as any)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View style={styles.viewAllTripsIconBox}>
                <Ionicons name="list-circle" size={24} color="#00e5ff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.viewAllTripsTitle}>VIEW COMPLETE TRIP DETAILS</Text>
                <Text style={styles.viewAllTripsSub}>
                  Live active trips, completed missions, terminal filters & date-wise records are available in the Trips tab.
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#00e5ff" />
          </TouchableOpacity>
        </View>

        {/* ─── E. DRIVER MANAGEMENT VIEW ─── */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="people" size={18} color="#00e5ff" />
            <Text style={styles.sectionTitle}>REGISTERED OPERATORS ({drivers.length})</Text>
          </View>

          <View style={{ gap: 8 }}>
            {drivers.map((drv, idx) => {
              const photo = drv.profilePhoto || DRIVER_PHOTO_POOL[idx % DRIVER_PHOTO_POOL.length];
              return (
                <View key={drv.id} style={styles.driverRowCard}>
                  <Image source={{ uri: photo }} style={styles.driverAvatarImg} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.driverFullName}>{drv.fullName}</Text>
                    <Text style={styles.driverDetails}>
                      Code: {drv.driverCode} · Truck: {drv.vehicleNumber || 'LY 5234'} · CHE: {resolveCheNumber(drv.vehicleNumber, drv.chassisNumber)} · Tel: {drv.mobileNumber}
                    </Text>
                  </View>
                  <View style={styles.driverActivePill}>
                    <View style={styles.greenDot} />
                    <Text style={styles.driverActivePillText}>{drv.status || 'ACTIVE'}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* ─── F. TERMINAL AND CONTAINER REPORTS SUMMARY WITH WEEKLY & MONTHLY FILTERS ─── */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionTitleRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="business" size={18} color="#00e5ff" />
              <Text style={styles.sectionTitle}>SLPA 6-TERMINAL CONSOLIDATED TOTALS</Text>
            </View>
            <View style={styles.panelActivePeriodBadge}>
              <Text style={styles.panelActivePeriodText}>
                {terminalPanelPeriod === 'WEEKLY' ? '7-DAY ROLLING' : terminalPanelPeriod === 'MONTHLY' ? '30-DAY MONTH' : terminalPanelPeriod === 'TODAY' ? 'TODAY' : 'ALL TIME'}
              </Text>
            </View>
          </View>

          {/* Timeframe Filter Tabs (Weekly / Monthly / Today / All Time) */}
          <View style={styles.panelFilterBar}>
            <View style={styles.periodTabsRow}>
              {(['WEEKLY', 'MONTHLY', 'TODAY', 'ALL'] as const).map((period) => {
                const isActive = terminalPanelPeriod === period;
                const label = period === 'WEEKLY' ? 'WEEKLY (7D)' : period === 'MONTHLY' ? 'MONTHLY (30D)' : period === 'TODAY' ? 'TODAY' : 'ALL TIME';
                return (
                  <TouchableOpacity
                    key={period}
                    style={[styles.periodTabBtn, isActive && styles.periodTabBtnActive]}
                    onPress={() => setTerminalPanelPeriod(period)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.periodTabText, isActive && styles.periodTabTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Traffic Direction Sub-Filter */}
            <View style={styles.trafficTypeRow}>
              <Text style={styles.trafficTypeLabel}>TRAFFIC ROLE:</Text>
              {(['ALL', 'ORIGIN', 'DESTINATION'] as const).map((type) => {
                const isSelected = terminalPanelTrafficType === type;
                const typeLabel = type === 'ALL' ? 'Total (Load + Discharge)' : type === 'ORIGIN' ? 'Origin Gate' : 'Discharge Bay';
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.trafficTypeChip, isSelected && styles.trafficTypeChipActive]}
                    onPress={() => setTerminalPanelTrafficType(type)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.trafficTypeChipText, isSelected && styles.trafficTypeChipTextActive]}>
                      {typeLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Aggregate Snapshot Banner */}
          <View style={styles.panelSummaryStrip}>
            <View style={styles.panelSummaryItem}>
              <Text style={styles.panelSummaryNum}>{terminalWiseStats.grandTotalTrips}</Text>
              <Text style={styles.panelSummaryLabel}>Total Trips ({terminalPanelPeriod})</Text>
            </View>
            <View style={styles.panelSummaryDivider} />
            <View style={styles.panelSummaryItem}>
              <Text style={[styles.panelSummaryNum, { color: '#feb300' }]}>{terminalWiseStats.grandTotalContainers}</Text>
              <Text style={styles.panelSummaryLabel}>Containers Moved</Text>
            </View>
            <View style={styles.panelSummaryDivider} />
            <View style={styles.panelSummaryItem}>
              <Text style={[styles.panelSummaryNum, { color: '#22ef7e' }]}>6</Text>
              <Text style={styles.panelSummaryLabel}>Active Port Terminals</Text>
            </View>
          </View>

          {/* 6 Terminals Consolidated Grid */}
          <View style={styles.terminalGrid}>
            {['CICT', 'CWIT', 'ECT', 'JCT', 'UCT', 'SAGT'].map((tName) => {
              const data = terminalWiseStats.perTerminal[tName] || { totalTrips: 0, containers: 0, originTrips: 0, destTrips: 0 };
              const periodSub = terminalPanelPeriod === 'WEEKLY' ? 'Trips This Week' : terminalPanelPeriod === 'MONTHLY' ? 'Trips This Month' : terminalPanelPeriod === 'TODAY' ? 'Trips Today' : 'Total Trips';
              return (
                <View key={tName} style={styles.terminalGridItem}>
                  <View style={styles.termHeaderRow}>
                    <Text style={styles.termGridName}>{tName}</Text>
                    {data.totalTrips > 0 && (
                      <View style={styles.termActiveDot} />
                    )}
                  </View>
                  <Text style={styles.termGridCount}>{data.totalTrips}</Text>
                  <Text style={styles.termGridSub}>{periodSub}</Text>

                  {/* Flow Sub-Metrics */}
                  <View style={styles.termFlowRow}>
                    <Text style={styles.termFlowText}>
                      Out: <Text style={{ color: '#00e5ff' }}>{data.originTrips}</Text> · In: <Text style={{ color: '#22ef7e' }}>{data.destTrips}</Text>
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          <TouchableOpacity style={styles.exportReportBtn} onPress={() => setReportModalVisible(true)}>
            <Ionicons name="document-text" size={18} color="#00363d" />
            <Text style={styles.exportReportBtnText}>GENERATE OFFICIAL TERMINAL REPORT</Text>
          </TouchableOpacity>
        </View>

        {/* ─── H. SUPERVISOR QUICK ACTIONS ─── */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>SUPERVISOR QUICK ACTIONS</Text>
          <View style={styles.quickGrid}>
            <TouchableOpacity style={styles.quickTile} onPress={() => router.push('/(supervisor)/(tabs)/approvals')}>
              <Ionicons name="shield-checkmark" size={22} color="#feb300" />
              <Text style={styles.quickTileText}>Pending Passes</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickTile} onPress={() => router.push('/(supervisor)/(tabs)/trips')}>
              <Ionicons name="layers" size={22} color="#00e5ff" />
              <Text style={styles.quickTileText}>Dispatcher Hub</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickTile} onPress={() => router.push('/(supervisor)/(tabs)/drivers')}>
              <Ionicons name="people" size={22} color="#22ef7e" />
              <Text style={styles.quickTileText}>Operators</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickTile} onPress={() => setReportModalVisible(true)}>
              <Ionicons name="bar-chart" size={22} color="#00e5ff" />
              <Text style={styles.quickTileText}>Daily Report</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickTile} onPress={() => setDamageReviewModalVisible(true)}>
              <Ionicons name="warning" size={22} color="#ff5252" />
              <Text style={styles.quickTileText}>Damage Review</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickTile} onPress={() => setNotificationsModalVisible(true)}>
              <Ionicons name="notifications" size={22} color="#feb300" />
              <Text style={styles.quickTileText}>Alerts</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ─── MODAL 1: MANDATORY REJECTION REASON ─── */}
      <Modal visible={rejectModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="alert-circle" size={20} color="#ff5252" />
                <Text style={[styles.modalTitle, { color: '#ff5252' }]}>REJECT TRIP SUBMISSION</Text>
              </View>
              <TouchableOpacity onPress={() => setRejectModalVisible(false)}>
                <Ionicons name="close" size={22} color="#849396" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalPrompt}>
              Please enter mandatory rejection reason for Trip {tripToReject?.tripNumber}.
              The driver will be notified to correct and re-submit.
            </Text>

            <View style={[styles.inputWrap, { height: 90, alignItems: 'flex-start', paddingTop: 8 }]}>
              <TextInput
                style={[styles.modalInput, { height: 74 }]}
                placeholder="e.g. Container seal mismatch, incorrect Chai No, incorrect destination terminal..."
                placeholderTextColor="#849396"
                multiline
                value={rejectionReason}
                onChangeText={setRejectionReason}
              />
            </View>

            <TouchableOpacity
              style={[styles.modalSubmitBtn, { backgroundColor: '#ff5252' }]}
              onPress={handleConfirmRejection}
              disabled={submittingDecision}
            >
              {submittingDecision ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="close-circle" size={18} color="#fff" />
                  <Text style={[styles.modalSubmitBtnText, { color: '#fff' }]}>CONFIRM REJECTION WITH REASON</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL 2: REPORT SUMMARY & EXPORT ─── */}
      <Modal visible={reportModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="document-text" size={20} color="#00e5ff" />
                <Text style={styles.modalTitle}>OFFICIAL TERMINAL CONSOLIDATED REPORT</Text>
              </View>
              <TouchableOpacity onPress={() => setReportModalVisible(false)}>
                <Ionicons name="close" size={22} color="#849396" />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={styles.repRow}>• Total ITT Movements: <Text style={styles.repVal}>{stats.totalTripsToday}</Text></Text>
              <Text style={styles.repRow}>• Completed Discharges: <Text style={styles.repVal}>{stats.completedTripsToday}</Text></Text>
              <Text style={styles.repRow}>• Active In-Transit: <Text style={styles.repVal}>{stats.activeTrips}</Text></Text>
              <Text style={styles.repRow}>• Gate Pass Approvals: <Text style={styles.repVal}>{stats.approvedTrips}</Text></Text>
              <Text style={styles.repRow}>• Total Containers: <Text style={styles.repVal}>{stats.totalContainersTransportedToday} Containers</Text></Text>
              <Text style={styles.repRow}>• Reporting Date: <Text style={styles.repVal}>{currentDateFormatted}</Text></Text>
            </View>

            <TouchableOpacity
              style={styles.modalSubmitBtn}
              onPress={() => {
                Alert.alert('Report Exported', 'CSV summary generated and downloaded to terminal storage.');
                setReportModalVisible(false);
              }}
            >
              <Ionicons name="download" size={18} color="#00363d" />
              <Text style={styles.modalSubmitBtnText}>EXPORT CSV REPORT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL 3: NOTIFICATIONS ─── */}
      <Modal visible={notificationsModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="notifications" size={20} color="#00e5ff" />
                <Text style={styles.modalTitle}>SUPERVISOR OPERATIONS ALERTS</Text>
              </View>
              <TouchableOpacity onPress={() => setNotificationsModalVisible(false)}>
                <Ionicons name="close" size={22} color="#849396" />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 10 }}>
              <View style={styles.notifItem}>
                <Ionicons name="time" size={18} color="#feb300" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifTitle}>New Trip Submission (ITT-00002)</Text>
                  <Text style={styles.notifSub}>Driver Kasun Chamara submitted for Gate Pass clearance.</Text>
                </View>
              </View>
              <View style={styles.notifItem}>
                <Ionicons name="checkmark-circle" size={18} color="#22ef7e" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifTitle}>Handover Confirmed at ECT</Text>
                  <Text style={styles.notifSub}>Truck WP-BA-1234 completed container discharge.</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.modalSubmitBtn} onPress={() => setNotificationsModalVisible(false)}>
              <Text style={styles.modalSubmitBtnText}>DISMISS ALERTS</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL 4: DAMAGE INCIDENTS ─── */}
      <Modal visible={damageReviewModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="warning" size={20} color="#ff5252" />
                <Text style={[styles.modalTitle, { color: '#ff5252' }]}>CONTAINER DAMAGE INCIDENTS</Text>
              </View>
              <TouchableOpacity onPress={() => setDamageReviewModalVisible(false)}>
                <Ionicons name="close" size={22} color="#849396" />
              </TouchableOpacity>
            </View>

            <View style={styles.notifItem}>
              <Ionicons name="warning-outline" size={20} color="#ff5252" />
              <View style={{ flex: 1 }}>
                <Text style={styles.notifTitle}>MSCU-884192 (Dent on Left Corner)</Text>
                <Text style={styles.notifSub}>Reported during transfer at CICT Bay 4. Inspected and approved for onward transit.</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.modalSubmitBtn} onPress={() => setDamageReviewModalVisible(false)}>
              <Text style={styles.modalSubmitBtnText}>CLOSE INCIDENTS</Text>
            </TouchableOpacity>
          </View>
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
    minWidth: 160,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#feb300',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#00363d',
    fontWeight: '900',
    fontSize: 15,
  },
  supervisorNameText: {
    color: '#dde2f0',
    fontWeight: '800',
    fontSize: 14,
  },
  roleDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  rolePill: {
    backgroundColor: 'rgba(254, 179, 0, 0.15)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  rolePillText: {
    color: '#feb300',
    fontSize: 9,
    fontWeight: '800',
  },
  dateText: {
    color: '#849396',
    fontSize: 9,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    flexShrink: 0,
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
  unreadDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00e5ff',
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

  // ─── 6 SUMMARY METRIC CARDS ───
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: '31%',
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    padding: 10,
    gap: 4,
  },
  metricCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricLabel: {
    color: '#849396',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },
  metricSub: {
    color: '#849396',
    fontSize: 10,
    fontWeight: '600',
  },

  // ─── SECTION WRAPS ───
  sectionWrap: {
    backgroundColor: '#161c25',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    padding: 14,
    gap: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#242a34',
  },
  sectionTitle: {
    color: '#dde2f0',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  // ─── PENDING APPROVALS ───
  emptyPendingCard: {
    backgroundColor: '#080e17',
    borderRadius: radius.DEFAULT,
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  emptyPendingText: {
    color: '#dde2f0',
    fontSize: 11,
    fontWeight: '800',
  },
  emptyPendingSub: {
    color: '#849396',
    fontSize: 9,
    textAlign: 'center',
  },
  pendingCard: {
    backgroundColor: '#080e17',
    borderRadius: radius.DEFAULT,
    borderWidth: 1.5,
    borderColor: '#feb300',
    padding: 12,
    gap: 10,
  },
  pendingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pendingTripId: {
    color: '#feb300',
    fontSize: 13,
    fontWeight: '900',
      },
  pendingDriver: {
    color: '#dde2f0',
    fontSize: 10,
    marginTop: 2,
  },
  pendingAwaitingTag: {
    backgroundColor: 'rgba(254, 179, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#feb300',
  },
  pendingAwaitingTagText: {
    color: '#feb300',
    fontSize: 8,
    fontWeight: '900',
  },
  pendingSpecsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    backgroundColor: '#161c25',
    padding: 8,
    borderRadius: radius.sm,
  },
  pendingSpec: {
    color: '#849396',
    fontSize: 9,
  },
  pendingSpecHighlight: {
    color: '#dde2f0',
    fontWeight: '700',
  },
  pendingContainersList: {
    gap: 4,
  },
  pendingContainerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#161c25',
    padding: 6,
    borderRadius: 4,
  },
  pendingContNum: {
    color: '#00e5ff',
        fontSize: 11,
    fontWeight: '700',
  },
  pendingContSize: {
    color: '#849396',
    fontSize: 9,
  },
  pendingContStatus: {
    color: '#22ef7e',
    fontSize: 9,
    marginLeft: 'auto',
  },
  decisionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  approveBtn: {
    flex: 1,
    height: 40,
    backgroundColor: '#00e5ff',
    borderRadius: radius.DEFAULT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  approveBtnText: {
    color: '#00363d',
    fontWeight: '900',
    fontSize: 11,
  },
  rejectBtn: {
    paddingHorizontal: 16,
    height: 40,
    backgroundColor: '#1a2029',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#ff5252',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  rejectBtnText: {
    color: '#ff5252',
    fontWeight: '800',
    fontSize: 10,
  },

  // ─── VIEW ALL TRIPS LINK ───
  viewAllTripsLink: {
    backgroundColor: 'rgba(0, 229, 255, 0.05)',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.25)',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  viewAllTripsIconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAllTripsTitle: {
    color: '#00e5ff',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  viewAllTripsSub: {
    color: '#849396',
    fontSize: 10,
    marginTop: 2,
    lineHeight: 14,
  },

  // ─── SEARCH & FILTER CHIPS ───
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#080e17',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    color: '#dde2f0',
    fontSize: 11,
        ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  } as any,
  filterChipsScroll: {
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    backgroundColor: '#080e17',
    borderWidth: 1,
    borderColor: '#242a34',
  },
  filterChipActive: {
    backgroundColor: 'rgba(254, 179, 0, 0.15)',
    borderColor: '#feb300',
  },
  filterChipActiveCyan: {
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    borderColor: '#00e5ff',
  },
  filterChipText: {
    color: '#849396',
    fontSize: 9,
    fontWeight: '800',
      },
  filterChipTextActive: {
    color: '#feb300',
  },
  filterChipTextActiveCyan: {
    color: '#00e5ff',
  },

  // ─── MONITORING CARDS ───
  monitoringCard: {
    backgroundColor: '#080e17',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    padding: 10,
    gap: 6,
  },
  monHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monTripId: {
    color: '#00e5ff',
        fontSize: 12,
    fontWeight: '900',
  },
  monStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeGreen: { backgroundColor: 'rgba(34, 239, 126, 0.15)' },
  badgeCyan: { backgroundColor: 'rgba(0, 229, 255, 0.15)' },
  badgeAmber: { backgroundColor: 'rgba(254, 179, 0, 0.15)' },
  badgeDefault: { backgroundColor: '#1a2029' },
  monStatusText: {
    color: '#dde2f0',
    fontSize: 8,
    fontWeight: '800',
  },
  monRouteBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monRouteText: {
    color: '#dde2f0',
    fontSize: 11,
    fontWeight: '700',
  },
  monTime: {
    color: '#849396',
    fontSize: 9,
      },
  monSpecsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monSpecItem: {
    color: '#849396',
    fontSize: 9,
  },
  monSpecBold: {
    color: '#dde2f0',
    fontWeight: '600',
  },
  monContainersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#161c25',
  },
  monContainersText: {
    color: '#00e5ff',
    fontSize: 9,
      },

  // ─── DATE-WISE MONITORING & DRIVERS STYLES ───
  dateWiseCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  dateWiseCountPillText: {
    color: '#00e5ff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  filterSubLabel: {
    color: '#849396',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  filterChipActiveDate: {
    backgroundColor: '#00e5ff',
    borderColor: '#00e5ff',
  },
  filterChipTextActiveDate: {
    color: '#00363d',
    fontWeight: '900',
  },
  dateGroupWrap: {
    gap: 4,
  },
  dateGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#101721',
    borderWidth: 1,
    borderColor: '#242a34',
    borderRadius: radius.DEFAULT,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dateGroupTitle: {
    color: '#dde2f0',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  todayPill: {
    backgroundColor: '#00e5ff',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  todayPillText: {
    color: '#00363d',
    fontSize: 8,
    fontWeight: '900',
  },
  yesterdayPill: {
    backgroundColor: 'rgba(254, 179, 0, 0.2)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#feb300',
  },
  yesterdayPillText: {
    color: '#feb300',
    fontSize: 8,
    fontWeight: '800',
  },
  dateGroupCountBadge: {
    backgroundColor: '#080e17',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#242a34',
  },
  dateGroupCountText: {
    color: '#00e5ff',
    fontSize: 9,
    fontWeight: '800',
  },
  monDriverThumb: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#00e5ff',
  },
  monDriverThumbFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#101d30',
    borderWidth: 1.5,
    borderColor: '#00e5ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monDriverThumbText: {
    color: '#00e5ff',
    fontWeight: '900',
    fontSize: 12,
  },
  monDriverNameSmall: {
    color: '#dde2f0',
    fontSize: 10,
    fontWeight: '700',
  },
  monSpecBoldHighlight: {
    color: '#feb300',
    fontWeight: '800',
  },
  monSpecBoldCyan: {
    color: '#00e5ff',
    fontWeight: '800',
  },
  monSpecBoldGreen: {
    color: '#22ef7e',
    fontWeight: '800',
  },
  driverAvatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#00e5ff',
  },

  // ─── DRIVERS ROW ───
  driverRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#080e17',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    padding: 10,
    gap: 10,
  },
  driverAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00e5ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverAvatarText: {
    color: '#00363d',
    fontWeight: '900',
    fontSize: 13,
  },
  driverFullName: {
    color: '#dde2f0',
    fontSize: 11,
    fontWeight: '800',
  },
  driverDetails: {
    color: '#849396',
    fontSize: 9,
    marginTop: 1,
  },
  driverActivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 239, 126, 0.1)',
    borderWidth: 1,
    borderColor: '#22ef7e',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    gap: 4,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22ef7e',
  },
  driverActivePillText: {
    color: '#22ef7e',
    fontSize: 8,
    fontWeight: '800',
  },

  // ─── TERMINALS REPORT GRID ───
  terminalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  terminalGridItem: {
    width: '31%',
    backgroundColor: '#080e17',
    borderRadius: radius.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: '#242a34',
    alignItems: 'center',
    gap: 2,
  },
  termGridName: {
    color: '#00e5ff',
    fontWeight: '900',
    fontSize: 12,
      },
  termGridCount: {
    color: '#dde2f0',
    fontWeight: '900',
    fontSize: 16,
      },
  termGridSub: {
    color: '#849396',
    fontSize: 8,
  },
  panelActivePeriodBadge: {
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00e5ff',
  },
  panelActivePeriodText: {
    color: '#00e5ff',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  panelFilterBar: {
    backgroundColor: '#0c131d',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    padding: 10,
    gap: 10,
  },
  periodTabsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  periodTabBtn: {
    flex: 1,
    backgroundColor: '#161c25',
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#242a34',
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodTabBtnActive: {
    backgroundColor: '#00e5ff',
    borderColor: '#00e5ff',
    shadowColor: '#00e5ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  periodTabText: {
    color: '#849396',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  periodTabTextActive: {
    color: '#00363d',
    fontWeight: '900',
  },
  trafficTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#1a2230',
    flexWrap: 'wrap',
  },
  trafficTypeLabel: {
    color: '#849396',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  trafficTypeChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#161c25',
    borderWidth: 1,
    borderColor: '#242a34',
  },
  trafficTypeChipActive: {
    backgroundColor: 'rgba(34, 239, 126, 0.15)',
    borderColor: '#22ef7e',
  },
  trafficTypeChipText: {
    color: '#849396',
    fontSize: 8,
    fontWeight: '700',
  },
  trafficTypeChipTextActive: {
    color: '#22ef7e',
    fontWeight: '900',
  },
  panelSummaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#080e17',
    borderRadius: radius.DEFAULT,
    padding: 10,
    borderWidth: 1,
    borderColor: '#242a34',
  },
  panelSummaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  panelSummaryNum: {
    color: '#00e5ff',
    fontSize: 16,
    fontWeight: '900',
  },
  panelSummaryLabel: {
    color: '#849396',
    fontSize: 8,
    fontWeight: '700',
    textAlign: 'center',
  },
  panelSummaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#242a34',
  },
  termHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  termActiveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#22ef7e',
  },
  termFlowRow: {
    marginTop: 2,
    paddingTop: 3,
    borderTopWidth: 1,
    borderTopColor: '#161c25',
    width: '100%',
    alignItems: 'center',
  },
  termFlowText: {
    color: '#849396',
    fontSize: 7,
    fontWeight: '800',
  },
  exportReportBtn: {
    height: 44,
    backgroundColor: '#00e5ff',
    borderRadius: radius.DEFAULT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  exportReportBtnText: {
    color: '#00363d',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.6,
  },

  // ─── QUICK ACTIONS GRID ───
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickTile: {
    width: '31%',
    backgroundColor: '#080e17',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  quickTileText: {
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
    padding: 16,
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
    fontSize: 11,
    letterSpacing: 0.8,
  },
  modalPrompt: {
    color: '#dde2f0',
    fontSize: 10,
    lineHeight: 15,
  },
  inputWrap: {
    backgroundColor: '#080e17',
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: '#242a34',
    paddingHorizontal: 12,
  },
  modalInput: {
    color: '#dde2f0',
    fontSize: 11,
        ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  } as any,
  modalSubmitBtn: {
    height: 44,
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
    letterSpacing: 0.6,
  },
  repRow: {
    color: '#849396',
    fontSize: 11,
  },
  repVal: {
    color: '#00e5ff',
    fontWeight: '800',
      },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#080e17',
    borderRadius: radius.sm,
    padding: 10,
    gap: 10,
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
});
