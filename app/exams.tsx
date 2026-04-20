import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { WebView } from 'react-native-webview';
import { router } from 'expo-router';
import { ArrowLeft, Calendar, Clock, MapPin, User } from 'lucide-react-native';
import { useScraper } from '../context/ScraperContext';
import { useTheme } from '../context/ThemeContext';

const EXAMS_URL = 'https://studentums.lpu.in/dashboard/examination/conduct/seatingplan?token=e1832132a1cdb364325a027f9053b98aeb903fee43ae562924a167ca052aec55c2ffa8b58aef6601b4cf54c6674cabf570fef45885a38bf78b32007a3d40a8c5c9c70223136940245df090e86fe1e6c47f6b76c4366976cd672978092b8c8eb2';

export default function ExamsScreen() {
  const { data } = useScraper();
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [showWebView, setShowWebView] = useState(false);
  const exams = data.exams || [];
  const currentExamsUrl = EXAMS_URL;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Upcoming Exams</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Native Exam List */}
      {exams.length > 0 && !showWebView ? (
        <ScrollView style={styles.examList} contentContainerStyle={{ padding: 20 }}>
          {exams.map((exam: any, index: number) => (
            <View key={index} style={[styles.examCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.examHeader}>
                <View style={[styles.dateBadge, { backgroundColor: isDark ? 'rgba(255,59,48,0.1)' : '#FFF2F2' }]}>
                  <Calendar size={14} color={colors.error} />
                  <Text style={[styles.dateText, { color: colors.error }]}>{exam.date}</Text>
                </View>
                <View style={[styles.timeBadge, { backgroundColor: isDark ? 'rgba(10,132,255,0.1)' : '#E5F1FF' }]}>
                  <Clock size={14} color={colors.primary} />
                  <Text style={[styles.timeText, { color: colors.primary }]}>{exam.time}</Text>
                </View>
              </View>

              <Text style={[styles.courseCode, { color: colors.primary }]}>{exam.subjectCode}</Text>
              <Text style={[styles.subjectName, { color: colors.text }]}>{exam.subject}</Text>

              <View style={styles.footerRow}>
                <View style={styles.metaItem}>
                  <MapPin size={16} color={colors.textSecondary} />
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>Room: {exam.room}</Text>
                </View>
                {exam.seat && (
                  <View style={styles.metaItem}>
                    <User size={16} color={colors.textSecondary} />
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>Seat: {exam.seat}</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
          
          <TouchableOpacity 
            style={[styles.webFallbackBtn, { borderColor: colors.border }]} 
            onPress={() => setShowWebView(true)}
          >
            <Text style={{ color: colors.textSecondary }}>View Original Date Sheet</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <>
          {loading && (
            <View style={[styles.loaderContainer, { backgroundColor: colors.background }]}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loaderText, { color: colors.textSecondary }]}>Loading seating plan...</Text>
            </View>
          )}
          <WebView
            source={{ uri: currentExamsUrl }}
            userAgent="Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36"
            style={[styles.webview]}
            onLoadEnd={() => setLoading(false)}
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
            injectedJavaScript={`
              (function() {
                var s = document.createElement('style');
                s.innerHTML = \`
                  .header-wrapper, footer, .top-nav, .side-nav, .navbar, .sidebar, .header-nav, .main-header { 
                    display: none !important; 
                  }
                  .page-content, .container-fluid, body, html, .main-content, .wrapper { 
                    width: 100% !important; 
                    padding: 0 !important; 
                    margin: 0 !important;
                  }
                \`;
                document.head.appendChild(s);
              })(); true;
            `}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.warn('WebView error: ', nativeEvent);
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.warn('WebView HTTP error: ', nativeEvent);
            }}
            onMessage={(event) => {
              console.log('WebView message:', event.nativeEvent.data);
            }}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C7C7CC',
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: '#000' },
  webview: { flex: 1 },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    top: 100,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#fff', zIndex: 1,
  },
  loaderText: { marginTop: 12, color: '#8E8E93', fontSize: 15 },
  examList: { flex: 1 },
  examCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  examHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  dateText: { fontSize: 12, fontWeight: 'bold' },
  timeText: { fontSize: 12, fontWeight: 'bold' },
  courseCode: { fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  subjectName: { fontSize: 16, fontWeight: '600', marginBottom: 15 },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, fontWeight: '500' },
  webFallbackBtn: {
    marginTop: 10,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    marginBottom: 30,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 20 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', marginTop: 8 },
});
