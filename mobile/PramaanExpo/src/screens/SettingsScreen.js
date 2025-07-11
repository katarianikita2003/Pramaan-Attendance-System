// mobile/PramaanExpo/src/screens/SettingsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  TextInput,
  List,
  Divider,
  Switch,
  Chip,
  Dialog,
  Portal,
  RadioButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons as Icon } from '@expo/vector-icons';
// Remove MapView imports - we'll create a placeholder
// import MapView, { Polygon, Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { organizationService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const SettingsScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const initialTab = route.params?.tab || 'general';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  
  // Organization settings
  const [orgSettings, setOrgSettings] = useState({
    name: '',
    address: '',
    contactEmail: '',
    contactPhone: '',
    maxScholars: 50,
    currentScholars: 0,
  });
  
  // Attendance settings
  const [attendanceSettings, setAttendanceSettings] = useState({
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    attendanceWindow: {
      start: '08:00',
      end: '10:00',
    },
    lateMarkAfter: 15, // minutes
    absentMarkAfter: 60, // minutes
    requireLocation: true,
    requireBiometric: true,
  });
  
  // Location boundaries
  const [boundaries, setBoundaries] = useState({
    center: {
      latitude: 28.7041,
      longitude: 77.1025,
    },
    radius: 500, // meters
    polygonCoords: [],
  });
  
  // Privacy settings
  const [privacySettings, setPrivacySettings] = useState({
    dataRetention: 365, // days
    anonymizeData: false,
    shareAnalytics: true,
    zkpLevel: 'standard', // standard, enhanced
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await organizationService.getDetails();
      
      if (response.success) {
        setOrgSettings({
          name: response.organization.name,
          address: response.organization.contact.address,
          contactEmail: response.organization.contact.email,
          contactPhone: response.organization.contact.phone,
          maxScholars: response.organization.stats.maxScholars,
          currentScholars: response.organization.stats.scholars,
        });
      }
    } catch (error) {
      console.error('Load settings error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      const response = await organizationService.updateSettings({
        name: orgSettings.name,
        contact: {
          email: orgSettings.contactEmail,
          phone: orgSettings.contactPhone,
          address: orgSettings.address,
        },
      });
      
      if (response.success) {
        Alert.alert('Success', 'Settings updated successfully');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Location permission is required for boundary setup');
      return;
    }
    
    const location = await Location.getCurrentPositionAsync({});
    setBoundaries({
      ...boundaries,
      center: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      },
    });
  };

  const renderGeneralTab = () => (
    <ScrollView style={styles.tabContent}>
      <Card style={styles.card}>
        <Card.Title title="Organization Information" />
        <Card.Content>
          <TextInput
            label="Organization Name"
            value={orgSettings.name}
            onChangeText={(text) => setOrgSettings({ ...orgSettings, name: text })}
            mode="outlined"
            style={styles.input}
          />
          
          <TextInput
            label="Address"
            value={orgSettings.address}
            onChangeText={(text) => setOrgSettings({ ...orgSettings, address: text })}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
          />
          
          <TextInput
            label="Contact Email"
            value={orgSettings.contactEmail}
            onChangeText={(text) => setOrgSettings({ ...orgSettings, contactEmail: text })}
            mode="outlined"
            keyboardType="email-address"
            style={styles.input}
          />
          
          <TextInput
            label="Contact Phone"
            value={orgSettings.contactPhone}
            onChangeText={(text) => setOrgSettings({ ...orgSettings, contactPhone: text })}
            mode="outlined"
            keyboardType="phone-pad"
            style={styles.input}
          />
          
          <Button
            mode="contained"
            onPress={handleSaveSettings}
            loading={loading}
            disabled={loading}
            style={styles.saveButton}
          >
            Save Changes
          </Button>
        </Card.Content>
      </Card>
      
      <Card style={styles.card}>
        <Card.Title 
          title="Subscription Plan" 
          subtitle={`${orgSettings.currentScholars} / ${orgSettings.maxScholars} scholars`}
        />
        <Card.Content>
          <View style={styles.planInfo}>
            <Chip mode="flat" style={styles.planChip}>Free Plan</Chip>
            <Text style={styles.planLimit}>50 scholars maximum</Text>
          </View>
          
          <View style={styles.usageBar}>
            <View 
              style={[
                styles.usageProgress, 
                { width: `${(orgSettings.currentScholars / orgSettings.maxScholars) * 100}%` }
              ]} 
            />
          </View>
          
          <Button
            mode="outlined"
            onPress={() => setShowUpgradeDialog(true)}
            style={styles.upgradeButton}
            icon="rocket"
          >
            Upgrade Plan
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );

  const renderAttendanceTab = () => (
    <ScrollView style={styles.tabContent}>
      <Card style={styles.card}>
        <Card.Title title="Working Days" />
        <Card.Content>
          <View style={styles.workingDaysContainer}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <Chip
                key={day}
                mode={attendanceSettings.workingDays.includes(day) ? 'flat' : 'outlined'}
                selected={attendanceSettings.workingDays.includes(day)}
                onPress={() => {
                  const newDays = attendanceSettings.workingDays.includes(day)
                    ? attendanceSettings.workingDays.filter(d => d !== day)
                    : [...attendanceSettings.workingDays, day];
                  setAttendanceSettings({ ...attendanceSettings, workingDays: newDays });
                }}
                style={styles.dayChip}
              >
                {day}
              </Chip>
            ))}
          </View>
        </Card.Content>
      </Card>
      
      <Card style={styles.card}>
        <Card.Title title="Attendance Window" />
        <Card.Content>
          <View style={styles.timeRow}>
            <TextInput
              label="Start Time"
              value={attendanceSettings.attendanceWindow.start}
              onChangeText={(text) => setAttendanceSettings({
                ...attendanceSettings,
                attendanceWindow: { ...attendanceSettings.attendanceWindow, start: text }
              })}
              mode="outlined"
              style={styles.timeInput}
            />
            
            <TextInput
              label="End Time"
              value={attendanceSettings.attendanceWindow.end}
              onChangeText={(text) => setAttendanceSettings({
                ...attendanceSettings,
                attendanceWindow: { ...attendanceSettings.attendanceWindow, end: text }
              })}
              mode="outlined"
              style={styles.timeInput}
            />
          </View>
          
          <TextInput
            label="Mark Late After (minutes)"
            value={attendanceSettings.lateMarkAfter.toString()}
            onChangeText={(text) => setAttendanceSettings({
              ...attendanceSettings,
              lateMarkAfter: parseInt(text) || 0
            })}
            mode="outlined"
            keyboardType="numeric"
            style={styles.input}
          />
          
          <TextInput
            label="Mark Absent After (minutes)"
            value={attendanceSettings.absentMarkAfter.toString()}
            onChangeText={(text) => setAttendanceSettings({
              ...attendanceSettings,
              absentMarkAfter: parseInt(text) || 0
            })}
            mode="outlined"
            keyboardType="numeric"
            style={styles.input}
          />
        </Card.Content>
      </Card>
      
      <Card style={styles.card}>
        <Card.Title title="Attendance Requirements" />
        <Card.Content>
          <List.Item
            title="Require Location Verification"
            description="Scholars must be within campus boundaries"
            left={(props) => <List.Icon {...props} icon="map-marker" />}
            right={() => (
              <Switch
                value={attendanceSettings.requireLocation}
                onValueChange={(value) => 
                  setAttendanceSettings({ ...attendanceSettings, requireLocation: value })
                }
              />
            )}
          />
          
          <Divider />
          
          <List.Item
            title="Require Biometric Authentication"
            description="Use fingerprint or face recognition"
            left={(props) => <List.Icon {...props} icon="fingerprint" />}
            right={() => (
              <Switch
                value={attendanceSettings.requireBiometric}
                onValueChange={(value) => 
                  setAttendanceSettings({ ...attendanceSettings, requireBiometric: value })
                }
              />
            )}
          />
        </Card.Content>
      </Card>
    </ScrollView>
  );

  const renderBoundariesTab = () => (
    <ScrollView style={styles.tabContent}>
      <Card style={styles.card}>
        <Card.Title 
          title="Campus Boundaries" 
          subtitle="Define where attendance can be marked"
        />
        <Card.Content>
          <View style={styles.mapContainer}>
            <View style={styles.mapPlaceholder}>
              <Icon name="map" size={64} color="#ccc" />
              <Text style={styles.mapPlaceholderText}>
                Map View Available in Production
              </Text>
              <Text style={styles.mapCoordinates}>
                Center: {boundaries.center.latitude.toFixed(6)}, {boundaries.center.longitude.toFixed(6)}
              </Text>
              <Text style={styles.mapCoordinates}>
                Radius: {boundaries.radius}m
              </Text>
            </View>
          </View>
          
          <Button
            mode="outlined"
            onPress={handleLocationPermission}
            icon="crosshairs-gps"
            style={styles.locationButton}
          >
            Use Current Location
          </Button>
          
          <TextInput
            label="Radius (meters)"
            value={boundaries.radius.toString()}
            onChangeText={(text) => setBoundaries({
              ...boundaries,
              radius: parseInt(text) || 0
            })}
            mode="outlined"
            keyboardType="numeric"
            style={styles.input}
          />
          
          <View style={styles.boundaryActions}>
            <Button
              mode="text"
              onPress={() => setBoundaries({ ...boundaries, polygonCoords: [] })}
              disabled={boundaries.polygonCoords.length === 0}
            >
              Clear Polygon
            </Button>
            
            <Button
              mode="contained"
              onPress={() => {
                // Save boundaries
                Alert.alert('Success', 'Boundaries updated successfully');
              }}
              style={styles.saveBoundaryButton}
            >
              Save Boundaries
            </Button>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );

  const renderPrivacyTab = () => (
    <ScrollView style={styles.tabContent}>
      <Card style={styles.card}>
        <Card.Title title="Data Retention" />
        <Card.Content>
          <TextInput
            label="Keep attendance data for (days)"
            value={privacySettings.dataRetention.toString()}
            onChangeText={(text) => setPrivacySettings({
              ...privacySettings,
              dataRetention: parseInt(text) || 0
            })}
            mode="outlined"
            keyboardType="numeric"
            style={styles.input}
          />
          
          <List.Item
            title="Anonymize Old Data"
            description="Remove personal identifiers from old records"
            left={(props) => <List.Icon {...props} icon="shield" />}
            right={() => (
              <Switch
                value={privacySettings.anonymizeData}
                onValueChange={(value) => 
                  setPrivacySettings({ ...privacySettings, anonymizeData: value })
                }
              />
            )}
          />
        </Card.Content>
      </Card>
      
      <Card style={styles.card}>
        <Card.Title title="Zero-Knowledge Proof Settings" />
        <Card.Content>
          <View style={styles.zkpInfo}>
            <Icon name="lock" size={20} color="#6C63FF" />
            <Paragraph style={styles.zkpText}>
              ZKP ensures biometric data never leaves the device
            </Paragraph>
          </View>
          
          <RadioButton.Group
            onValueChange={(value) => setPrivacySettings({ ...privacySettings, zkpLevel: value })}
            value={privacySettings.zkpLevel}
          >
            <RadioButton.Item 
              label="Standard Protection" 
              value="standard"
              description="Balanced security and performance"
            />
            <RadioButton.Item 
              label="Enhanced Protection" 
              value="enhanced"
              description="Maximum privacy, slower verification"
            />
          </RadioButton.Group>
        </Card.Content>
      </Card>
      
      <Card style={styles.card}>
        <Card.Title title="Analytics & Reporting" />
        <Card.Content>
          <List.Item
            title="Share Anonymous Analytics"
            description="Help improve Pramaan with usage data"
            left={(props) => <List.Icon {...props} icon="chart-line" />}
            right={() => (
              <Switch
                value={privacySettings.shareAnalytics}
                onValueChange={(value) => 
                  setPrivacySettings({ ...privacySettings, shareAnalytics: value })
                }
              />
            )}
          />
          
          <Button
            mode="outlined"
            onPress={() => {
              Alert.alert(
                'Export Data',
                'Export all organization data in encrypted format?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Export', onPress: () => console.log('Exporting...') }
                ]
              );
            }}
            icon="download"
            style={styles.exportButton}
          >
            Export All Data
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tab Navigation */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.tabContainer}
      >
        {['General', 'Attendance', 'Boundaries', 'Privacy'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab.toLowerCase() && styles.activeTab
            ]}
            onPress={() => setActiveTab(tab.toLowerCase())}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.toLowerCase() && styles.activeTabText
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tab Content */}
      {activeTab === 'general' && renderGeneralTab()}
      {activeTab === 'attendance' && renderAttendanceTab()}
      {activeTab === 'boundaries' && renderBoundariesTab()}
      {activeTab === 'privacy' && renderPrivacyTab()}

      {/* Upgrade Dialog */}
      <Portal>
        <Dialog
          visible={showUpgradeDialog}
          onDismiss={() => setShowUpgradeDialog(false)}
        >
          <Dialog.Title>Upgrade Your Plan</Dialog.Title>
          <Dialog.Content>
            <View style={styles.planOption}>
              <Title>Pro Plan</Title>
              <Paragraph>Up to 500 scholars</Paragraph>
              <Paragraph style={styles.planPrice}>₹999/month</Paragraph>
            </View>
            
            <View style={styles.planOption}>
              <Title>Enterprise Plan</Title>
              <Paragraph>Unlimited scholars</Paragraph>
              <Paragraph style={styles.planPrice}>Contact Sales</Paragraph>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowUpgradeDialog(false)}>Close</Button>
            <Button onPress={() => {
              setShowUpgradeDialog(false);
              Alert.alert('Coming Soon', 'Paid plans will be available soon!');
            }}>
              Upgrade
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
  tabContainer: {
    backgroundColor: 'white',
    maxHeight: 50,
    elevation: 1,
  },
  tab: {
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#6C63FF',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#6C63FF',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  card: {
    margin: 16,
    elevation: 2,
  },
  input: {
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: '#6C63FF',
    marginTop: 8,
  },
  planInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  planChip: {
    marginRight: 12,
  },
  planLimit: {
    color: '#666',
  },
  usageBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 16,
  },
  usageProgress: {
    height: '100%',
    backgroundColor: '#6C63FF',
    borderRadius: 4,
  },
  upgradeButton: {
    borderColor: '#6C63FF',
  },
  workingDaysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayChip: {
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  timeInput: {
    flex: 0.48,
  },
  mapContainer: {
    height: 300,
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholderText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  mapCoordinates: {
    marginTop: 8,
    fontSize: 12,
    color: '#999',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  locationButton: {
    marginBottom: 16,
  },
  boundaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  saveBoundaryButton: {
    backgroundColor: '#6C63FF',
  },
  zkpInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  zkpText: {
    flex: 1,
    marginLeft: 12,
    color: '#6C63FF',
  },
  exportButton: {
    marginTop: 16,
    borderColor: '#6C63FF',
  },
  planOption: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  planPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6C63FF',
    marginTop: 8,
  },
});

export default SettingsScreen;
