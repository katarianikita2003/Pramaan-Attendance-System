// mobile/PramaanExpo/src/screens/VerifyProofScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  TextInput,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import QRCode from 'react-native-qrcode-svg';
import { attendanceService } from '../services/api';

const VerifyProofScreen = ({ navigation }) => {
  const [proofId, setProofId] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [showQR, setShowQR] = useState(false);

  const handleVerify = async () => {
    if (!proofId.trim()) {
      return;
    }

    try {
      setLoading(true);
      const response = await attendanceService.verifyProof(proofId);
      
      if (response.success) {
        setVerificationResult(response.proof);
        setShowQR(true);
      }
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationResult({
        valid: false,
        error: 'Invalid proof ID or verification failed',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!verificationResult) return;

    try {
      await Share.share({
        message: `Attendance Proof Verification\n\nProof ID: ${verificationResult.id}\nScholar: ${verificationResult.scholar}\nOrganization: ${verificationResult.organization}\nTimestamp: ${new Date(verificationResult.timestamp).toLocaleString()}\nStatus: ${verificationResult.valid ? 'VERIFIED' : 'INVALID'}\n\nVerified using Pramaan ZKP System`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const renderVerificationResult = () => {
    if (!verificationResult) return null;

    return (
      <Card style={[styles.resultCard, verificationResult.valid ? styles.validCard : styles.invalidCard]}>
        <Card.Content>
          <View style={styles.resultHeader}>
            <Icon
              name={verificationResult.valid ? 'check-circle' : 'error'}
              size={48}
              color={verificationResult.valid ? '#4CAF50' : '#F44336'}
            />
            <Title style={styles.resultTitle}>
              {verificationResult.valid ? 'Valid Proof' : 'Invalid Proof'}
            </Title>
          </View>

          {verificationResult.valid && (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Proof ID:</Text>
                <Text style={styles.detailValue}>{verificationResult.id}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Scholar:</Text>
                <Text style={styles.detailValue}>{verificationResult.scholar}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Scholar ID:</Text>
                <Text style={styles.detailValue}>{verificationResult.scholarId}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Organization:</Text>
                <Text style={styles.detailValue}>{verificationResult.organization}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Timestamp:</Text>
                <Text style={styles.detailValue}>
                  {new Date(verificationResult.timestamp).toLocaleString()}
                </Text>
              </View>

              {showQR && (
                <View style={styles.qrContainer}>
                  <QRCode
                    value={JSON.stringify({
                      proofId: verificationResult.id,
                      timestamp: verificationResult.timestamp,
                      verified: true,
                    })}
                    size={200}
                  />
                  <Text style={styles.qrLabel}>Scan to verify</Text>
                </View>
              )}

              <Button
                mode="contained"
                onPress={handleShare}
                style={styles.shareButton}
                icon="share"
              >
                Share Proof
              </Button>
            </>
          )}

          {!verificationResult.valid && (
            <Paragraph style={styles.errorText}>
              {verificationResult.error || 'The proof could not be verified'}
            </Paragraph>
          )}
        </Card.Content>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verify Attendance Proof</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.inputCard}>
          <Card.Content>
            <Title>Enter Proof ID</Title>
            <Paragraph style={styles.instructions}>
              Enter the attendance proof ID to verify its authenticity
            </Paragraph>
            
            <TextInput
              label="Proof ID"
              value={proofId}
              onChangeText={setProofId}
              mode="outlined"
              style={styles.input}
              placeholder="e.g., PROOF123456"
              autoCapitalize="characters"
            />
            
            <Button
              mode="contained"
              onPress={handleVerify}
              loading={loading}
              disabled={loading || !proofId.trim()}
              style={styles.verifyButton}
            >
              Verify Proof
            </Button>
          </Card.Content>
        </Card>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6C63FF" />
            <Text style={styles.loadingText}>Verifying proof...</Text>
          </View>
        )}

        {renderVerificationResult()}

        <Card style={styles.infoCard}>
          <Card.Content>
            <View style={styles.infoHeader}>
              <Icon name="info" size={20} color="#FF9800" />
              <Title style={styles.infoTitle}>About ZKP Verification</Title>
            </View>
            <Paragraph style={styles.infoText}>
              Zero-Knowledge Proof verification ensures that attendance records 
              are authentic without revealing any biometric or personal data. 
              Each proof is cryptographically secure and tamper-proof.
            </Paragraph>
          </Card.Content>
        </Card>
      </ScrollView>
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
    padding: 16,
  },
  inputCard: {
    marginBottom: 16,
    elevation: 2,
  },
  instructions: {
    color: '#666',
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  verifyButton: {
    backgroundColor: '#6C63FF',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  resultCard: {
    marginBottom: 16,
    elevation: 2,
  },
  validCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  invalidCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  resultHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  resultTitle: {
    marginTop: 8,
    fontSize: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  qrLabel: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },
  shareButton: {
    marginTop: 16,
    backgroundColor: '#4CAF50',
  },
  errorText: {
    color: '#F44336',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#FFF8E1',
    elevation: 1,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 16,
    marginLeft: 8,
    color: '#F57C00',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default VerifyProofScreen;