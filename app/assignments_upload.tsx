import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

const UPLOAD_URL = 'https://ums.lpu.in/lpuums/frmstudentassignmentupload.aspx';

export default function AssignmentUploadScreen() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Upload Assignment</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Loading overlay */}
      {loading && (
        <View style={[styles.loaderContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loaderText, { color: colors.textSecondary }]}>Loading upload portal...</Text>
        </View>
      )}

      <WebView
        source={{ uri: UPLOAD_URL }}
        userAgent="Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36"
        style={[styles.webview, loading && { opacity: 0 }]}
        onLoadEnd={() => setLoading(false)}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        originWhitelist={['*']}
        mixedContentMode="always"
        allowsFileAccess={true}
        allowFileAccessFromFileURLs={true}
        allowUniversalAccessFromFileURLs={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        injectedJavaScript={`
          (function() {
            var s = document.createElement('style');
            s.innerHTML = \`
              #Happeningleft, .lpu-naac, .header-wrapper, footer, .top-nav, .side-nav, #id_header, .footer-wrapper { 
                display: none !important; 
              }
              .form-info, .page-content, .container-fluid, body, html { 
                width: 100% !important; 
                padding: 0 !important; 
                margin: 0 !important;
                background: white !important;
              }
              table { width: 100% !important; zoom: 0.9; }
              input[type="submit"], .btn { 
                border-radius: 8px !important;
                padding: 10px 20px !important;
                background-color: #007AFF !important;
                border: none !important;
              }
            \`;
            document.head.appendChild(s);
            
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
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700' },
  webview: { flex: 1 },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    top: 100,
    justifyContent: 'center', alignItems: 'center',
    zIndex: 1,
  },
  loaderText: { marginTop: 12, fontSize: 15 },
});
