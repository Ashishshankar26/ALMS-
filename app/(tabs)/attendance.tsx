import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { useScraper } from '../../context/ScraperContext';
import { CheckCircle, AlertTriangle, XCircle, Calculator, Plus, Minus } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

export default function AttendanceScreen() {
  const { data, isScraping } = useScraper();
  const { colors, isDark } = useTheme();
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [targetPct, setTargetPct] = useState(75);

  const changeTarget = (delta: number) => {
    setTargetPct(prev => Math.min(100, Math.max(50, prev + delta)));
  };

  const attendanceData = data.attendance || [];

  // Calculate Overall Attendance including Duty Leaves
  const totalClasses = attendanceData.reduce((acc, curr) => acc + (curr.totalClasses || 0), 0);
  const attendedClasses = attendanceData.reduce((acc, curr) => acc + (curr.attendedClasses || 0), 0);
  const dutyLeaves = attendanceData.reduce((acc, curr) => acc + (curr.dutyLeaves || 0), 0);
  const overallAttendance = totalClasses > 0 ? Math.ceil(((attendedClasses + dutyLeaves) / totalClasses) * 100).toString() : '0';
  const rawOverallAttendance = totalClasses > 0 ? Math.ceil((attendedClasses / totalClasses) * 100).toString() : '0';

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
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Attendance Tracker</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Overall: {rawOverallAttendance}%</Text>
          {isScraping && (
            <Text style={[styles.subtitle, { color: colors.primary, marginLeft: 10, fontWeight: 'bold' }]}>
              • Syncing...
            </Text>
          )}
        </View>

        {/* Target attendance adjuster */}
        <View style={[styles.targetRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.targetLabel, { color: colors.text }]}>Target Attendance</Text>
          <View style={[styles.targetControls, { backgroundColor: colors.surface }]}>
            <TouchableOpacity onPress={() => changeTarget(-5)} style={[styles.targetBtn, { backgroundColor: colors.card }]}>
              <Minus size={16} color={colors.primary} />
            </TouchableOpacity>
            <Text style={[styles.targetValue, { color: colors.primary }]}>{targetPct}%</Text>
            <TouchableOpacity onPress={() => changeTarget(5)} style={[styles.targetBtn, { backgroundColor: colors.card }]}>
              <Plus size={16} color={colors.primary} />
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
        <View style={[styles.aggregateCard, { backgroundColor: isDark ? colors.card : '#1C1C1E', borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
          <Text style={[styles.aggregateTitle, { color: '#fff' }]}>Aggregate Attendance Details</Text>
          <View style={[styles.aggregateDivider, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
          <View style={styles.aggregateRow}>
            <View style={styles.aggregateStat}>
              <Text style={styles.aggregateLabel}>Total</Text>
              <Text style={styles.aggregateValue}>{totalClasses}</Text>
            </View>
            <View style={styles.aggregateStat}>
              <Text style={styles.aggregateLabel}>Attended</Text>
              <Text style={styles.aggregateValue}>{attendedClasses}</Text>
            </View>
            <View style={styles.aggregateStat}>
              <Text style={styles.aggregateLabel}>Duty Leave</Text>
              <Text style={styles.aggregateValue}>{dutyLeaves}</Text>
            </View>
          </View>
          <View style={styles.finalPercentageBox}>
            <View>
              <Text style={styles.finalPercentageLabel}>Aggregate Attendance</Text>
              <Text style={{ color: 'rgba(52, 199, 89, 0.6)', fontSize: 11, fontWeight: '600' }}>Including Duty Leaves</Text>
            </View>
            <Text style={styles.finalPercentageValue}>{overallAttendance}%</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C7C7CC',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginLeft: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 4,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  targetLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  targetControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  targetBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  targetValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#007AFF',
    marginHorizontal: 8,
    minWidth: 44,
    textAlign: 'center',
  },
  list: {
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: '#007AFF',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  cardInfo: {
    flex: 1,
    paddingRight: 15,
  },
  subjectCode: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '600',
    marginBottom: 4,
  },
  subjectName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  percentageBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  percentageText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    padding: 15,
    borderRadius: 12,
  },
  stat: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  statStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  calculatorBox: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#C7C7CC',
  },
  calcHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  calcTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 8,
  },
  calcResult: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5EA',
    marginVertical: 15,
  },
  calcSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  calcImpact: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
  aggregateCard: {
    backgroundColor: '#1C1C1E', // Dark aesthetic for summary
    borderRadius: 24,
    padding: 24,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  aggregateTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  aggregateDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
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
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
    textAlign: 'center',
  },
  aggregateValue: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
  },
  finalPercentageBox: {
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  finalPercentageLabel: {
    color: '#34C759',
    fontSize: 15,
    fontWeight: 'bold',
  },
  finalPercentageValue: {
    color: '#34C759',
    fontSize: 24,
    fontWeight: '900',
  }
});
