import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform, SafeAreaView, ActivityIndicator } from 'react-native';
import { RefreshCcw } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../../context/ThemeContext';

type TabType = 'APPLY' | 'SLIP';

const APPLY_URL = 'https://ums.lpu.in/lpuums/frmStudentHostelLeaveApplicationTermWise.aspx';
const SLIP_URL  = 'https://ums.lpu.in/lpuums/frmHostelLeaveSlipTest.aspx';

const injectedJS = `
  (function() {
    try {
      var style = document.createElement('style');
      style.innerHTML = '#Happeningleft, .lpu-naac, .header-wrapper, footer { display: none !important; } .form-info, .page-content { width: 100% !important; padding: 10px !important; }';
      document.head.appendChild(style);
    } catch (e) {}
  })(); true;
`;

export default function LeaveScreen() {
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('APPLY');
  const [loadingApply, setLoadingApply] = useState(true);
  const [loadingSlip,  setLoadingSlip]  = useState(true);
  const slipWebViewRef = React.useRef<WebView>(null);

  const refreshSlip = () => {
    setLoadingSlip(true);
    slipWebViewRef.current?.reload();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Leave Manager</Text>

        <View style={[styles.segmentedControl, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={[styles.segmentButton, activeTab === 'APPLY' && { backgroundColor: colors.card, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }]}
            onPress={() => setActiveTab('APPLY')}
          >
            <Text style={[styles.segmentText, { color: activeTab === 'APPLY' ? colors.text : colors.textSecondary }]}>
              Apply Leave
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentButton, activeTab === 'SLIP' && { backgroundColor: colors.card, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }]}
            onPress={() => setActiveTab('SLIP')}
          >
            <Text style={[styles.segmentText, { color: activeTab === 'SLIP' ? colors.text : colors.textSecondary }]}>
              Leave Slip
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.webviewContainer}>
        {/* ── Apply Leave WebView — stays mounted, only hidden ── */}
        <View style={[styles.webviewWrapper, activeTab !== 'APPLY' && styles.hidden]}>
          {loadingApply && (
            <View style={[styles.loaderContainer, { backgroundColor: colors.background }]}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loaderText, { color: colors.textSecondary }]}>Loading portal...</Text>
            </View>
          )}
          <WebView
            source={{ uri: APPLY_URL, headers: { 'X-Requested-With': '' } }}
            userAgent="Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36"
            style={[styles.webview, loadingApply && { opacity: 0 }]}
            onLoadEnd={() => setLoadingApply(false)}
            injectedJavaScript={injectedJS}
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
          />
        </View>

        {/* ── Leave Slip WebView — stays mounted, only hidden ── */}
        <View style={[styles.webviewWrapper, activeTab !== 'SLIP' && styles.hidden]}>
          {loadingSlip && (
            <View style={[styles.loaderContainer, { backgroundColor: colors.background }]}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loaderText, { color: colors.textSecondary }]}>Loading portal...</Text>
            </View>
          )}
          <WebView
            ref={slipWebViewRef}
            source={{ uri: SLIP_URL, headers: { 'X-Requested-With': '' } }}
            userAgent="Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36"
            style={[styles.webview, loadingSlip && { opacity: 0 }]}
            onLoadEnd={() => setLoadingSlip(false)}
            injectedJavaScript={injectedJS}
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
          />
          
          {/* Refresh Button for Slip */}
          <TouchableOpacity 
            style={[styles.refreshFab, { backgroundColor: colors.primary }]} 
            onPress={refreshSlip}
            activeOpacity={0.8}
          >
            <RefreshCcw size={20} color="#fff" />
            <Text style={styles.refreshFabText}>Refresh Slip</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C7C7CC',
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#000', letterSpacing: -0.5, marginBottom: 20 },
  segmentedControl: { flexDirection: 'row', backgroundColor: '#F2F2F7', borderRadius: 8, padding: 3 },
  segmentButton: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  segmentActive: {
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 2, elevation: 2,
  },
  segmentText: { fontSize: 14, fontWeight: '500', color: '#8E8E93' },
  segmentTextActive: { color: '#000', fontWeight: '600' },
  webviewContainer: { flex: 1 },
  webviewWrapper: { ...StyleSheet.absoluteFillObject },
  hidden: { display: 'none' },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
    marginBottom: Platform.OS === 'ios' ? 80 : 60,
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F2F2F7', zIndex: 1,
  },
  loaderText: { marginTop: 10, color: '#8E8E93', fontSize: 14 },
  refreshFab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 150 : 130,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  refreshFabText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 14,
  },
});
