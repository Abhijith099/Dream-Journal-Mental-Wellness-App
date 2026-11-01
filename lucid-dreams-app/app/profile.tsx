import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView, 
  Modal, 
  TextInput, 
  ActivityIndicator, 
  Alert, 
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { Colors, Fonts } from '@/constants/theme';
import { 
  ChevronLeft, 
  ChevronRight,
  User, 
  Key, 
  Download, 
  Trash2, 
  ShieldAlert, 
  HelpCircle, 
  LogOut, 
  X 
} from 'lucide-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { authenticatedFetch, BACKEND_URL } from '../utils/api';


export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, login } = useAuth();
  const [loading, setLoading] = useState(false);

  // Edit Name Modal
  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  const [nameError, setNameError] = useState('');

  // Change Password Modal
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Delete Account Modal
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // Export Data State
  const [exporting, setExporting] = useState(false);

  const getFirstInitial = () => {
    if (!user?.name) return 'U';
    return user.name.charAt(0).toUpperCase();
  };

  const handleUpdateName = async () => {
    if (!newName.trim()) {
      setNameError('Name cannot be empty.');
      return;
    }
    setNameError('');
    setLoading(true);
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update name');
      }
      
      // Update local storage/context with new name
      const token = await FileSystem.readAsStringAsync?.(FileSystem.documentDirectory + 'token.txt').catch(() => null) 
        || (Platform.OS === 'web' ? localStorage.getItem('token') : null) || '';
      await login(token, data.user);
      
      setNameModalVisible(false);
      Alert.alert('Success', 'Display name updated successfully.');
    } catch (err: any) {
      setNameError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill in all fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    setPasswordError('');
    setLoading(true);
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/auth/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to change password');
      }
      
      setPasswordModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Success', 'Password updated successfully.');
    } catch (err: any) {
      setPasswordError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/auth/export`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to export data');
      }

      if (Platform.OS === 'web') {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "lucid_dreams_data_export.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        Alert.alert('Success', 'Your data export has started.');
      } else {
        const fileUri = FileSystem.documentDirectory + 'lucid_dreams_data_export.json';
        await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(data, null, 2), {
          encoding: FileSystem.EncodingType.UTF8,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/json',
            dialogTitle: 'Export My Dream Data',
            UTI: 'public.json',
          });
        } else {
          Alert.alert('Export Completed', `Data saved locally to: ${fileUri}`);
        }
      }
    } catch (err: any) {
      Alert.alert('Export Failed', err.message || 'Unable to gather records.');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE') {
      setDeleteError('Confirmation text must match exactly.');
      return;
    }
    setDeleteError('');
    setLoading(true);
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/auth/account`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: confirmText }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete account');
      }

      setDeleteModalVisible(false);
      setConfirmText('');
      await logout();
      router.replace('/login');
      Alert.alert('Account Deleted', 'Your account and all associated data have been permanently removed.');
    } catch (err: any) {
      setDeleteError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Custom Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity 
          activeOpacity={0.7} 
          onPress={() => router.back()} 
          style={styles.backButton}
        >
          <ChevronLeft size={24} color={Colors.light.text} strokeWidth={1.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile & Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getFirstInitial()}</Text>
          </View>
          <Text style={styles.userName}>{user?.name || 'Dreamer'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'email@example.com'}</Text>
        </View>

        {/* Section: Account */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Account</Text>
          <View style={styles.card}>
            <TouchableOpacity 
              style={styles.row} 
              activeOpacity={0.6}
              onPress={() => {
                setNewName(user?.name || '');
                setNameModalVisible(true);
              }}
            >
              <View style={styles.rowLeft}>
                <User size={20} color={Colors.light.neutral} strokeWidth={1.5} style={styles.rowIcon} />
                <Text style={styles.rowText}>Edit Display Name</Text>
              </View>
              <Text style={styles.rowValue}>{user?.name}</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity 
              style={styles.row} 
              activeOpacity={0.6}
              onPress={() => setPasswordModalVisible(true)}
            >
              <View style={styles.rowLeft}>
                <Key size={20} color={Colors.light.neutral} strokeWidth={1.5} style={styles.rowIcon} />
                <Text style={styles.rowText}>Change Password</Text>
              </View>
              <ChevronRight size={14} color={Colors.light.neutral} strokeWidth={1.5} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Section: Privacy & Data */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Privacy & Data</Text>
          <View style={styles.card}>
            <TouchableOpacity 
              style={styles.row} 
              activeOpacity={0.6}
              onPress={handleExportData}
              disabled={exporting}
            >
              <View style={styles.rowLeft}>
                <Download size={20} color={Colors.light.neutral} strokeWidth={1.5} style={styles.rowIcon} />
                <Text style={styles.rowText}>Export My Data</Text>
              </View>
              {exporting ? (
                <ActivityIndicator size="small" color={Colors.light.neutral} />
              ) : (
                <Text style={styles.rowActionText}>JSON</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity 
              style={styles.row} 
              activeOpacity={0.6}
              onPress={() => setDeleteModalVisible(true)}
            >
              <View style={styles.rowLeft}>
                <Trash2 size={20} color="#D32F2F" strokeWidth={1.5} style={styles.rowIcon} />
                <Text style={[styles.rowText, { color: '#D32F2F' }]}>Delete My Account</Text>
              </View>
              <ChevronRight size={14} color={Colors.light.neutral} strokeWidth={1.5} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Section: Support */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Support</Text>
          <View style={styles.card}>
            <TouchableOpacity 
              style={styles.row} 
              activeOpacity={0.6}
              onPress={() => router.push('/safety-plan')}
            >
              <View style={styles.rowLeft}>
                <ShieldAlert size={20} color={Colors.light.neutral} strokeWidth={1.5} style={styles.rowIcon} />
                <Text style={styles.rowText}>My Safety Plan</Text>
              </View>
              <ChevronRight size={14} color={Colors.light.neutral} strokeWidth={1.5} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity 
              style={styles.row} 
              activeOpacity={0.6}
              onPress={() => router.push('/support')}
            >
              <View style={styles.rowLeft}>
                <HelpCircle size={20} color={Colors.light.neutral} strokeWidth={1.5} style={styles.rowIcon} />
                <Text style={styles.rowText}>Support & Grounding</Text>
              </View>
              <ChevronRight size={14} color={Colors.light.neutral} strokeWidth={1.5} />
            </TouchableOpacity>
          </View>
        </View>



        {/* Sign Out Outlined Button */}
        <TouchableOpacity 
          style={styles.signOutButton} 
          activeOpacity={0.7}
          onPress={async () => {
            await logout();
            router.replace('/login');
          }}
        >
          <LogOut size={18} color={Colors.light.primary} strokeWidth={1.5} style={{ marginRight: 8 }} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Name Modal */}
      <Modal visible={nameModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Display Name</Text>
              <TouchableOpacity onPress={() => setNameModalVisible(false)}>
                <X size={20} color={Colors.light.neutral} strokeWidth={1.5} />
              </TouchableOpacity>
            </View>
            {!!nameError && <Text style={styles.modalError}>{nameError}</Text>}
            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Display Name"
              placeholderTextColor="#8A8A8A"
            />
            <TouchableOpacity 
              style={styles.modalPrimaryBtn} 
              onPress={handleUpdateName}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color={Colors.light.cardBase} /> : <Text style={styles.modalBtnText}>Save Changes</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={passwordModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setPasswordModalVisible(false)}>
                <X size={20} color={Colors.light.neutral} strokeWidth={1.5} />
              </TouchableOpacity>
            </View>
            {!!passwordError && <Text style={styles.modalError}>{passwordError}</Text>}
            
            <TextInput
              style={styles.modalInput}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Current Password"
              placeholderTextColor="#8A8A8A"
              secureTextEntry={true}
            />
            <TextInput
              style={styles.modalInput}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="New Password"
              placeholderTextColor="#8A8A8A"
              secureTextEntry={true}
            />
            <TextInput
              style={styles.modalInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm New Password"
              placeholderTextColor="#8A8A8A"
              secureTextEntry={true}
            />

            <TouchableOpacity 
              style={styles.modalPrimaryBtn} 
              onPress={handleUpdatePassword}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color={Colors.light.cardBase} /> : <Text style={styles.modalBtnText}>Update Password</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Account Modal */}
      <Modal visible={deleteModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { borderTopWidth: 4, borderTopColor: '#D32F2F' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: '#D32F2F' }]}>Delete Account</Text>
              <TouchableOpacity onPress={() => setDeleteModalVisible(false)}>
                <X size={20} color={Colors.light.neutral} strokeWidth={1.5} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.deleteWarning}>
              Warning: This action is irreversible. All your dreams, vitals, safety plan details, and logs will be permanently deleted.
            </Text>
            
            <Text style={styles.deletePrompt}>
              To confirm, type <Text style={{ fontFamily: Fonts.bold || 'PoppinsSemiBold' }}>DELETE</Text> below:
            </Text>

            {!!deleteError && <Text style={styles.modalError}>{deleteError}</Text>}
            
            <TextInput
              style={[styles.modalInput, { borderColor: '#D32F2F' }]}
              value={confirmText}
              onChangeText={setConfirmText}
              placeholder="Type DELETE"
              placeholderTextColor="#8A8A8A"
              autoCapitalize="characters"
            />

            <TouchableOpacity 
              style={[
                styles.modalDeleteBtn, 
                confirmText !== 'DELETE' && styles.modalDeleteBtnDisabled
              ]} 
              onPress={handleDeleteAccount}
              disabled={confirmText !== 'DELETE' || loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.light.cardBase} />
              ) : (
                <Text style={styles.modalBtnText}>Permanently Delete My Account</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(45, 45, 45, 0.05)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.light.text,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: Colors.light.cardBase,
    borderRadius: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.primary + '25',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontFamily: Fonts.bold,
    color: Colors.light.primary,
  },
  userName: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: Colors.light.text,
  },
  userEmail: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.light.neutral,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: Colors.light.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    paddingLeft: 4,
  },
  card: {
    backgroundColor: Colors.light.cardBase,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    minHeight: 56,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowIcon: {
    marginRight: 8,
  },
  rowText: {
    fontSize: 15,
    fontFamily: Fonts.medium,
    color: Colors.light.text,
  },
  rowValue: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.light.neutral,
  },
  rowActionText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: Colors.light.text,
    backgroundColor: Colors.light.cardTint,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(45, 45, 45, 0.05)',
    marginHorizontal: 20,
  },

  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: Colors.light.primary,
    borderWidth: 1.5,
    borderRadius: 25,
    height: 50,
    marginTop: 16,
    backgroundColor: 'transparent',
  },
  signOutText: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: Colors.light.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.light.cardBase,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.light.text,
  },
  modalInput: {
    backgroundColor: Colors.light.background,
    height: 50,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: 'rgba(45, 45, 45, 0.08)',
    marginBottom: 16,
  },
  modalPrimaryBtn: {
    backgroundColor: Colors.light.text,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  modalBtnText: {
    color: Colors.light.cardBase,
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  modalError: {
    color: '#D32F2F',
    fontFamily: Fonts.medium,
    fontSize: 13,
    marginBottom: 12,
  },
  deleteWarning: {
    fontSize: 14,
    color: '#D32F2F',
    fontFamily: Fonts.medium,
    lineHeight: 20,
    marginBottom: 16,
  },
  deletePrompt: {
    fontSize: 14,
    color: Colors.light.neutral,
    fontFamily: Fonts.regular,
    marginBottom: 12,
  },
  modalDeleteBtn: {
    backgroundColor: '#D32F2F',
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  modalDeleteBtnDisabled: {
    backgroundColor: '#CCCCCC',
  },
});
