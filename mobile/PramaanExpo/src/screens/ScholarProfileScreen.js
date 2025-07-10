// mobile/PramaanExpo/src/screens/ScholarProfileScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import {
  Card,
  Button,
  TextInput,
  Avatar,
  IconButton,
  Dialog,
  Portal,
  List,
  Divider,
  Switch,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { scholarService } from '../services/api';

const ScholarProfileScreen = ({ navigation }) => {
  const { user, updateUser, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    year: '',
    scholarId: '',
    profileImage: null,
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [settings, setSettings] = useState({
    notificationsEnabled: true,
    biometricEnabled: true,
    locationTracking: true,
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await scholarService.getProfile();
      
      if (response.success) {
        setProfileData({
          name: response.data.personalInfo.name,
          email: response.data.personalInfo.email,
          phone: response.data.personalInfo.phone || '',
          department: response.data.academicInfo?.department || '',
          year: response.data.academicInfo?.year || '',
          scholarId: response.data.scholarId,
          profileImage: response.data.personalInfo.profileImage,
        });
        
        setSettings({
          notificationsEnabled: response.data.settings?.notifications ?? true,
          biometricEnabled: response.data.settings?.biometric ?? true,
          locationTracking: response.data.settings?.location ?? true,
        });
      }
    } catch (error) {
      console.error('Load profile error:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      const response = await scholarService.updateProfile({
        personalInfo: {
          name: profileData.name,
          phone: profileData.phone,
        },
        academicInfo: {
          department: profileData.department,
          year: profileData.year,
        },
      });

      if (response.success) {
        Alert.alert('Success', 'Profile updated successfully');
        setEditMode(false);
        updateUser(response.data);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    try {
      setLoading(true);
      const response = await scholarService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      if (response.success) {
        Alert.alert('Success', 'Password changed successfully');
        setShowPasswordDialog(false);
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleImagePicker = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      // Upload image logic here
      setProfileData({ ...profileData, profileImage: result.assets[0].uri });
    }
  };

  const handleSettingChange = async (setting, value) => {
    try {
      const newSettings = { ...settings, [setting]: value };
      setSettings(newSettings);
      
      // Update on server
      await scholarService.updateSettings({
        [setting]: value,
      });
    } catch (error) {
      // Revert on error
      setSettings(settings);
      Alert.alert('Error', 'Failed to update setting');
    }
  };

  const renderProfileHeader = () => (
    <View style={styles.profileHeader}>
      <TouchableOpacity onPress={editMode ? handleImagePicker : null}>
        {profileData.profileImage ? (
          <Image source={{ uri: profileData.profileImage }} style={styles.profileImage} />
        ) : (
          <Avatar.Text
            size={80}
            label={profileData.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            style={styles.avatar}
          />
        )}
        {editMode && (
          <View style={styles.editImageOverlay}>
            <Icon name="camera-alt" size={24} color="white" />
          </View>
        )}
      </TouchableOpacity>
      
      <Text style={styles.profileName}>{profileData.name}</Text>
      <Text style={styles.scholarId}>Scholar ID: {profileData.scholarId}</Text>
      
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{user?.attendancePercentage || 0}%</Text>
          <Text style={styles.statLabel}>Attendance</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{user?.totalPresent || 0}</Text>
          <Text style={styles.statLabel}>Present</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{user?.totalDays || 0}</Text>
          <Text style={styles.statLabel}>Total Days</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <IconButton
          icon={editMode ? 'check' : 'pencil'}
          onPress={editMode ? handleUpdateProfile : () => setEditMode(true)}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderProfileHeader()}

        {/* Personal Information */}
        <Card style={styles.card}>
          <Card.Title title="Personal Information" />
          <Card.Content>
            <TextInput
              label="Full Name"
              value={profileData.name}
              onChangeText={(text) => setProfileData({ ...profileData, name: text })}
              mode="outlined"
              disabled={!editMode}
              style={styles.input}
            />
            
            <TextInput
              label="Email"
              value={profileData.email}
              mode="outlined"
              disabled
              style={styles.input}
            />
            
            <TextInput
              label="Phone Number"
              value={profileData.phone}
              onChangeText={(text) => setProfileData({ ...profileData, phone: text })}
              mode="outlined"
              disabled={!editMode}
              keyboardType="phone-pad"
              style={styles.input}
            />
          </Card.Content>
        </Card>

        {/* Academic Information */}
        <Card style={styles.card}>
          <Card.Title title="Academic Information" />
          <Card.Content>
            <TextInput
              label="Department"
              value={profileData.department}
              onChangeText={(text) => setProfileData({ ...profileData, department: text })}
              mode="outlined"
              disabled={!editMode}
              style={styles.input}
            />
            
            <TextInput
              label="Year"
              value={profileData.year}
              onChangeText={(text) => setProfileData({ ...profileData, year: text })}
              mode="outlined"
              disabled={!editMode}
              style={styles.input}
            />
          </Card.Content>
        </Card>

        {/* Settings */}
        <Card style={styles.card}>
          <Card.Title title="Settings" />
          <Card.Content>
            <List.Item
              title="Notifications"
              description="Receive attendance reminders"
              left={() => <List.Icon icon="bell" />}
              right={() => (
                <Switch
                  value={settings.notificationsEnabled}
                  onValueChange={(value) => handleSettingChange('notificationsEnabled', value)}
                />
              )}
            />
            <Divider />
            
            <List.Item
              title="Biometric Authentication"
              description="Use fingerprint/face for attendance"
              left={() => <List.Icon icon="fingerprint" />}
              right={() => (
                <Switch
                  value={settings.biometricEnabled}
                  onValueChange={(value) => handleSettingChange('biometricEnabled', value)}
                />
              )}
            />
            <Divider />
            
            <List.Item
              title="Location Tracking"
              description="Verify attendance location"
              left={() => <List.Icon icon="map-marker" />}
              right={() => (
                <Switch
                  value={settings.locationTracking}
                  onValueChange={(value) => handleSettingChange('locationTracking', value)}
                />
              )}
            />
          </Card.Content>
        </Card>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            mode="outlined"
            icon="lock-reset"
            onPress={() => setShowPasswordDialog(true)}
            style={styles.actionButton}
          >
            Change Password
          </Button>
          
          <Button
            mode="outlined"
            icon="download"
            onPress={() => navigation.navigate('AttendanceReport')}
            style={styles.actionButton}
          >
            Download Report
          </Button>
          
          <Button
            mode="contained"
            icon="logout"
            onPress={logout}
            style={[styles.actionButton, styles.logoutButton]}
            contentStyle={styles.logoutButtonContent}
          >
            Logout
          </Button>
        </View>
      </ScrollView>

      {/* Change Password Dialog */}
      <Portal>
        <Dialog
          visible={showPasswordDialog}
          onDismiss={() => setShowPasswordDialog(false)}
        >
          <Dialog.Title>Change Password</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Current Password"
              value={passwordData.currentPassword}
              onChangeText={(text) => setPasswordData({ ...passwordData, currentPassword: text })}
              mode="outlined"
              secureTextEntry
              style={styles.dialogInput}
            />
            
            <TextInput
              label="New Password"
              value={passwordData.newPassword}
              onChangeText={(text) => setPasswordData({ ...passwordData, newPassword: text })}
              mode="outlined"
              secureTextEntry
              style={styles.dialogInput}
            />
            
            <TextInput
              label="Confirm New Password"
              value={passwordData.confirmPassword}
              onChangeText={(text) => setPasswordData({ ...passwordData, confirmPassword: text })}
              mode="outlined"
              secureTextEntry
              style={styles.dialogInput}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowPasswordDialog(false)}>Cancel</Button>
            <Button onPress={handleChangePassword} loading={loading}>
              Change Password
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: 'white',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatar: {
    backgroundColor: '#6C63FF',
  },
  editImageOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 16,
    padding: 4,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 12,
    color: '#333',
  },
  scholarId: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 20,
    paddingHorizontal: 40,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e0e0e0',
  },
  card: {
    margin: 16,
    elevation: 2,
  },
  input: {
    marginBottom: 12,
  },
  actions: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  actionButton: {
    marginBottom: 12,
  },
  logoutButton: {
    backgroundColor: '#FF5252',
  },
  logoutButtonContent: {
    paddingVertical: 6,
  },
  dialogInput: {
    marginBottom: 12,
  },
});

export default ScholarProfileScreen;
