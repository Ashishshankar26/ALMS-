import React from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, TouchableOpacity, Dimensions, Platform, Image, Modal } from 'react-native';

// ... (other imports) ...
import { useScraper } from '../../context/ScraperContext';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Bell, Clock, Award, ChevronRight, CheckCircle2, FileText, UploadCloud, GraduationCap, Moon, Sun } from 'lucide-react-native';
import { useTheme, Typography } from '../../context/ThemeContext';
import { router } from 'expo-router';
import * as Updates from 'expo-updates';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const { data, isScraping, refreshData, dumpHtml } = useScraper();
  const { logout } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();

  // Profile Data
  const profile = data.profile;

  // Calculate Overall Attendance including Duty Leaves
  const totalClasses = data.attendance?.reduce((acc, curr) => acc + (curr.totalClasses || 0), 0) || 0;
  const attendedClasses = data.attendance?.reduce((acc, curr) => acc + (curr.attendedClasses || 0), 0) || 0;
  const dutyLeaves = data.attendance?.reduce((acc, curr) => acc + (curr.dutyLeaves || 0), 0) || 0;
  
  const calculatedAttendance = totalClasses > 0 ? Math.ceil(((attendedClasses + dutyLeaves) / totalClasses) * 100) : 0;
  const overallAttendance = data.overallAttendance ? Math.ceil(parseFloat(data.overallAttendance)).toString() : calculatedAttendance.toString();

  // Helper to find "Next Class" dynamically
  const getNextClass = () => {
    const timetable = data.timetable || {};
    const makeupClasses = data.makeupClasses || [];
    
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const now = new Date();
    const currentDay = days[now.getDay()];
    // Get date in DD-MMM-YYYY or DD MMM YYYY format to match makeup classes
    const todayStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    
    const currentTimeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    
    const parseTimeTo24h = (timeStr: string) => {
      if (!timeStr) return null;
      const match = timeStr.match(/(\d{1,2}):(\d{2})/);
      if (!match) return null;
      let hours = parseInt(match[1]);
      const minutes = match[2];
      const isPM = timeStr.toUpperCase().includes('PM');
      const isAM = timeStr.toUpperCase().includes('AM');
      if (isPM && hours < 12) hours += 12;
      if (isAM && hours === 12) hours = 0;
      return hours.toString().padStart(2, '0') + ':' + minutes;
    };

    // 1. Combine regular classes for today and makeup classes for today
    const candidates: any[] = [];
    
    // Regular classes
    if (timetable[currentDay]) {
      timetable[currentDay].forEach((c: any) => candidates.push({ ...c, isMakeup: false }));
    }
    
    // Makeup classes
    makeupClasses.forEach((c: any) => {
      // Check if makeup class is today
      if (c.date) {
        const d = new Date(c.date);
        if (d.toDateString() === now.toDateString()) {
           candidates.push({ 
             time: c.time, 
             subject: c.subject, 
             subjectCode: c.subjectCode,
             room: c.room,
             type: c.type || 'Makeup',
             isMakeup: true 
           });
        }
      }
    });

    if (candidates.length === 0) return { status: 'no_classes' };

    const upcoming = candidates.filter((c: any) => {
      const startTime = parseTimeTo24h(c.time);
      return startTime ? startTime > currentTimeStr : false;
    });

    if (upcoming.length > 0) {
      upcoming.sort((a: any, b: any) => {
        const tA = parseTimeTo24h(a.time) || '';
        const tB = parseTimeTo24h(b.time) || '';
        return tA.localeCompare(tB);
      });
      
      const next = upcoming[0];
      console.log('NEXT CLASS FOUND:', JSON.stringify(next));
      
      // Prioritize structured data if available (from new Scraper logic)
      if (next.subjectCode || next.subject) {
        return {
          status: 'upcoming',
          time: next.time,
          subjectCode: next.subjectCode,
          subject: next.subject,
          room: next.room || 'TBA',
          type: next.type || 'Lecture'
        };
      }

      // Parse regular class details robustly for legacy/other formats
      const details = next.details || '';
      let subject = 'Class';
      let subjectCode = '';
      let room = 'TBA';
      let type = 'Lecture';

      if (details.includes('R:')) {
        const subjectMatch = details.match(/^([^ ]+)/);
        const roomMatch = details.match(/R:\s*([A-Z0-9-]+)/i);
        subjectCode = subjectMatch ? subjectMatch[1] : '';
        room = roomMatch ? roomMatch[1] : 'TBA';
      } else {
        const parts = details.split(/\s*\/\s*/);
        if (parts.length >= 2) {
          type = parts[0].trim();
          const codePart = parts[1].trim();
          const codeMatch = codePart.match(/^([A-Z0-9]+)/i);
          subjectCode = codeMatch ? codeMatch[1] : '';
          subject = codePart.split('-')[1]?.trim() || codePart;
          room = parts[2] ? parts[2].trim() : 'TBA';
        } else {
          const codeMatch = details.match(/([A-Z]{2,}\d{2,})/i);
          if (codeMatch) subjectCode = codeMatch[1];
          const roomMatch = details.match(/(?:R:|Room:)\s*([A-Z0-9-]+)/i) || details.match(/\b(\d{2}-\d{3}[A-Z]?)\b/);
          if (roomMatch) room = roomMatch[1] || room;
        }
      }

      return {
        status: 'upcoming',
        time: next.time,
        subjectCode: subjectCode,
        subject: subject,
        room: room,
        type: type
      };
    }
    return { status: 'finished' };
  };

  const nextClassInfo = getNextClass();

  const nextExam = (() => {
    if (!data.exams || data.exams.length === 0) return null;
    const now = new Date();
    // Reset time for date-only comparison
    now.setHours(0, 0, 0, 0);
    const futureExams = data.exams.filter((ex: any) => {
      const exDate = new Date(ex.date);
      return exDate >= now;
    });
    if (futureExams.length === 0) return null;
    futureExams.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return futureExams[0];
  })();

  const [showMessages, setShowMessages] = React.useState(false);
  const [updateAvailable, setUpdateAvailable] = React.useState(false);
  const version = Constants.expoConfig?.version || '1.0.0';

  React.useEffect(() => {
    async function checkUpdates() {
      if (__DEV__) return;
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          setUpdateAvailable(true);
        }
      } catch (e) {
        console.log('Update check failed:', e);
      }
    }
    checkUpdates();
  }, []);

  const handleUpdate = async () => {
    try {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch (e) {
      alert('Update failed. Please try again later.');
    }
  };

  const openGitHub = () => {
    Linking.openURL('https://github.com/Ashishshankar26/ALMS/releases');
  };

  const handleExamsPress = () => {
    router.push('/exams' as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl 
          refreshing={isScraping} 
          onRefresh={() => {
            console.log('PULL TO REFRESH TRIGGERED');
            refreshData();
          }} 
          tintColor="#007AFF"
          progressViewOffset={Platform.OS === 'android' ? 30 : 0}
        />
      }
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* Enhanced Header Section with Profile */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.welcomeText, { color: isDark ? colors.textSecondary : '#8E8E93' }]}>Welcome back,</Text>
            <Text style={[styles.nameLarge, { color: colors.text }]}>{profile?.name?.split(' ')[0] || 'Student'}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={[styles.notificationBtn, { backgroundColor: colors.surface }]} onPress={toggleTheme}>
              {isDark ? <Sun size={20} color={colors.warning} /> : <Moon size={20} color={colors.primary} />}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.notificationBtn, { backgroundColor: colors.surface }]} onPress={() => setShowMessages(true)}>
              <Bell size={20} color={colors.primary} />
              {data.messages && data.messages.length > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifText}>{data.messages.length}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={logout} style={[styles.logoutBtn, { backgroundColor: isDark ? 'rgba(255,59,48,0.2)' : '#FFF2F2' }]}>
              <LogOut size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        {profile && (
          <View style={[styles.premiumProfileCard, { backgroundColor: isDark ? '#2C2C2E' : '#FAFAFA', borderColor: colors.border }]}>
            <View style={styles.profileRow}>
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatarLarge} />
              <View style={styles.profileDetails}>
                <Text style={[styles.fullName, { color: colors.text }]}>{profile.name}</Text>
                <View style={styles.badgeRow}>
                  <View style={[styles.vidBadge, { backgroundColor: isDark ? 'rgba(10,132,255,0.15)' : '#E5F1FF' }]}>
                    <Text style={[styles.vidText, { color: colors.primary }]}>{profile.vid}</Text>
                  </View>
                  <View style={[styles.sectionBadge, { backgroundColor: isDark ? colors.surface : '#F2F2F7' }]}>
                    <Text style={[styles.sectionText, { color: colors.text }]}>{profile.section}</Text>
                  </View>
                  {profile.rollNo && (
                    <View style={[styles.rollBadge, { backgroundColor: isDark ? 'rgba(255,149,0,0.15)' : '#FFF9E5' }]}>
                      <Text style={[styles.rollText, { color: colors.warning }]}>Roll: {profile.rollNo}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.programText, { color: colors.textSecondary }]} numberOfLines={2}>{profile.program}</Text>
              </View>
            </View>
            <View style={[styles.syncRow, { borderTopColor: colors.border }]}>
              <View style={styles.statusDot} />
              <Text style={styles.syncText}>
                Last synced: {data.lastUpdated ? new Date(data.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
              </Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.content}>
        {/* Simplified Fee Section */}
        <TouchableOpacity 
          style={[styles.feeCard, { backgroundColor: colors.card, borderColor: colors.border }]} 
          onPress={() => router.push('/fees' as any)}
          activeOpacity={0.8}
        >
          <View style={styles.feeInfo}>
            <View style={[styles.feeIconBg, { backgroundColor: isDark ? colors.surface : '#F2F2F7' }]}>
              <FileText size={24} color={colors.secondary} />
            </View>
            <View>
              <Text style={[styles.feeLabel, { color: colors.textSecondary }]}>Outstanding Fee</Text>
              <Text style={[styles.feeValue, { color: colors.text }]}>₹ {data.fee || '0'}/-</Text>
            </View>
          </View>
          <View style={[styles.payButton, { backgroundColor: isDark ? 'rgba(88,86,214,0.1)' : '#F2F2F7' }]}>
            <Text style={[styles.payButtonText, { color: colors.secondary }]}>View Details</Text>
            <ChevronRight size={16} color={colors.secondary} />
          </View>
        </TouchableOpacity>
        
        {/* Grid and other sections same as before, but Announcements use data.announcements */}
        {/* ... */}
        
        {/* CGPA & Attendance Grid */}
        <View style={styles.gridContainer}>
          <TouchableOpacity 
            style={[styles.gridCard, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/results')}
            activeOpacity={0.9}
          >
            <View style={styles.cardGlow} />
            <Award size={28} color="#fff" style={styles.cardIcon} />
            <Text style={styles.gridCardLabel}>Overall CGPA</Text>
            <Text style={styles.gridCardValue}>{data.cgpa || '--'}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.gridCard, { backgroundColor: colors.success }]}
            onPress={() => router.push('/attendance')}
            activeOpacity={0.9}
          >
            <View style={styles.cardGlow} />
            <CheckCircle2 size={28} color="#fff" style={styles.cardIcon} />
            <Text style={styles.gridCardLabel}>Attendance</Text>
            <Text style={styles.gridCardValue}>{overallAttendance}%</Text>
          </TouchableOpacity>
        </View>

        {/* Upcoming Exams Banner */}
        <TouchableOpacity style={[styles.examsBanner, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={handleExamsPress} activeOpacity={0.8}>
          <View style={[styles.examsBannerIcon, { backgroundColor: nextExam ? colors.error : colors.primary }]}>
            <GraduationCap size={24} color="#fff" />
          </View>
          <View style={styles.examsBannerTextContainer}>
            <Text style={[styles.examsBannerTitle, { color: colors.text }]}>
              {nextExam ? `Next Exam: ${nextExam.date}` : 'Upcoming Exams'}
            </Text>
            <Text style={[styles.examsBannerSubtitle, { color: colors.textSecondary }]}>
              {nextExam ? `${nextExam.subjectCode} - ${nextExam.room}` : 'View Conduct & Seating Plan'}
            </Text>
          </View>
          <ChevronRight size={20} color={isDark ? colors.textSecondary : colors.primary} />
        </TouchableOpacity>

        {/* Pending Assignments */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Pending Assignments</Text>
        {data.assignments && data.assignments.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {data.assignments.map((assignment, index) => (
              <View key={index} style={[styles.assignmentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <View style={styles.assignmentHeader}>
                    <FileText size={18} color={colors.warning} />
                    <Text style={[styles.assignmentCourse, { color: colors.text }]} numberOfLines={1}>{assignment.courseCode}</Text>
                  </View>
                  <Text style={[styles.assignmentType, { color: colors.textSecondary }]} numberOfLines={2}>{assignment.type}</Text>
                </View>
                
                <View style={styles.assignmentFooter}>
                  <Text style={[styles.assignmentDate, { color: colors.textSecondary }]}>Last Date: {assignment.lastDate}</Text>
                  <TouchableOpacity 
                    style={[styles.uploadButton, { backgroundColor: isDark ? 'rgba(10,132,255,0.1)' : 'rgba(0,122,255,0.05)' }]}
                    onPress={() => router.push('/assignments_upload' as any)}
                  >
                    <UploadCloud size={14} color={colors.primary} />
                    <Text style={[styles.uploadButtonText, { color: colors.primary }]}>Upload</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No pending assignments.</Text>
          </View>
        )}

        {/* Next Class Widget */}
        <Text style={[styles.sectionTitle, { marginTop: 20, color: colors.text }]}>Next Class</Text>
        {nextClassInfo.status === 'upcoming' ? (
          <View style={[styles.nextClassCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.nextClassHeader}>
              <View style={[styles.timeBadge, { backgroundColor: isDark ? 'rgba(255,159,10,0.1)' : 'rgba(255,149,0,0.1)' }]}>
                <Clock size={14} color={colors.warning} />
                <Text style={[styles.timeText, { color: colors.warning }]}>{nextClassInfo.time}</Text>
              </View>
              <View style={[styles.roomBadge, { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(10,132,255,0.1)' : 'rgba(0,122,255,0.1)' }]}>
                <Text style={{ color: colors.primary, fontSize: 10, fontWeight: 'bold' }}>Room: </Text>
                <Text style={[styles.roomText, { color: colors.primary }]}>{nextClassInfo.room}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Text style={[styles.courseCode, { color: colors.primary, marginBottom: 0 }]}>{nextClassInfo.subjectCode}</Text>
            </View>
            <Text style={[styles.subjectText, { color: colors.text }]}>{nextClassInfo.subject}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <View style={{ backgroundColor: isDark ? 'rgba(10,132,255,0.15)' : 'rgba(0,122,255,0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '600' }}>{nextClassInfo.type}</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <CheckCircle2 size={24} color={colors.success} style={{ marginBottom: 8 }} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {nextClassInfo.status === 'no_classes' ? 'No classes scheduled for today.' : 'All classes finished for today! 🎉'}
            </Text>
          </View>
        )}

        {/* Announcements */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Announcements</Text>
        <View style={[styles.announcementContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {data.announcements && data.announcements.length > 0 ? (
            data.announcements.slice(0, 10).map((item: any, index: number) => (
              <TouchableOpacity key={item.id || index} style={[styles.announcementCard, { borderBottomColor: colors.border }]}>
                <View style={styles.announcementInner}>
                  <View style={[styles.announcementIndicator, { backgroundColor: colors.primary }]} />
                  <View style={styles.announcementContent}>
                    <Text style={[styles.announcementTitle, { color: colors.text }]} numberOfLines={3}>{item.title}</Text>
                    <Text style={[styles.announcementDate, { color: colors.textSecondary }]}>{item.date}</Text>
                  </View>
                </View>
                <ChevronRight size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            ))
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No new announcements.</Text>
            </View>
          )}
          {/* Update Manager */}
        <View style={[styles.updateCard, { backgroundColor: isDark ? 'rgba(10,132,255,0.05)' : '#F0F7FF', borderColor: colors.primary + '30', flexDirection: 'column', alignItems: 'stretch' }]}>
          <View style={[styles.updateInfo, { marginBottom: 15 }]}>
            <View style={[styles.versionBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.versionText}>v{version}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.updateTitle, { color: colors.text }]}>
                {updateAvailable ? 'New Update Ready! 🚀' : 'App is up to date'}
              </Text>
              <Text style={[styles.updateSub, { color: colors.textSecondary }]}>
                {updateAvailable ? 'Restart to apply fixes' : 'Check GitHub for releases'}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity 
            onPress={updateAvailable ? handleUpdate : openGitHub}
            style={[styles.updateBtn, { backgroundColor: colors.primary, alignSelf: 'flex-start' }]}
          >
            <Text style={styles.updateBtnText}>
              {updateAvailable ? 'Update Now' : 'Check for Updates'}
            </Text>
          </TouchableOpacity>
        </View>

      </View>

      </View>
    </ScrollView>
      {/* Modal for My Messages */}
      <Modal visible={showMessages} animationType="slide" transparent={true}>
        <View style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>My Messages</Text>
              <TouchableOpacity onPress={() => setShowMessages(false)} style={[styles.closeBtn, { backgroundColor: colors.surface }]}>
                <Text style={[styles.closeBtnText, { color: colors.primary }]}>Close</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.messagesList} showsVerticalScrollIndicator={false}>
              {data.messages && data.messages.length > 0 ? (
                data.messages.map((item, idx) => (
                  <View key={item.id || idx} style={[styles.messageItem, { backgroundColor: isDark ? colors.surface : '#FAFAFA', borderColor: colors.border }]}>
                    <View style={[styles.messageMarker, { backgroundColor: colors.primary }]} />
                    <View style={styles.messageBody}>
                      <Text style={[styles.messageTitle, { color: colors.text }]}>{item.title}</Text>
                      <Text style={[styles.messageDate, { color: colors.textSecondary }]}>{item.date}</Text>
                      <Text style={[styles.messageContent, { color: isDark ? colors.textSecondary : '#666' }]}>{item.content}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Bell size={40} color={colors.textSecondary} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No personal messages</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 25,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C7C7CC',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 25,
  },
  welcomeText: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  nameLarge: {
    color: '#000',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  notificationBtn: {
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 22,
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF3B30',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  notifText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  logoutBtn: {
    backgroundColor: '#FFF2F2',
    padding: 12,
    borderRadius: 22,
  },
  premiumProfileCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F2F2F7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 2,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 18,
    borderWidth: 4,
    borderColor: '#fff',
  },
  profileDetails: {
    flex: 1,
  },
  fullName: {
    color: '#000',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  vidBadge: {
    backgroundColor: '#E5F1FF',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  sectionBadge: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  vidText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sectionText: {
    color: '#333',
    fontSize: 12,
    fontWeight: 'bold',
  },
  programText: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34C759',
    marginRight: 8,
  },
  syncText: {
    color: '#34C759',
    fontSize: 12,
    fontWeight: '600',
  },
  feeCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F2F2F7',
  },
  feeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  feeIconBg: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  feeLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  feeValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000',
    marginTop: 2,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  payButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#5856D6',
  },
  content: {
    padding: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  gridCard: {
    width: (width - 55) / 2,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  cardIcon: {
    marginBottom: 15,
    opacity: 0.9,
  },
  gridCardLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  gridCardValue: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 5,
  },
  examsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5F1FF',
    padding: 15,
    borderRadius: 16,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#CCE0FF',
  },
  examsBannerIcon: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 12,
    marginRight: 15,
  },
  examsBannerTextContainer: {
    flex: 1,
  },
  examsBannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 2,
  },
  examsBannerSubtitle: {
    fontSize: 13,
    color: '#005BB5',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 15,
    letterSpacing: -0.5,
  },
  horizontalScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
    paddingBottom: 10, // Shadow clipping
  },
  assignmentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    width: 190,
    minHeight: 160,
    marginRight: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    justifyContent: 'space-between',
  },
  assignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  assignmentCourse: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000',
    marginLeft: 6,
    flex: 1,
  },
  assignmentType: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
  },
  assignmentFooter: {
    marginTop: 10,
  },
  assignmentDate: {
    fontSize: 12,
    color: '#FF3B30',
    fontWeight: '600',
    marginBottom: 8,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
    paddingVertical: 8,
    borderRadius: 8,
  },
  uploadButtonText: {
    color: '#007AFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  nextClassCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  nextClassHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF2E5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  timeText: {
    color: '#FF9500',
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 5,
  },
  roomBadge: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  roomText: {
    color: '#007AFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  subjectText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  typeText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  announcementContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 40,
  },
  announcementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F2F2F7',
  },
  announcementInner: {
    flex: 1,
    flexDirection: 'row',
  },
  announcementIndicator: {
    width: 3.5,
    borderRadius: 10,
    marginRight: 15,
    marginVertical: 4,
  },
  announcementContent: {
    flex: 1,
    paddingRight: 10,
  },
  announcementTitle: {
    ...Typography.bodyBold,
    fontSize: 15.5,
    lineHeight: 20,
    marginBottom: 2,
  },
  announcementDate: {
    ...Typography.body,
    fontSize: 12,
    opacity: 0.75,
    marginTop: 0,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
  },
  emptyText: {
    color: '#8E8E93',
    fontSize: 15,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    height: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  closeBtn: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  closeBtnText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  messagesList: {
    flex: 1,
  },
  messageItem: {
    flexDirection: 'row',
    marginBottom: 15,
    backgroundColor: '#FAFAFA',
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: '#F2F2F7',
  },
  messageMarker: {
    width: 4,
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
    marginRight: 12,
  },
  messageBody: {
    flex: 1,
  },
  messageTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  messageDate: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 8,
  },
  messageContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyText: {
    color: '#8E8E93',
    marginTop: 10,
    fontSize: 16,
  },
  updateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 20,
    marginBottom: 10,
    marginHorizontal: 0,
  },
  updateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  versionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  versionText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  updateTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  updateSub: {
    fontSize: 11,
  },
  updateBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  updateBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
