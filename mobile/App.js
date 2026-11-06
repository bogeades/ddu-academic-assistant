import 'react-native-gesture-handler';
import React, { Component } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';

class GlobalErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[App Crash Caught]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  resetError = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorHeader}>Application Error</Text>
          <Text style={styles.errorSub}>An unexpected error occurred in the mobile view.</Text>
          <ScrollView style={styles.errorBox}>
            <Text style={styles.errorMessage}>{String(this.state.error?.message || this.state.error)}</Text>
            {this.state.errorInfo?.componentStack ? (
              <Text style={styles.stackTrace}>{this.state.errorInfo.componentStack}</Text>
            ) : null}
          </ScrollView>
          <TouchableOpacity style={styles.retryBtn} onPress={this.resetError}>
            <Text style={styles.retryBtnText}>Reload App</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GlobalErrorBoundary>
        <AuthProvider>
          <NavigationContainer>
            <StatusBar style="light" />
            <AppNavigator />
          </NavigationContainer>
        </AuthProvider>
      </GlobalErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: '#0b3954',
    padding: 24,
    justifyContent: 'center',
  },
  errorHeader: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 6,
  },
  errorSub: {
    fontSize: 14,
    color: '#cbd5e1',
    marginBottom: 16,
  },
  errorBox: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    maxHeight: 280,
    marginBottom: 20,
  },
  errorMessage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#b91c1c',
    marginBottom: 10,
  },
  stackTrace: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'monospace',
  },
  retryBtn: {
    backgroundColor: '#0284c7',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
