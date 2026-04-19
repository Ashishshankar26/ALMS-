import React, { useRef, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { WebView } from 'react-native-webview';
import { useAuth } from '../context/AuthContext';
import { router } from 'expo-router';

export default function LoginScreen() {
  const { login } = useAuth();
  const { colors, isDark } = useTheme();
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // This script runs BEFORE the page loads. It places a shield over the input fields.
  // Whenever the user taps the Password field, the 'blur' event tries to tell the website they left the User ID field.
  // We intercept that event and kill it instantly so the website's anti-bot AJAX never fires!
  const injectedJavaScriptBeforeContentLoaded = `
    (function() {
      function killEvent(e) {
        if (e.target && (e.target.id === 'txtU' || e.target.type === 'password' || e.target.tagName === 'INPUT')) {
          e.stopImmediatePropagation();
          e.stopPropagation();
        }
      }
      // Use the capture phase (true) to intercept events BEFORE jQuery can see them
      document.addEventListener('blur', killEvent, true);
      document.addEventListener('focusout', killEvent, true);
      document.addEventListener('change', killEvent, true);
    })();
    true;
  `;

  const injectedJavaScript = `
    (function() {
      // Monitor login button clicks to capture credentials
      var btn = document.getElementById('btnLogin');
      if (btn) {
        btn.addEventListener('click', function() {
          var u = document.getElementById('txtUserName') ? document.getElementById('txtUserName').value : '';
          var p = document.getElementById('txtPassword') ? document.getElementById('txtPassword').value : '';
          if (u && p) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SAVE_CREDENTIALS', u: u, p: p }));
          }
        });
      }

      // Check for presence of fields and notify app
      var poll = setInterval(function() {
        if (document.getElementById('txtUserName')) {
          clearInterval(poll);
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'READY_TO_FILL' }));
        }
      }, 500);
    })();
    true;
  `;

  const [savedCreds, setSavedCreds] = useState<any>(null);

  React.useEffect(() => {
    const loadCreds = async () => {
      const stored = await AsyncStorage.getItem('@credentials');
      if (stored) setSavedCreds(JSON.parse(stored));
    };
    loadCreds();
  }, []);

  const handleNavigationStateChange = (navState: any) => {
    if (navState.url.toLowerCase().includes('dashboard') || navState.url.toLowerCase().includes('home')) {
        login({ name: 'Student', username: savedCreds?.u, password: savedCreds?.p }).then(() => {
            router.replace('/(tabs)');
        });
    }
  };

  const onMessage = (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'SAVE_CREDENTIALS') {
        setSavedCreds(msg);
        AsyncStorage.setItem('@credentials', JSON.stringify(msg)).catch(console.error);
      } else if (msg.type === 'READY_TO_FILL') {
        if (savedCreds) {
          webViewRef.current?.injectJavaScript(`
            (function() {
              var u = document.getElementById('txtUserName');
              var p = document.getElementById('txtPassword');
              if (u) u.value = '${savedCreds.u}';
              if (p) p.value = '${savedCreds.p}';
              // Trigger any focus events needed by the site
              u?.dispatchEvent(new Event('change', { bubbles: true }));
              p?.dispatchEvent(new Event('change', { bubbles: true }));
            })();
            true;
          `);
        }
      }
    } catch (e) {}
  };

  const spoofedUserAgent = "Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerText, { color: colors.text }]}>LPU UMS Login</Text>
        <Text style={[styles.subText, { color: colors.textSecondary }]}>Please log in to sync your data.</Text>
      </View>

      <WebView
        ref={webViewRef}
        source={{ 
          uri: 'https://ums.lpu.in/lpuums/LoginNew.aspx',
          headers: {
            'X-Requested-With': ''
          }
        }}
        style={styles.webview}
        userAgent={spoofedUserAgent}
        injectedJavaScriptBeforeContentLoaded={injectedJavaScriptBeforeContentLoaded}
        injectedJavaScript={injectedJavaScript}
        onNavigationStateChange={handleNavigationStateChange}
        onMessage={onMessage}
        onError={() => setError(true)}
        onHttpError={() => setError(true)}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        mixedContentMode="always"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#343a40',
  },
  subText: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 5,
  },
  webview: {
    flex: 1,
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    fontSize: 16,
  }
});
