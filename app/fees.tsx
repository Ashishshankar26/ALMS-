import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

const FEES_URL = 'https://ums.lpu.in/lpuums/Reports/frmStatementofAccounts.aspx';

export default function FeesScreen() {
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(true);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Statement of Accounts</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Loading overlay */}
      {loading && (
        <View style={[styles.loaderContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loaderText, { color: colors.textSecondary }]}>Loading fee details...</Text>
        </View>
      )}

      <WebView
        source={{ uri: FEES_URL }}
        userAgent="Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36"
        style={[styles.webview, loading && { opacity: 0 }]}
        onLoadEnd={() => setLoading(false)}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        injectedJavaScript={`
          (function() {
            // Hide everything except the main content
            var s = document.createElement('style');
            s.innerHTML = \`
              #Happeningleft, .lpu-naac, .header-wrapper, footer, .top-nav, .side-nav, #id_header, .footer-wrapper, .left-side-nav { 
                display: none !important; 
              }
              .form-info, .page-content, .container-fluid, body, html { 
                width: 100% !important; 
                padding: 0 !important; 
                margin: 0 !important;
                background: white !important;
              }
              table { width: 100% !important; zoom: 0.9; }
              .card { border: none !important; box-shadow: none !important; }
              /* Specific fixes for Statement of Accounts page */
              #divMain { width: 100% !important; }
            \`;
            document.head.appendChild(s);
            
            // Check for session expiry
            if (document.body.innerText.includes('Login') && document.querySelectorAll('input[type="password"]').length > 0) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SESSION_EXPIRED' }));
            }
          })(); true;
        `}
        onMessage={(event) => {
          try {
            const msg = JSON.parse(event.nativeEvent.data);
            if (msg.type === 'SESSION_EXPIRED') {
              router.replace('/login');
            }
          } catch(e) {}
        }}
      />
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
});
