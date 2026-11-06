import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import api from '../services/api';
import { colors, touchTargets } from '../theme/colors';

export const RegisterScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      return Alert.alert('Required Fields', 'Please fill in name, email, and password.');
    }

    if (password.length < 8) {
      return Alert.alert('Weak Password', 'Password must be at least 8 characters in length.');
    }

    if (!/\d/.test(password)) {
      return Alert.alert('Password Requirement', 'Password must contain at least one numerical digit (0-9).');
    }

    if (!/[A-Z]/.test(password)) {
      return Alert.alert('Password Requirement', 'Password must contain at least one uppercase letter (A-Z).');
    }

    setSubmitting(true);
    try {
      const res = await api.post('/auth/register', {
        name,
        email,
        studentId,
        password,
        yearOfStudy: 1,
      });

      Alert.alert(
        'Registration Submitted',
        res.data.message || 'Please check your email to verify your student account.',
        [{ text: 'Proceed to Login', onPress: () => navigation.navigate('Login') }]
      );
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        (err.response?.data?.errors && err.response.data.errors[0]?.message) ||
        (err.message === 'Network Error'
          ? `Cannot reach backend server. Please verify your phone is on the same network or hotspot as the computer.`
          : err.message || 'Please try again.');
      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={{ alignItems: 'center', marginBottom: 8 }}>
        <Image
          source={require('../../assets/ddu-logo.png')}
          style={{ width: 80, height: 80, resizeMode: 'contain', marginBottom: 8 }}
        />
      </View>
      <Text style={styles.title}>Student Registration</Text>
      <Text style={styles.subtitle}>Dire Dawa University IoT • Computer Science</Text>

      <Text style={styles.label}>Full Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Yared Getachew" />

      <Text style={styles.label}>Institutional Email</Text>
      <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="student@ddu.edu.et" autoCapitalize="none" keyboardType="email-address" />

      <Text style={styles.label}>Student ID</Text>
      <TextInput style={styles.input} value={studentId} onChangeText={setStudentId} placeholder="DDU/R/1024/14" />

      <Text style={styles.label}>Password (min 8 chars, 1 uppercase, 1 digit)</Text>
      <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" />

      <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Register Student Account</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.linkText}>Back to Sign In</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: colors.background, flexGrow: 1, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: colors.primary, textAlign: 'center' },
  subtitle: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 4 },
  input: {
    height: touchTargets.minInputHeight,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: touchTargets.borderRadius,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 14,
  },
  btn: {
    height: touchTargets.minButtonHeight,
    backgroundColor: colors.primary,
    borderRadius: touchTargets.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  link: { marginTop: 16, alignItems: 'center' },
  linkText: { color: colors.accent, fontWeight: '600' },
});
