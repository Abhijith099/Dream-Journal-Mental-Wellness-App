import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, Bell, Calendar, Sparkles, User as UserIcon } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import insightsAPI, {
  ObservationData,
  RhythmDay,
  ExperimentData,
  PatternsData,
  ThemesData,
  WhatHelpsData,
} from '@/services/insightsAPI';

import ObservedAssociationCard from './ObservedAssociationCard';
import RecentRhythmCard from './RecentRhythmCard';
import GentleExperimentCard from './GentleExperimentCard';
import WhatHasHelpedCard from './WhatHasHelpedCard';
import PatternsTabContent from './PatternsTabContent';
import ThemesTabContent from './ThemesTabContent';
import WhatHelpsTabContent from './WhatHelpsTabContent';

export type InsightTab = 'Today' | 'Patterns' | 'Themes' | 'What helps';

export const InsightsScreen: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id || (user as any)?._id || 'me';

  const [activeTab, setActiveTab] = useState<InsightTab>('Today');
  const [refreshing, setRefreshing] = useState(false);

  // Today tab data
  const [observation, setObservation] = useState<ObservationData | null>(null);
  const [rhythmDays, setRhythmDays] = useState<RhythmDay[]>([]);
  const [experiment, setExperiment] = useState<ExperimentData | null>(null);
  const [whatHelpsSummary, setWhatHelpsSummary] = useState<string>('');

  // Patterns tab data
  const [patternsRange, setPatternsRange] = useState<'7days' | '30days' | '90days'>('30days');
  const [patternsData, setPatternsData] = useState<PatternsData | null>(null);
  const [patternsLoading, setPatternsLoading] = useState(false);

  // Themes tab data
  const [themesRange, setThemesRange] = useState<'7days' | '30days' | '90days'>('30days');
  const [themesData, setThemesData] = useState<ThemesData | null>(null);
  const [themesLoading, setThemesLoading] = useState(false);

  // What Helps tab data
  const [whatHelpsRange, setWhatHelpsRange] = useState<'7days' | '30days' | '90days'>('30days');
  const [whatHelpsData, setWhatHelpsData] = useState<WhatHelpsData | null>(null);
  const [whatHelpsLoading, setWhatHelpsLoading] = useState(false);

  // Fetch Today tab data
  const fetchTodayData = useCallback(async () => {
    try {
      const [obs, rhythm, exp, helps] = await Promise.allSettled([
        insightsAPI.getObservations(userId),
        insightsAPI.getRhythm(userId),
        insightsAPI.getNextExperiment(userId),
        insightsAPI.getWhatHelps(userId),
      ]);

      if (obs.status === 'fulfilled') setObservation(obs.value);
      if (rhythm.status === 'fulfilled') setRhythmDays(rhythm.value.days);
      if (exp.status === 'fulfilled') setExperiment(exp.value);
      if (helps.status === 'fulfilled') {
        setWhatHelpsSummary(helps.value.recentHighlight);
        setWhatHelpsData(helps.value);
      }
    } catch (e) {
      console.error('Error fetching today data:', e);
    }
  }, [userId]);

  // Fetch Patterns data
  const fetchPatterns = useCallback(
    async (range: '7days' | '30days' | '90days') => {
      try {
        setPatternsLoading(true);
        const data = await insightsAPI.getPatterns(userId, range);
        setPatternsData(data);
      } catch (e) {
        console.error('Error fetching patterns:', e);
      } finally {
        setPatternsLoading(false);
      }
    },
    [userId]
  );

  // Fetch Themes data
  const fetchThemes = useCallback(
    async (range: '7days' | '30days' | '90days') => {
      try {
        setThemesLoading(true);
        const data = await insightsAPI.getThemes(userId, range);
        setThemesData(data);
      } catch (e) {
        console.error('Error fetching themes:', e);
      } finally {
        setThemesLoading(false);
      }
    },
    [userId]
  );

  // Fetch What Helps data
  const fetchWhatHelps = useCallback(
    async (range: '7days' | '30days' | '90days' = '30days') => {
      try {
        setWhatHelpsLoading(true);
        const data = await insightsAPI.getWhatHelps(userId, range);
        setWhatHelpsData(data);
        setWhatHelpsSummary(data.recentHighlight);
      } catch (e) {
        console.error('Error fetching what helps:', e);
      } finally {
        setWhatHelpsLoading(false);
      }
    },
    [userId]
  );

  // Initial load
  useEffect(() => {
    fetchTodayData();
  }, [fetchTodayData]);

  // Tab switch effects
  useEffect(() => {
    if (activeTab === 'Patterns' && !patternsData) {
      fetchPatterns(patternsRange);
    } else if (activeTab === 'Themes' && !themesData) {
      fetchThemes(themesRange);
    } else if (activeTab === 'What helps' && !whatHelpsData) {
      fetchWhatHelps(whatHelpsRange);
    }
  }, [activeTab, patternsData, themesData, whatHelpsData, patternsRange, themesRange, whatHelpsRange, fetchPatterns, fetchThemes, fetchWhatHelps]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'Today') {
      await fetchTodayData();
    } else if (activeTab === 'Patterns') {
      await fetchPatterns(patternsRange);
    } else if (activeTab === 'Themes') {
      await fetchThemes(themesRange);
    } else if (activeTab === 'What helps') {
      await fetchWhatHelps(whatHelpsRange);
    }
    setRefreshing(false);
  };

  const handleStartExperiment = async (expId?: string) => {
    const targetId = expId || experiment?.id || 'default';
    await insightsAPI.startExperiment(targetId);
    fetchTodayData();
    if (whatHelpsData) fetchWhatHelps(whatHelpsRange);
  };

  const handleStopExperiment = async () => {
    if (whatHelpsData?.activeExperiment?.id) {
      await insightsAPI.stopExperiment(whatHelpsData.activeExperiment.id);
      fetchWhatHelps(whatHelpsRange);
      fetchTodayData();
    }
  };

  const handleLogOutcome = async (
    interventionId: string,
    outcome: 'helpful' | 'neutral' | 'unhelpful',
    beforeState?: any,
    afterState?: any,
    notes?: string
  ) => {
    await insightsAPI.logInterventionOutcome(interventionId, outcome, notes);
    fetchWhatHelps(whatHelpsRange);
  };

  const handleReportInaccurate = async () => {
    const obsId = observation?.id || 'default';
    await insightsAPI.sendObservationFeedback(obsId);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9F9F9" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4F46E5']}
            tintColor="#4F46E5"
          />
        }
      >
        {/* Top App Bar matching Image 1 & Image 2 */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            {activeTab === 'What helps' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Sparkles size={18} color="#6D28D9" />
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827', fontFamily: 'serif' }}>
                  What Helps
                </Text>
              </View>
            ) : activeTab === 'Themes' ? (
              <View>
                <Text style={styles.topThemesTitle}>Themes</Text>
                <Text style={styles.topThemesSubtitle}>Somatic balance & dream patterns</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.topDot} />
                <Text style={styles.topBarTitle}>
                  {activeTab === 'Patterns' ? 'Patterns' : 'Insights And Signals'}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.topBarRight}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.push('/wellness' as any)}
              activeOpacity={0.7}
            >
              {activeTab === 'What helps' ? (
                <Calendar size={18} color="#374151" />
              ) : activeTab === 'Themes' ? (
                <Bell size={18} color="#374151" />
              ) : (
                <Feather size={20} color="#374151" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.profileAvatar}
              onPress={() => router.push('/profile' as any)}
              activeOpacity={0.8}
            >
              <UserIcon size={16} color="#FFFFFF" strokeWidth={2.2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Title row (Today style) */}
        {activeTab === 'Today' && (
          <View style={styles.titleRow}>
            <View style={styles.titleWithSubtitle}>
              <Text style={styles.mainTitle}>Insights</Text>
              <Text style={styles.subTitleSync}>AUTONOMIC SYNC</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/explore' as any)}
              activeOpacity={0.7}
            >
              <Text style={styles.historyLink}>History</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 4-Tab Navigation Selector */}
        <View style={styles.tabContainer}>
          {(['Today', 'Patterns', 'Themes', 'What helps'] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tab 1: Today */}
        {activeTab === 'Today' && (
          <View>
            <ObservedAssociationCard
              data={observation}
              onSeePattern={() => setActiveTab('Patterns')}
            />

            <RecentRhythmCard days={rhythmDays} />

            <GentleExperimentCard
              data={experiment}
              onStart={handleStartExperiment}
            />

            <WhatHasHelpedCard
              text={whatHelpsSummary}
              onViewWhatHelps={() => setActiveTab('What helps')}
            />
          </View>
        )}

        {/* Tab 2: Patterns */}
        {activeTab === 'Patterns' && (
          <PatternsTabContent
            data={patternsData}
            loading={patternsLoading}
            selectedRange={patternsRange}
            onSelectRange={(range) => {
              setPatternsRange(range);
              fetchPatterns(range);
            }}
            onStartExperiment={() => handleStartExperiment(patternsData?.experiment?.id)}
            onReportInaccurate={handleReportInaccurate}
          />
        )}

        {/* Tab 3: Themes */}
        {activeTab === 'Themes' && (
          <ThemesTabContent
            data={themesData}
            loading={themesLoading}
            selectedRange={themesRange}
            onSelectRange={(range) => {
              setThemesRange(range);
              fetchThemes(range);
            }}
            userId={userId}
          />
        )}

        {/* Tab 4: What helps */}
        {activeTab === 'What helps' && (
          <WhatHelpsTabContent
            data={whatHelpsData}
            loading={whatHelpsLoading}
            selectedRange={whatHelpsRange}
            onSelectRange={(range) => {
              setWhatHelpsRange(range);
              fetchWhatHelps(range);
            }}
            onLogOutcome={handleLogOutcome}
            onStopExperiment={handleStopExperiment}
            userId={userId}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 90,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 4,
  },
  topThemesTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
  },
  topThemesSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4F46E5',
    marginRight: 8,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: -0.2,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    padding: 4,
  },
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  titleWithSubtitle: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.4,
  },
  subTitleSync: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 0.8,
  },
  historyLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ECEEF1',
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#111827',
    fontWeight: '600',
  },
});

export default InsightsScreen;
