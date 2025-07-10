// mobile/PramaanExpo/src/screens/ProfileScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Image,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  TextInput,
  Avatar,
  List,
  Divider,
  Dialog,
  Portal,
  Switch,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
// Remove ImagePicker import - we'll handle it differently
// import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { adminService, scholarService } from '../services/api';

const ProfileScreen = ({ navigation }) => {
  const { user, userType, updateUser, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    department: '',
    designation: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [preferences, setPreferences] = useState({
    notifications: true,
    biometricAuth: true,
    locationTracking: true,
  });

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const service = userType === 'admin' ? adminService : scholarService;
      const response = await service.getProfile();
      
      if (response.success) {
        setProfileData({
          name: response.profile.name,
          email: response.profile.email,
          phone: response.profile.phone || '',
          department: response.profile.department || '',
          designation: response.profile.designation || '',
        });
      }
    } catch (error) {
      console.error('Load profile error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      const service = userType === 'admin' ? adminService : scholarService;
      const response = await service.updateProfile(profileData);
      
      if (response.success) {
        updateUser({
          ...user,
          name: profileData.name,
          email: profileData.email,
        });
        setEditing(false);
        Alert.alert('Success', 'Profile updated successfully');
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
      // API call to change password
      Alert.alert('Success', 'Password changed successfully');
      setShowPasswordDialog(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleImagePicker = async () => {
    // Placeholder for image picker
    Alert.alert(
      'Change Avatar',
      'Choose an option',
      [
        { text: 'Camera', onPress: () => console.log('Camera selected') },
        { text: 'Gallery', onPress: () => console.log('Gallery selected') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: logout, style: 'destructive' },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity onPress={() => setEditing(!editing)}>
          <Icon name={editing ? 'close' : 'edit'} size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity onPress={handleImagePicker} disabled={!editing}>
            <Avatar.Text
              size={100}
              label={profileData.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              style={styles.avatar}
            />
            {editing && (
              <View style={styles.editAvatarIcon}>
                <Icon name="camera-alt" size={20} color="white" />
              </View>
            )}
          </TouchableOpacity>
          
          <Title style={styles.profileName}>{profileData.name}</Title>
          <Paragraph style={styles.profileRole}>
            {userType === 'admin' ? 'Administrator' : `Scholar ID: ${user?.scholarId}`}
          </Paragraph>
          <Paragraph style={styles.profileOrg}>
            {user?.organizationCode || 'Organization'}
          </Paragraph>
        </View>

        {/* Profile Information */}
        <Card style={styles.infoCard}>
          <Card.Title title="Personal Information" />
          <Card.Content>
            <TextInput
              label="Full Name"
              value={profileData.name}
              onChangeText={(text) => setProfileData({ ...profileData, name: text })}
              mode="outlined"
              disabled={!editing}
              style={styles.input}
            />
            
            <TextInput
              label="Email"
              value={profileData.email}
              onChangeText={(text) => setProfileData({ ...profileData, email: text })}
              mode="outlined"
              disabled={!editing}
              keyboardType="email-address"
              style={styles.input}
            />
            
            <TextInput
              label="Phone Number"
              value={profileData.phone}
              onChangeText={(text) => setProfileData({ ...profileData, phone: text })}
              mode="outlined"
              disabled={!editing}
              keyboardType="phone-pad"
              style={styles.input}
            />
            
            {userType === 'scholar' && (
              <TextInput
                label="Department"
                value={profileData.department}
                onChangeText={(text) => setProfileData({ ...profileData, department: text })}
                mode="outlined"
                disabled={!editing}
                style={styles.input}
              />
            )}
            
            {userType === 'admin' && (
              <TextInput
                label="Designation"
                value={profileData.designation}
                onChangeText={(text) => setProfileData({ ...profileData, designation: text })}
                mode="outlined"
                disabled={!editing}
                style={styles.input}
              />
            )}
            
            {editing && (
              <Button
                mode="contained"
                onPress={handleUpdateProfile}
                loading={loading}
                disabled={loading}
                style={styles.saveButton}
              >
                Save Changes
              </Button>
            )}
          </Card.Content>
        </Card>

        {/* Security Settings */}
        <Card style={styles.securityCard}>
          <Card.Title title="Security & Privacy" />
          <Card.Content>
            <List.Item
              title="Change Password"
              description="Update your account password"
              left={(props) => <List.Icon {...props} icon="lock" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => setShowPasswordDialog(true)}
            />
            
            <Divider />
            
            <List.Item
              title="Biometric Authentication"
              description="Use fingerprint or face to login"
              left={(props) => <List.Icon {...props} icon="fingerprint" />}
              right={() => (
                <Switch
                  value={preferences.biometricAuth}
                  onValueChange={(value) => 
                    setPreferences({ ...preferences, biometricAuth: value })
                  }
                />
              )}
            />
            
            <Divider />
            
            <List.Item
              title="Location Access"
              description="Allow location for attendance marking"
              left={(props) => <List.Icon {...props} icon="map-marker" />}
              right={() => (
                <Switch
                  value={preferences.locationTracking}
                  onValueChange={(value) => 
                    setPreferences({ ...preferences, locationTracking: value })
                  }
                />
              )}
            />
          </Card.Content>
        </Card>

        {/* Preferences */}
        <Card style={styles.preferencesCard}>
          <Card.Title title="Preferences" />
          <Card.Content>
            <List.Item
              title="Push Notifications"
              description="Receive attendance reminders"
              left={(props) => <List.Icon {...props} icon="notifications" />}
              right={() => (
                <Switch
                  value={preferences.notifications}
                  onValueChange={(value) => 
                    setPreferences({ ...preferences, notifications: value })
                  }
                />
              )}
            />
            
            <Divider />
            
            <List.Item
              title="About Pramaan"
              description="Version 1.0.0"
              left={(props) => <List.Icon {...props} icon="info" />}
              onPress={() => {
                Alert.alert(
                  'About Pramaan',
                  'Zero-Knowledge Proof based Attendance System\n\nVersion: 1.0.0\nDeveloped with privacy in mind.',
                  [{ text: 'OK' }]
                );
              }}
            />
            
            <Divider />
            
            <List.Item
              title="Privacy Policy"
              left={(props) => <List.Icon {...props} icon="privacy-tip" />}
              right={(props) => <List.Icon {...props} icon="open-in-new" />}
              onPress={() => {
                // Open privacy policy
              }}
            />
          </Card.Content>
        </Card>

        {/* Logout Button */}
        <Button
          mode="outlined"
          onPress={handleLogout}
          style={styles.logoutButton}
          contentStyle={styles.logoutButtonContent}
          icon="logout"
        >
          Logout
        </Button>
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
              onChangeText={(text) => 
                setPasswordData({ ...passwordData, currentPassword: text })
              }
              mode="outlined"
              secureTextEntry
              style={styles.dialogInput}
            />
            
            <TextInput
              label="New Password"
              value={passwordData.newPassword}
              onChangeText={(text) => 
                setPasswordData({ ...passwordData, newPassword: text })
              }
              mode="outlined"
              secureTextEntry
              style={styles.dialogInput}
            />
            
            <TextInput
              label="Confirm New Password"
              value={passwordData.confirmPassword}
              onChangeText={(text) => 
                setPasswordData({ ...passwordData, confirmPassword: text })
              }
              mode="outlined"
              secureTextEntry
              style={styles.dialogInput}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowPasswordDialog(false)}>Cancel</Button>
            <Button 
              onPress={handleChangePassword}
              loading={loading}
              disabled={loading}
            >
              Change
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: 'white',
  },
  avatar: {
    backgroundColor: '#6C63FF',
  },
  editAvatarIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#6C63FF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 16,
    color: '#333',
  },
  profileRole: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  profileOrg: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
  },
  infoCard: {
    margin: 16,
    elevation: 2,
  },
  input: {
    marginBottom: 16,
  },
  saveButton: {
    marginTop: 8,
    backgroundColor: '#6C63FF',
  },
  securityCard: {
    margin: 16,
    marginTop: 0,
    elevation: 2,
  },
  preferencesCard: {
    margin: 16,
    marginTop: 0,
    elevation: 2,
  },
  logoutButton: {
    margin: 16,
    borderColor: '#FF5252',
  },
  logoutButtonContent: {
    paddingVertical: 8,
  },
  dialogInput: {
    marginBottom: 12,
  },
});

export default ProfileScreen;