import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { useScraper } from '../../context/ScraperContext';
import { ChevronDown, ChevronUp, GraduationCap, Award, BookOpen, Star } from 'lucide-react-native';
import { useTheme, Typography } from '../../context/ThemeContext';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

export default function ResultsScreen() {
  const { data } = useScraper();
  const { colors, isDark } = useTheme();
  const resultsData = (data.results && data.results.length > 0) ? data.results : [];
  const [expandedSem, setExpandedSem] = useState<string | null>(resultsData[0]?.semester || null);

  const getGradeColor = (grade: string) => {
    const g = grade.toUpperCase();
    if (['O', 'A+', 'A'].includes(g)) return '#34C759'; // Success Green
    if (['B+', 'B'].includes(g)) return '#007AFF'; // Blue
    if (['C', 'P', 'D'].includes(g)) return '#FFCC00'; // Yellow
    return '#FF3B30'; // Red
  };

  const getGradeBg = (grade: string) => {
    const color = getGradeColor(grade);
    return isDark ? `${color}20` : `${color}15`;
  };

  if (resultsData.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? colors.card : '#F2F2F7' }]}>
          <GraduationCap size={48} color={colors.primary} />
        </View>
        <Text style={[styles.emptyText, { color: colors.text }]}>No results found yet.</Text>
        <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
          Pull to refresh on the home screen to sync your semester-wise grades.
        </Text>
      </View>
    );
  }

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
              <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>Cumulative GPA</Text>
              <Text style={[styles.heroValue, { color: colors.text }]}>{data.cgpa || '0.00'}</Text>
            </View>
            <View style={[styles.heroIconCircle, { backgroundColor: colors.primary + '20' }]}>
              <Award size={32} color={colors.primary} />
            </View>
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Star size={16} color={colors.warning} />
              <Text style={[styles.statText, { color: colors.textSecondary }]}>Top 10% Batch</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <BookOpen size={16} color={colors.primary} />
              <Text style={[styles.statText, { color: colors.textSecondary }]}>{resultsData.length} Semesters</Text>
            </View>
          </View>
        </View>

        <View style={styles.list}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Semester Breakdown</Text>
          
          {resultsData.map((sem, index) => {
            const isExpanded = expandedSem === sem.semester;

            return (
              <View key={index} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TouchableOpacity 
                  style={styles.cardHeader}
                  onPress={() => setExpandedSem(isExpanded ? null : sem.semester)}
                  activeOpacity={0.7}
                >
                  <View style={styles.semInfo}>
                    <View style={[styles.semNumberBadge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.semNumberText}>{index + 1}</Text>
                    </View>
                    <View>
                      <Text style={[styles.semTitle, { color: colors.text }]}>{sem.semester}</Text>
                      <Text style={[styles.semSubtitle, { color: colors.textSecondary }]}>Passed All Subjects</Text>
                    </View>
                  </View>
                  
                  <View style={styles.headerRight}>
                    <View style={[styles.sgpaBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9F9F9' }]}>
                      <Text style={[styles.sgpaLabel, { color: colors.textSecondary }]}>TGPA</Text>
                      <Text style={[styles.sgpaValue, { color: colors.primary }]}>{sem.sgpa}</Text>
                    </View>
                    {isExpanded ? 
                      <ChevronUp size={20} color={colors.textSecondary} /> : 
                      <ChevronDown size={20} color={colors.textSecondary} />
                    }
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={[styles.expandedContent, { borderTopColor: colors.border }]}>
                    {(sem.subjects || []).map((sub, subIndex) => (
                      <View key={subIndex} style={styles.subjectRow}>
                        <View style={styles.subjectMain}>
                          <Text style={[styles.subjectName, { color: colors.text }]} numberOfLines={1}>{sub.name}</Text>
                          <View style={styles.subjectMeta}>
                            <Text style={[styles.subjectCode, { color: colors.textSecondary }]}>{sub.code}</Text>
                            <View style={styles.dot} />
                            <Text style={[styles.creditsText, { color: colors.textSecondary }]}>4 Credits</Text>
                          </View>
                        </View>
                        
                        <View style={[styles.gradeBadge, { backgroundColor: getGradeBg(sub.grade) }]}>
                          <Text style={[styles.gradeText, { color: getGradeColor(sub.grade) }]}>{sub.grade}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
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
    paddingBottom: 30,
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
  heroLabel: {
    ...Typography.caption,
  },
  heroValue: {
    ...Typography.h1,
    fontSize: 48,
  },
  heroIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 25,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 14,
    marginHorizontal: 15,
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
    alignItems: 'center',
    padding: 16,
  },
  semInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  semNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  semNumberText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  semTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  semSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sgpaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
  },
  sgpaLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  sgpaValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  subjectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  subjectMain: {
    flex: 1,
    paddingRight: 10,
  },
  subjectName: {
    ...Typography.bodyBold,
    marginBottom: 2,
  },
  subjectMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subjectCode: {
    fontSize: 12,
    fontWeight: '500',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#C7C7CC',
  },
  creditsText: {
    fontSize: 12,
    fontWeight: '500',
  },
  gradeBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeText: {
    fontWeight: '800',
    fontSize: 15,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
  },
});
