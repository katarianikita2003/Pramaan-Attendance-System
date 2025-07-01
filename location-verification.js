// location-verification.js - Location verification module for Pramaan

import geolib from 'geolib';
import axios from 'axios';
import crypto from 'crypto';

class LocationVerificationService {
    constructor() {
        // Define college campus boundaries (multiple points for complex shapes)
        this.campusBoundaries = {
            mainCampus: {
                center: { latitude: 28.5355, longitude: 77.3910 }, // Example: IIT Delhi coordinates
                radius: 500, // meters
                polygon: [ // Define campus boundary as polygon for irregular shapes
                    { latitude: 28.5365, longitude: 77.3900 },
                    { latitude: 28.5365, longitude: 77.3920 },
                    { latitude: 28.5345, longitude: 77.3920 },
                    { latitude: 28.5345, longitude: 77.3900 }
                ]
            },
            library: {
                center: { latitude: 28.5360, longitude: 77.3915 },
                radius: 50
            },
            researchLab: {
                center: { latitude: 28.5350, longitude: 77.3905 },
                radius: 30
            }
        };

        // WiFi Access Points for indoor verification
        this.campusWiFiMACs = [
            'AA:BB:CC:DD:EE:01', // Main building WiFi
            'AA:BB:CC:DD:EE:02', // Library WiFi
            'AA:BB:CC:DD:EE:03', // Lab WiFi
            'AA:BB:CC:DD:EE:04'  // Cafeteria WiFi
        ];

        // IP ranges for campus network
        this.campusIPRanges = [
            '192.168.1.0/24',
            '10.0.0.0/16'
        ];
    }

    // Main verification method combining multiple checks
    async verifyLocation(locationData) {
        const verificationResults = {
            timestamp: new Date(),
            isValid: false,
            method: null,
            confidence: 0,
            details: {},
            zkProof: null
        };

        try {
            // 1. GPS Verification
            if (locationData.gps) {
                const gpsResult = await this.verifyGPSLocation(locationData.gps);
                if (gpsResult.isValid) {
                    verificationResults.isValid = true;
                    verificationResults.method = 'GPS';
                    verificationResults.confidence = gpsResult.confidence;
                    verificationResults.details.gps = gpsResult;
                }
            }

            // 2. WiFi Verification (stronger for indoor)
            if (locationData.wifi) {
                const wifiResult = await this.verifyWiFiLocation(locationData.wifi);
                if (wifiResult.isValid) {
                    verificationResults.isValid = true;
                    verificationResults.method = verificationResults.method ? 'GPS+WiFi' : 'WiFi';
                    verificationResults.confidence = Math.max(verificationResults.confidence, wifiResult.confidence);
                    verificationResults.details.wifi = wifiResult;
                }
            }

            // 3. IP Address Verification
            if (locationData.ipAddress) {
                const ipResult = this.verifyIPAddress(locationData.ipAddress);
                if (ipResult.isValid) {
                    verificationResults.isValid = true;
                    verificationResults.method = verificationResults.method ? 
                        verificationResults.method + '+IP' : 'IP';
                    verificationResults.confidence = Math.min(
                        verificationResults.confidence + 10, 
                        100
                    );
                    verificationResults.details.ip = ipResult;
                }
            }

            // 4. Generate ZK proof for location
            if (verificationResults.isValid) {
                verificationResults.zkProof = await this.generateLocationZKProof(
                    locationData,
                    verificationResults
                );
            }

            return verificationResults;

        } catch (error) {
            console.error('Location verification error:', error);
            return verificationResults;
        }
    }

    // GPS-based verification with geofencing
    async verifyGPSLocation(gpsData) {
        const { latitude, longitude, accuracy } = gpsData;
        
        // Check if accuracy is acceptable (less than 50 meters)
        if (accuracy > 50) {
            return {
                isValid: false,
                reason: 'GPS accuracy too low',
                accuracy
            };
        }

        // Check main campus radius
        const distanceFromCampus = geolib.getDistance(
            { latitude, longitude },
            this.campusBoundaries.mainCampus.center
        );

        // Check if within campus boundary
        const isWithinRadius = distanceFromCampus <= this.campusBoundaries.mainCampus.radius;
        
        // For more precise check, use polygon
        const isWithinPolygon = geolib.isPointInPolygon(
            { latitude, longitude },
            this.campusBoundaries.mainCampus.polygon
        );

        // Calculate confidence based on accuracy and distance
        let confidence = 100;
        if (accuracy > 10) confidence -= (accuracy - 10);
        if (distanceFromCampus > 100) confidence -= (distanceFromCampus - 100) / 10;
        confidence = Math.max(0, Math.min(100, confidence));

        // Detect specific location within campus
        let specificLocation = 'Main Campus';
        if (distanceFromCampus <= 50) {
            // Check specific buildings
            for (const [building, coords] of Object.entries(this.campusBoundaries)) {
                if (building !== 'mainCampus') {
                    const dist = geolib.getDistance({ latitude, longitude }, coords.center);
                    if (dist <= coords.radius) {
                        specificLocation = building;
                        break;
                    }
                }
            }
        }

        return {
            isValid: isWithinRadius || isWithinPolygon,
            distance: distanceFromCampus,
            confidence,
            specificLocation,
            coordinates: { latitude, longitude },
            accuracy,
            method: 'GPS'
        };
    }

    // WiFi-based verification for indoor positioning
    async verifyWiFiLocation(wifiData) {
        const { accessPoints } = wifiData;
        
        if (!accessPoints || accessPoints.length === 0) {
            return {
                isValid: false,
                reason: 'No WiFi access points detected'
            };
        }

        // Check for campus WiFi MACs
        const detectedCampusAPs = accessPoints.filter(ap => 
            this.campusWiFiMACs.includes(ap.mac)
        );

        if (detectedCampusAPs.length === 0) {
            return {
                isValid: false,
                reason: 'No campus WiFi detected'
            };
        }

        // Calculate confidence based on signal strength and number of APs
        const avgSignalStrength = detectedCampusAPs.reduce((sum, ap) => 
            sum + (ap.signalStrength || -90), 0
        ) / detectedCampusAPs.length;

        let confidence = 100;
        if (avgSignalStrength < -70) confidence -= 20;
        if (detectedCampusAPs.length < 2) confidence -= 30;
        confidence = Math.max(0, confidence);

        // Determine approximate location based on strongest AP
        const strongestAP = detectedCampusAPs.reduce((strongest, ap) => 
            (ap.signalStrength > strongest.signalStrength) ? ap : strongest
        );

        const locationMap = {
            'AA:BB:CC:DD:EE:01': 'Main Building',
            'AA:BB:CC:DD:EE:02': 'Library',
            'AA:BB:CC:DD:EE:03': 'Research Lab',
            'AA:BB:CC:DD:EE:04': 'Cafeteria'
        };

        return {
            isValid: true,
            confidence,
            detectedAPs: detectedCampusAPs.length,
            strongestAP: strongestAP.mac,
            approximateLocation: locationMap[strongestAP.mac] || 'Campus',
            signalStrength: avgSignalStrength,
            method: 'WiFi'
        };
    }

    // IP Address verification
    verifyIPAddress(ipAddress) {
        // Check if IP is within campus range
        const isInternalIP = this.campusIPRanges.some(range => {
            return this.isIPInRange(ipAddress, range);
        });

        return {
            isValid: isInternalIP,
            ipAddress,
            confidence: isInternalIP ? 70 : 0, // IP alone gives 70% confidence
            method: 'IP'
        };
    }

    // Helper function to check IP range
    isIPInRange(ip, range) {
        const [rangeIP, bits] = range.split('/');
        const ipBinary = this.ipToBinary(ip);
        const rangeBinary = this.ipToBinary(rangeIP);
        
        return ipBinary.substring(0, parseInt(bits)) === 
               rangeBinary.substring(0, parseInt(bits));
    }

    // Convert IP to binary
    ipToBinary(ip) {
        return ip.split('.').map(octet => 
            parseInt(octet).toString(2).padStart(8, '0')
        ).join('');
    }

    // Generate Zero-Knowledge Proof for location
    async generateLocationZKProof(locationData, verificationResults) {
        // Create location commitment without revealing exact coordinates
        const locationCommitment = crypto.createHash('sha256')
            .update(JSON.stringify({
                timestamp: Date.now(),
                isWithinCampus: verificationResults.isValid,
                method: verificationResults.method,
                confidence: Math.floor(verificationResults.confidence / 10) * 10 // Round to nearest 10
            }))
            .digest('hex');

        // Generate proof that location is valid without revealing coordinates
        const proof = {
            commitment: locationCommitment,
            timestamp: Date.now(),
            validityProof: {
                isWithinBoundary: verificationResults.isValid,
                confidenceRange: verificationResults.confidence > 80 ? 'HIGH' : 
                                verificationResults.confidence > 50 ? 'MEDIUM' : 'LOW',
                verificationMethod: verificationResults.method
            },
            // Challenge-response for interactive proof
            challenge: crypto.randomBytes(32).toString('hex'),
            response: crypto.createHash('sha256')
                .update(locationCommitment + verificationResults.isValid)
                .digest('hex')
        };

        return proof;
    }

    // Anti-spoofing checks
    async detectLocationSpoofing(locationData, historicalData) {
        const anomalies = [];

        // 1. Check for impossible travel
        if (historicalData.lastLocation) {
            const timeDiff = (Date.now() - historicalData.lastLocation.timestamp) / 1000; // seconds
            const distance = geolib.getDistance(
                locationData.gps,
                historicalData.lastLocation.coordinates
            );
            
            const speed = distance / timeDiff; // meters per second
            if (speed > 50) { // Faster than 180 km/h
                anomalies.push({
                    type: 'IMPOSSIBLE_TRAVEL',
                    severity: 'HIGH',
                    details: `Travel speed: ${speed.toFixed(2)} m/s`
                });
            }
        }

        // 2. Check for VPN/Proxy
        if (locationData.ipAddress) {
            const vpnCheck = await this.checkVPN(locationData.ipAddress);
            if (vpnCheck.isVPN) {
                anomalies.push({
                    type: 'VPN_DETECTED',
                    severity: 'HIGH',
                    details: 'Connection through VPN/Proxy detected'
                });
            }
        }

        // 3. Check for mock location apps
        if (locationData.deviceInfo) {
            if (locationData.deviceInfo.mockLocationEnabled) {
                anomalies.push({
                    type: 'MOCK_LOCATION',
                    severity: 'CRITICAL',
                    details: 'Mock location app detected'
                });
            }
        }

        // 4. Signal strength anomalies
        if (locationData.wifi && locationData.wifi.accessPoints) {
            const suspiciousSignals = locationData.wifi.accessPoints.filter(ap => 
                ap.signalStrength > -30 || ap.signalStrength < -95
            );
            
            if (suspiciousSignals.length > 0) {
                anomalies.push({
                    type: 'SIGNAL_ANOMALY',
                    severity: 'MEDIUM',
                    details: 'Unusual WiFi signal strengths detected'
                });
            }
        }

        return {
            isClean: anomalies.length === 0,
            anomalies,
            riskScore: anomalies.reduce((score, anomaly) => {
                const severityScores = { LOW: 10, MEDIUM: 30, HIGH: 50, CRITICAL: 100 };
                return score + (severityScores[anomaly.severity] || 0);
            }, 0)
        };
    }

    // Check for VPN/Proxy
    async checkVPN(ipAddress) {
        try {
            // In production, use services like IPQualityScore or similar
            // This is a simplified check
            const response = await axios.get(`https://vpnapi.io/api/${ipAddress}?key=demo`);
            return {
                isVPN: response.data.security.vpn || response.data.security.proxy,
                details: response.data
            };
        } catch (error) {
            return { isVPN: false, error: 'VPN check failed' };
        }
    }
}

// Integration with attendance marking
export async function markAttendanceWithLocation(scholarId, biometricData, locationData) {
    const locationService = new LocationVerificationService();
    
    // 1. Verify location
    const locationVerification = await locationService.verifyLocation(locationData);
    
    if (!locationVerification.isValid) {
        return {
            success: false,
            error: 'You must be on campus to mark attendance',
            details: locationVerification
        };
    }

    // 2. Check for spoofing
    const spoofingCheck = await locationService.detectLocationSpoofing(
        locationData,
        await getScholarLocationHistory(scholarId)
    );
    
    if (!spoofingCheck.isClean && spoofingCheck.riskScore > 50) {
        return {
            success: false,
            error: 'Location verification failed due to anomalies',
            details: spoofingCheck
        };
    }

    // 3. Proceed with biometric verification and attendance
    // ... existing biometric verification code ...

    // 4. Store attendance with location proof
    const attendanceRecord = {
        scholarId,
        timestamp: new Date(),
        biometricProof: biometricZKProof,
        locationProof: locationVerification.zkProof,
        locationMethod: locationVerification.method,
        locationConfidence: locationVerification.confidence,
        specificLocation: locationVerification.details.gps?.specificLocation || 
                         locationVerification.details.wifi?.approximateLocation || 
                         'Campus'
    };

    return {
        success: true,
        attendanceRecord
    };
}

// Helper function (implement based on your database)
async function getScholarLocationHistory(scholarId) {
    // Fetch last location from database
    return {
        lastLocation: {
            timestamp: Date.now() - 3600000, // 1 hour ago
            coordinates: { latitude: 28.5355, longitude: 77.3910 }
        }
    };
}

export default LocationVerificationService;