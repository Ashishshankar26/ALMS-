import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { useScraper } from '../../context/ScraperContext';
import { Clock, MapPin, Tag } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function TimetableScreen() {
  const { data } = useScraper();
  const { colors, isDark } = useTheme();
  const timetable = data.timetable || {};
  const [activeDay, setActiveDay] = useState('Monday');

  // Extract ALL Makeup/Adjustment Classes
  const makeupClasses: any[] = [];

  // 1. Add classes from the dedicated makeup page (high quality)
  if (data.makeupClasses && data.makeupClasses.length > 0) {
    data.makeupClasses.forEach(cls => {
      makeupClasses.push({ ...cls, isMakeup: true });
    });
  }

  // 2. Add classes found in the regular timetable (as fallback)
  Object.keys(timetable).forEach(day => {
    (timetable[day] || []).forEach((cls: any) => {
      if (cls.date) {
        // Check for duplicates (same date, time, and subject code)
        const exists = makeupClasses.some(m =>
          m.date === cls.date &&
          m.time === cls.time &&
          m.subjectCode === cls.subjectCode
        );
        if (!exists) {
          makeupClasses.push({ ...cls, isMakeup: true, dayName: day });
        }
      }
    });
  });

  const classesForDay = timetable[activeDay] || [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Schedule</Text>

        {/* Day Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.daySelector}
          contentContainerStyle={{ paddingHorizontal: 20 }}
        >
          {DAYS.map((day) => (
            <TouchableOpacity
              key={day}
              style={[styles.dayButton, { backgroundColor: colors.surface }, activeDay === day && { backgroundColor: colors.primary }]}
              onPress={() => setActiveDay(day)}
            >
              <Text style={[styles.dayText, { color: colors.textSecondary }, activeDay === day && { color: '#fff' }]}>
                {day.substring(0, 3)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Makeup Classes Section */}
        <View style={styles.makeupSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Makeup Classes</Text>
          {makeupClasses.length > 0 ? (
            <View style={makeupClasses.length > 1 ? styles.makeupGridContainer : null}>
              {makeupClasses.map((cls: any, index: number) => {
                const isGrid = makeupClasses.length > 1;
                const timeParts = (cls.time || "").split(/\s*-\s*/);
                const startTime = timeParts[0] || "--:--";
                const endTimeFull = timeParts[1] || "";
                const endTime = endTimeFull.split(/\s+/)[0] || "--:--";
                const ampm = (cls.time || "").toUpperCase().includes('PM') ? 'PM' : 'AM';

                return (
                  <View key={index} style={[
                    styles.classCard, 
                    isGrid ? styles.makeupGridCard : styles.makeupSingleCard,
                    { backgroundColor: colors.card }
                  ]}>
                    {!isGrid && (
                      <View style={styles.timeColumn}>
                        <Text style={[styles.timeStart, { color: colors.text }]}>{startTime}</Text>
                        <View style={[styles.timeLine, { backgroundColor: isDark ? 'rgba(255,149,0,0.3)' : '#FFD60A' }]} />
                        <View style={{ alignItems: 'center', marginTop: -2 }}>
                          <Text style={[styles.timeEnd, { color: colors.textSecondary }]}>{endTime}</Text>
                          <Text style={[styles.timeAmpm, { color: colors.textSecondary }]}>{ampm}</Text>
                        </View>
                      </View>
                    )}
                    
                    <View style={isGrid ? { flex: 1 } : styles.classInfo}>
                      <Text style={[styles.makeupDate, { color: colors.warning, fontSize: isGrid ? 11 : 13 }]}>
                        {cls.date} {cls.dayName ? `(${cls.dayName})` : ''}
                      </Text>

                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={[styles.courseCode, { color: colors.primary, marginBottom: 0, fontSize: isGrid ? 12 : 14 }]}>
                          {cls.subjectCode}
                        </Text>
                      </View>
                      
                      <Text 
                        style={[styles.subjectName, { color: colors.text, fontSize: isGrid ? 14 : 18, marginBottom: 8 }]}
                        numberOfLines={isGrid ? 2 : undefined}
                      >
                        {cls.subject}
                      </Text>

                      {isGrid && (
                         <View style={[styles.metaRow, { marginBottom: 2 }]}>
                            <Clock size={12} color={colors.textSecondary} />
                            <Text style={[styles.metaText, { color: colors.textSecondary, fontSize: 11, marginLeft: 4 }]}>{startTime}</Text>
                         </View>
                      )}

                      <View style={styles.metaRow}>
                        <MapPin size={isGrid ? 12 : 14} color={colors.textSecondary} />
                        <Text style={[styles.metaText, { color: colors.textSecondary, fontSize: isGrid ? 11 : 14, marginLeft: isGrid ? 4 : 8 }]}>
                          {isGrid ? cls.room : `Room: ${cls.room}`}
                        </Text>
                      </View>

                      {!isGrid && cls.faculty ? (
                        <View style={styles.metaRow}>
                          <Clock size={14} color={colors.textSecondary} />
                          <Text style={[styles.metaText, { color: colors.textSecondary }]}>{cls.faculty}</Text>
                        </View>
                      ) : null}

                      {!isGrid && cls.category ? (
                        <View style={[styles.metaRow, { marginTop: 4 }]}>
                          <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ fontSize: 10, color: colors.textSecondary, fontWeight: 'bold' }}>{cls.category.toUpperCase()}</Text>
                          </View>
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: isDark ? 'rgba(255,159,10,0.1)' : '#FFFBE6', borderColor: colors.warning, borderWidth: 1 }]}>
              <Text style={[styles.emptyText, { color: colors.warning }]}>No makeup classes assigned.</Text>
            </View>
          )}
        </View>

        {/* Regular Schedule Section */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Regular Schedule</Text>
        {classesForDay.length > 0 ? (
          classesForDay.map((cls: any, index: number) => {
            const timeParts = (cls.time || "").split(/\s*-\s*/);
            const startTime = timeParts[0] || "--:--";
            const endTimeFull = timeParts[1] || "";
            const endTime = endTimeFull.split(/\s+/)[0] || "--:--";
            const ampm = (cls.time || "").toUpperCase().includes('PM') ? 'PM' : 'AM';

            return (
              <View key={cls.id || index} style={[styles.classCard, { backgroundColor: colors.card }]}>
                <View style={styles.timeColumn}>
                  <Text style={[styles.timeStart, { color: colors.text }]}>{startTime}</Text>
                  <View style={[styles.timeLine, { backgroundColor: colors.border }]} />
                  <View style={{ alignItems: 'center', marginTop: -2 }}>
                    <Text style={[styles.timeEnd, { color: colors.textSecondary }]}>{endTime}</Text>
                    <Text style={[styles.timeAmpm, { color: colors.textSecondary }]}>{ampm}</Text>
                  </View>
                </View>

                <View style={styles.classInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={[styles.courseCode, { color: colors.primary, marginBottom: 0 }]}>{cls.subjectCode}</Text>
                  </View>
                  <Text style={[styles.subjectName, { fontSize: 18, color: colors.text }]}>{cls.subject}</Text>

                  <View style={[styles.metaRow, { marginTop: 8 }]}>
                    <MapPin size={14} color={colors.textSecondary} />
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>{cls.room}</Text>
                  </View>

                  <View style={styles.metaRow}>
                    <Tag size={14} color={colors.textSecondary} />
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>{cls.type}</Text>
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No classes scheduled for {activeDay}.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C7C7CC',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    letterSpacing: -0.5,
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  daySelector: {
    marginBottom: 15,
  },
  dayButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    marginRight: 10,
  },
  dayButtonActive: {
    backgroundColor: '#007AFF',
  },
  dayText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
  },
  dayTextActive: {
    color: '#fff',
  },
  list: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 15,
    marginTop: 5,
  },
  makeupSection: {
    marginBottom: 20,
  },
  makeupGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  makeupGridCard: {
    width: (Dimensions.get('window').width - 52) / 2,
    flexDirection: 'column',
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#FF9500',
    borderRadius: 16,
    marginBottom: 12,
  },
  makeupSingleCard: {
    borderWidth: 1.5,
    borderColor: '#FF9500',
  },
  makeupBadge: {
    backgroundColor: '#FF9500',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
    gap: 4,
  },
  makeupBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  makeupDate: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  classCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  timeColumn: {
    alignItems: 'center',
    marginRight: 20,
    width: 60,
  },
  timeStart: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  timeLine: {
    width: 2,
    height: 30,
    backgroundColor: '#E5E5EA',
    marginVertical: 5,
  },
  timeEnd: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  timeAmpm: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#8E8E93',
    marginTop: 2,
  },
  classInfo: {
    flex: 1,
  },
  courseCode: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '700',
    marginBottom: 2,
  },
  subjectName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  metaText: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 8,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  }
});
