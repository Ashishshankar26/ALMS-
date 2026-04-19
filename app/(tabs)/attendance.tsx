import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { useScraper } from '../../context/ScraperContext';
import { CheckCircle, AlertTriangle, XCircle, Calculator, Plus, Minus } from 'lucide-react-native';
import { useTheme, Typography } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

export default function AttendanceScreen() {
  const { data, isScraping } = useScraper();
  const { colors, isDark } = useTheme();
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [targetPct, setTargetPct] = useState(75);

  const changeTarget = (delta: number) => {
    setTargetPct(prev => Math.min(100, Math.max(50, prev + delta)));
  };

  const [showAggregate, setShowAggregate] = useState(false);
  const attendanceData = data.attendance || [];

  // Calculate Overall Attendance including Duty Leaves
  const totalClasses = attendanceData.reduce((acc, curr) => acc + (curr.totalClasses || 0), 0);
  const attendedClasses = attendanceData.reduce((acc, curr) => acc + (curr.attendedClasses || 0), 0);
  const dutyLeaves = attendanceData.reduce((acc, curr) => acc + (curr.dutyLeaves || 0), 0);
  
  const overallAttendance = totalClasses > 0 ? Math.ceil(((attendedClasses + dutyLeaves) / totalClasses) * 100).toString() : '0';
  const rawOverallAttendance = totalClasses > 0 ? Math.ceil((attendedClasses / totalClasses) * 100).toString() : '0';
  
  const displayAttendance = showAggregate ? overallAttendance : rawOverallAttendance;

  const getStatus = (percentage: number) => {
    if (percentage >= targetPct + 10) return { text: 'Safe', color: '#34C759', icon: <CheckCircle size={20} color="#34C759" /> };
    if (percentage >= targetPct)      return { text: 'Warning', color: '#FF9500', icon: <AlertTriangle size={20} color="#FF9500" /> };
    return { text: 'Critical', color: '#FF3B30', icon: <XCircle size={20} color="#FF3B30" /> };
  };

  const calculateMissable = (attended: number, total: number, leaves: number = 0) => {
    // Formula: (Attended + Leaves) / Total >= Target/100
    // (Attended + Leaves) >= (Target/100) * Total
    // Missable: floor((Attended + Leaves) / (Target/100) - Total)
    const effectiveAttended = attended + leaves;
    const currentPct = total > 0 ? (effectiveAttended / total) : 0;
    
    const missable = Math.floor((effectiveAttended / (targetPct / 100)) - total);
    if (missable > 0) return `Can miss ${missable} more class${missable > 1 ? 'es' : ''}`;
    
    // Needed = ceil(((Target/100) * Total - Effective) / (1 - Target/100))
    const needed = Math.ceil(((targetPct / 100) * total - effectiveAttended) / (1 - (targetPct / 100)));
    return `Need to attend ${needed} more class${needed > 1 ? 'es' : ''}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Hero Header */}
        <View style={[styles.heroHeader, { backgroundColor: colors.card }]}>
          <View style={styles.heroContent}>
            <View>
              <View style={styles.heroHeaderTitleRow}>
                <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>Attendance</Text>
                <TouchableOpacity 
                  onPress={() => setShowAggregate(!showAggregate)}
                  style={[
                    styles.aggregateBadge, 
                    { backgroundColor: showAggregate ? colors.primary + '20' : colors.surface }
                  ]}
                >
                  <Text style={[styles.aggregateBadgeText, { color: showAggregate ? colors.primary : colors.textSecondary }]}>
                    {showAggregate ? 'Aggregate' : 'Raw'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.heroValueRow}>
                <Text style={[styles.heroValue, { color: colors.text }]}>{displayAttendance}%</Text>
                {isScraping && (
                  <Text style={[styles.syncingText, { color: colors.primary }]}>Syncing...</Text>
                )}
              </View>
            </View>
            <View style={[styles.heroIconCircle, { backgroundColor: colors.primary + '20' }]}>
              <CheckCircle size={32} color={colors.primary} />
            </View>
          </View>

          {/* Target attendance adjuster - Redesigned for Hero */}
          <View style={[styles.targetRowHero, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9F9F9' }]}>
            <Text style={[styles.targetLabelHero, { color: colors.textSecondary }]}>Target Goal</Text>
            <View style={styles.targetControlsHero}>
              <TouchableOpacity onPress={() => changeTarget(-5)} style={[styles.targetBtnHero, { backgroundColor: colors.card }]}>
                <Minus size={14} color={colors.primary} />
              </TouchableOpacity>
              <Text style={[styles.targetValueHero, { color: colors.primary }]}>{targetPct}%</Text>
              <TouchableOpacity onPress={() => changeTarget(5)} style={[styles.targetBtnHero, { backgroundColor: colors.card }]}>
                <Plus size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

      <View style={styles.list}>
        {attendanceData.map((item, index) => {
          const status = getStatus(item.percentage);
          const isSelected = selectedSubject === item.subjectCode;

          return (
            <TouchableOpacity 
              key={index} 
              style={[styles.card, { backgroundColor: colors.card, borderColor: isSelected ? colors.primary : 'transparent' }]}
              onPress={() => setSelectedSubject(isSelected ? null : item.subjectCode)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardInfo}>
                  <Text style={[styles.subjectCode, { color: colors.textSecondary }]}>{item.subjectCode}</Text>
                  <Text style={[styles.subjectName, { color: colors.text }]}>{item.subjectName}</Text>
                </View>
                <View style={[styles.percentageBadge, { backgroundColor: `${status.color}15` }]}>
                  <Text style={[styles.percentageText, { color: status.color }]}>{item.percentage}%</Text>
                </View>
              </View>

              <View style={[styles.statsRow, { backgroundColor: colors.surface }]}>
                <View style={styles.stat}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Attended</Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>{item.attendedClasses}</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>{item.totalClasses}</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Leaves</Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>{item.dutyLeaves || 0}</Text>
                </View>
                <View style={[styles.statStatus, { backgroundColor: colors.card }]}>
                  {status.icon}
                  <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
                </View>
              </View>

              {isSelected && (
                <View style={[styles.calculatorBox, { borderTopColor: colors.border }]}>
                  <View style={styles.calcHeader}>
                    <Calculator size={18} color={colors.primary} />
                    <Text style={[styles.calcTitle, { color: colors.primary }]}>Attendance Calculator (Inc. Leaves)</Text>
                  </View>
                  <Text style={[styles.calcResult, { color: colors.text }]}>
                    {calculateMissable(item.attendedClasses, item.totalClasses, item.dutyLeaves)}
                  </Text>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <Text style={[styles.calcSubtitle, { color: colors.textSecondary }]}>If you skip 1 class today:</Text>
                  <Text style={[styles.calcImpact, { color: colors.error }]}>
                    New Percentage: {Math.ceil(((item.attendedClasses + (item.dutyLeaves || 0)) / (item.totalClasses + 1)) * 100)}%
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Aggregate Summary Section at the Bottom */}
        <Text style={[styles.sectionTitle, { marginTop: 30, marginBottom: 10, color: colors.text }]}>Summary Report</Text>
        <View style={[styles.aggregateCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
          <Text style={[styles.aggregateTitle, { color: colors.text }]}>Aggregate Attendance Details</Text>
          <View style={[styles.aggregateDivider, { backgroundColor: colors.border }]} />
          <View style={styles.aggregateRow}>
            <View style={styles.aggregateStat}>
              <Text style={[styles.aggregateLabel, { color: colors.textSecondary }]}>Total</Text>
              <Text style={[styles.aggregateValue, { color: colors.text }]}>{totalClasses}</Text>
            </View>
            <View style={styles.aggregateStat}>
              <Text style={[styles.aggregateLabel, { color: colors.textSecondary }]}>Attended</Text>
              <Text style={[styles.aggregateValue, { color: colors.text }]}>{attendedClasses}</Text>
            </View>
            <View style={styles.aggregateStat}>
              <Text style={[styles.aggregateLabel, { color: colors.textSecondary }]}>Duty Leave</Text>
              <Text style={[styles.aggregateValue, { color: colors.text }]}>{dutyLeaves}</Text>
            </View>
          </View>
          <View style={[styles.finalPercentageBox, { backgroundColor: isDark ? 'rgba(52, 199, 89, 0.15)' : 'rgba(52, 199, 89, 0.1)' }]}>
            <View>
              <Text style={[styles.finalPercentageLabel, { color: '#34C759' }]}>Aggregate Attendance</Text>
              <Text style={{ color: isDark ? '#34C759' : 'rgba(52, 199, 89, 0.8)', fontSize: 11, fontWeight: '700' }}>Including Duty Leaves</Text>
            </View>
            <Text style={[styles.finalPercentageValue, { color: '#34C759' }]}>{overallAttendance}%</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroHeader: {
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    paddingBottom: 25,
    paddingHorizontal: 25,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  aggregateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  targetControlsTop: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,122,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 8,
  },
  targetBtnTop: {
    padding: 2,
  },
  targetValueTop: {
    ...Typography.tiny,
    minWidth: 28,
    textAlign: 'center',
  },
  aggregateBadgeText: {
    ...Typography.tiny,
  },
  heroLabel: {
    ...Typography.caption,
  },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  heroValue: {
    ...Typography.h1,
    fontSize: 48, // Keeping this large size for hero
  },
  syncingText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  heroIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRowHero: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 25,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  statItemHero: {
    flex: 1,
    alignItems: 'center',
  },
  statValueHero: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabelHero: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  dividerHero: {
    width: 1,
    height: 20,
    opacity: 0.3,
  },
  targetRowHero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 25,
    padding: 12,
    borderRadius: 16,
  },
  targetLabelHero: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  targetControlsHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  targetBtnHero: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  targetValueHero: {
    fontSize: 16,
    fontWeight: '800',
    minWidth: 40,
    textAlign: 'center',
  },
  list: {
    padding: 20,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
    marginLeft: 5,
  },
  card: {
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardInfo: {
    flex: 1,
    paddingRight: 15,
  },
  subjectCode: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  subjectName: {
    ...Typography.bodyBold,
    marginBottom: 2,
  },
  percentageBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  percentageText: {
    fontSize: 18,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
  },
  stat: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  calculatorBox: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  calcHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  calcTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  calcResult: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 15,
  },
  calcSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  calcImpact: {
    fontSize: 15,
    fontWeight: '700',
  },
  aggregateCard: {
    borderRadius: 28,
    padding: 25,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  aggregateTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 15,
  },
  aggregateDivider: {
    height: 1,
    marginBottom: 20,
  },
  aggregateRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 25,
  },
  aggregateStat: {
    flex: 1,
    alignItems: 'center',
  },
  aggregateLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 8,
    textAlign: 'center',
    opacity: 0.6,
  },
  aggregateValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  finalPercentageBox: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  finalPercentageLabel: {
    fontSize: 16,
    fontWeight: '800',
  },
  finalPercentageValue: {
    fontSize: 28,
    fontWeight: '900',
  }
});
