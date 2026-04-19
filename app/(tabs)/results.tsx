import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { useScraper } from '../../context/ScraperContext';
import { ChevronDown, ChevronUp, GraduationCap } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

export default function ResultsScreen() {
  const { data } = useScraper();
  const { colors, isDark } = useTheme();
  const resultsData = (data.results && data.results.length > 0) ? data.results : [];
  const [expandedSem, setExpandedSem] = useState<string | null>(resultsData[0]?.semester || null);

  if (resultsData.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
        <GraduationCap size={64} color={colors.textSecondary} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No results found yet.</Text>
        <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Sync your data from the home screen to see your semester-wise grades.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Academic Results</Text>
        <View style={styles.subtitleRow}>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Current CGPA: {data.cgpa || '--'}</Text>
        </View>
      </View>

      <View style={styles.list}>
        {resultsData.map((sem, index) => {
          const isExpanded = expandedSem === sem.semester;

          return (
            <View key={index} style={[styles.card, { backgroundColor: colors.card }]}>
              <TouchableOpacity 
                style={styles.cardHeader}
                onPress={() => setExpandedSem(isExpanded ? null : sem.semester)}
                activeOpacity={0.7}
              >
                <View style={styles.semInfo}>
                  <Text style={[styles.semTitle, { color: colors.text }]}>{sem.semester}</Text>
                  <View style={[styles.sgpaBadge, { backgroundColor: isDark ? 'rgba(255,149,0,0.1)' : '#FFF2E5' }]}>
                    <Text style={[styles.sgpaText, { color: colors.warning }]}>TGPA: {sem.sgpa}</Text>
                  </View>
                </View>
                {isExpanded ? <ChevronUp color={colors.textSecondary} /> : <ChevronDown color={colors.textSecondary} />}
              </TouchableOpacity>

              {isExpanded && (
                <View style={[styles.expandedContent, { backgroundColor: isDark ? colors.surface : '#FAFAFA', borderTopColor: colors.border }]}>
                  {(sem.subjects || []).map((sub, subIndex) => (
                    <View key={subIndex} style={[styles.subjectRow, { borderBottomColor: colors.border }]}>
                      <View style={styles.subjectInfo}>
                        <Text style={[styles.subjectName, { color: colors.text }]}>{sub.name}</Text>
                        <Text style={[styles.creditsText, { color: colors.textSecondary }]}>{sub.code}</Text>
                      </View>
                      <View style={[styles.gradeBadge, { backgroundColor: isDark ? 'rgba(10,132,255,0.15)' : '#E5F1FF' }]}>
                        <Text style={[styles.gradeText, { color: colors.primary }]}>{sub.grade}</Text>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#F2F2F7',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8E8E93',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#000',
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 10,
  },
  comingSoonBadge: {
    backgroundColor: '#E5F1FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  comingSoonText: {
    color: '#007AFF',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '500',
  },
  list: {
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  semInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  semTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginRight: 15,
  },
  sgpaBadge: {
    backgroundColor: '#FFF2E5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sgpaText: {
    color: '#FF9500',
    fontWeight: 'bold',
    fontSize: 14,
  },
  expandedContent: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: '#FAFAFA',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  subjectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  subjectInfo: {
    flex: 1,
    paddingRight: 15,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  creditsText: {
    fontSize: 13,
    color: '#8E8E93',
  },
  gradeBadge: {
    backgroundColor: '#E5F1FF',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeText: {
    color: '#007AFF',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
