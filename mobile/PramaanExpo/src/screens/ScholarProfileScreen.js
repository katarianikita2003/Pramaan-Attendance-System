// mobile/PramaanExpo/src/screens/ScholarProfileScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import {
  Card,
  Button,
  List,
  Divider,
  Chip,
  // Remove Portal and Dialog imports
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../services/api';

export default function ScholarProfileScreen({ route }) {
  const { scholarId } = route.params;
  const [scholar, setScholar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    fetchScholarDetails();
  }, []);

  const fetchScholarDetails = async () => {
    try {
      const response = await api.get(`/scholars/${scholarId}`);
      setScholar(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch scholar details');
    }
    setLoading(false);
  };

  const handleProfilePictureUpdate = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera roll permissions are required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      updateProfilePicture(result.assets[0].base64);
    }
  };

  const updateProfilePicture = async (base64Image) => {
    setLoading(true);
    try {
      await api.put(`/scholars/${scholarId}/profile-picture`, {
        image: base64Image,
      });
      Alert.alert('Success', 'Profile picture updated successfully');
      fetchScholarDetails();
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile picture');
    }
    setLoading(false);
  };

  const handleBiometricUpdate = () => {
    Alert.alert(
      'Update Biometrics',
      'This will replace your current biometric data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: updateBiometrics },
      ]
    );
  };

  const updateBiometrics = async () => {
    // Navigate to biometric capture screen
    // For now, show a placeholder alert
    Alert.alert('Info', 'Biometric update feature coming soon');
  };

  const handlePasswordChange = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordData;

    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await api.put(`/scholars/${scholarId}/password`, {
        currentPassword,
        newPassword,
      });
      Alert.alert('Success', 'Password changed successfully');
      setShowPasswordModal(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to change password');
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!scholar) {
    return (
      <View style={styles.errorContainer}>
        <Text>Scholar not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <Card style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <TouchableOpacity onPress={handleProfilePictureUpdate}>
            <Image
              source={
                scholar.profilePicture
                  ? { uri: scholar.profilePicture }
                  : require('../../assets/adaptive-icon.png')
              }
              style={styles.profileImage}
            />
            <View style={styles.editBadge}>
              <Icon name="camera" size={16} color="white" />
            </View>
          </TouchableOpacity>
          <View style={styles.profileInfo}>
            <Text style={styles.scholarName}>{scholar.name}</Text>
            <Text style={styles.scholarId}>{scholar.id}</Text>
            <Chip style={styles.statusChip}>
              {scholar.isActive ? 'Active' : 'Inactive'}
            </Chip>
          </View>
        </View>
      </Card>

      {/* Personal Information */}
      <Card style={styles.card}>
        <Card.Title title="Personal Information" />
        <Card.Content>
          <List.Item
            title="Email"
            description={scholar.email}
            left={(props) => <List.Icon {...props} icon="email" />}
          />
          <Divider />
          <List.Item
            title="Phone"
            description={scholar.phone}
            left={(props) => <List.Icon {...props} icon="phone" />}
          />
          <Divider />
          <List.Item
            title="Date of Birth"
            description={new Date(scholar.dateOfBirth).toLocaleDateString()}
            left={(props) => <List.Icon {...props} icon="calendar" />}
          />
          <Divider />
          <List.Item
            title="Address"
            description={scholar.address}
            left={(props) => <List.Icon {...props} icon="map-marker" />}
          />
        </Card.Content>
      </Card>

      {/* Academic Information */}
      <Card style={styles.card}>
        <Card.Title title="Academic Information" />
        <Card.Content>
          <List.Item
            title="Department"
            description={scholar.department}
            left={(props) => <List.Icon {...props} icon="school" />}
          />
          <Divider />
          <List.Item
            title="Program"
            description={scholar.program}
            left={(props) => <List.Icon {...props} icon="book" />}
          />
          <Divider />
          <List.Item
            title="Year"
            description={`Year ${scholar.year}`}
            left={(props) => <List.Icon {...props} icon="calendar-clock" />}
          />
          <Divider />
          <List.Item
            title="Enrollment Date"
            description={new Date(scholar.enrollmentDate).toLocaleDateString()}
            left={(props) => <List.Icon {...props} icon="calendar-check" />}
          />
        </Card.Content>
      </Card>

      {/* Attendance Summary */}
      <Card style={styles.card}>
        <Card.Title title="Attendance Summary" />
        <Card.Content>
          <View style={styles.attendanceStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{scholar.attendanceStats?.present || 0}</Text>
              <Text style={styles.statLabel}>Present</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{scholar.attendanceStats?.absent || 0}</Text>
              <Text style={styles.statLabel}>Absent</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{scholar.attendanceStats?.late || 0}</Text>
              <Text style={styles.statLabel}>Late</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {scholar.attendanceStats?.percentage || 0}%
              </Text>
              <Text style={styles.statLabel}>Overall</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Security Settings */}
      <Card style={styles.card}>
        <Card.Title title="Security Settings" />
        <Card.Content>
          <Button
            mode="outlined"
            onPress={() => setShowPasswordModal(true)}
            icon="lock"
            style={styles.actionButton}
          >
            Change Password
          </Button>
          <Button
            mode="outlined"
            onPress={handleBiometricUpdate}
            icon="face-recognition"
            style={styles.actionButton}
          >
            Update Biometrics
          </Button>
        </Card.Content>
      </Card>

      {/* Change Password Modal */}
      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Password</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Current Password"
              value={passwordData.currentPassword}
              onChangeText={(text) =>
                setPasswordData({ ...passwordData, currentPassword: text })
              }
              secureTextEntry
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="New Password"
              value={passwordData.newPassword}
              onChangeText={(text) =>
                setPasswordData({ ...passwordData, newPassword: text })
              }
              secureTextEntry
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Confirm New Password"
              value={passwordData.confirmPassword}
              onChangeText={(text) =>
                setPasswordData({ ...passwordData, confirmPassword: text })
              }
              secureTextEntry
            />
            
            <View style={styles.modalActions}>
              <Button
                mode="text"
                onPress={() => {
                  setShowPasswordModal(false);
                  setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handlePasswordChange}
                loading={loading}
              >
                Change Password
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    margin: 16,
    elevation: 4,
  },
  profileHeader: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E5E7EB',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1E3A8A',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    marginLeft: 20,
    flex: 1,
  },
  scholarName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  scholarId: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  statusChip: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  card: {
    margin: 16,
    marginTop: 0,
    elevation: 4,
  },
  attendanceStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  actionButton: {
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    width: '85%',
    maxWidth: 400,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#1F2937',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
});