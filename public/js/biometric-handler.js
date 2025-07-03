// public/js/biometric-handler.js
class BiometricHandler {
    constructor() {
        this.API_URL = window.location.origin + '/api';
        this.isWebAuthnSupported = this.checkWebAuthnSupport();
        this.isFaceAPILoaded = false;
    }

    checkWebAuthnSupport() {
        return window.PublicKeyCredential && 
               navigator.credentials && 
               navigator.credentials.create;
    }

    async loadFaceAPI() {
        if (this.isFaceAPILoaded) return;
        
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
        document.head.appendChild(script);
        
        return new Promise((resolve) => {
            script.onload = async () => {
                // Load face detection models
                const MODEL_URL = '/models';
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);
                this.isFaceAPILoaded = true;
                resolve();
            };
        });
    }

    async registerFingerprint() {
        if (!this.isWebAuthnSupported) {
            throw new Error('WebAuthn not supported on this device');
        }

        try {
            // Get registration options from server
            const optionsResponse = await fetch(`${this.API_URL}/biometric/register/fingerprint/options`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (!optionsResponse.ok) {
                throw new Error('Failed to get registration options');
            }

            const options = await optionsResponse.json();

            // Convert challenge and user ID
            options.challenge = Uint8Array.from(options.challenge, c => c.charCodeAt(0));
            options.user.id = Uint8Array.from(options.user.id, c => c.charCodeAt(0));

            // Create credential
            const credential = await navigator.credentials.create({
                publicKey: options
            });

            // Prepare credential for server
            const credentialForServer = {
                id: credential.id,
                rawId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
                type: credential.type,
                response: {
                    clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(credential.response.clientDataJSON))),
                    attestationObject: btoa(String.fromCharCode(...new Uint8Array(credential.response.attestationObject)))
                }
            };

            // Verify with server
            const verifyResponse = await fetch(`${this.API_URL}/biometric/register/fingerprint/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({ credential: credentialForServer })
            });

            const result = await verifyResponse.json();
            
            if (!verifyResponse.ok) {
                throw new Error(result.error || 'Registration failed');
            }

            return result;

        } catch (error) {
            console.error('Fingerprint registration error:', error);
            throw error;
        }
    }

    async registerFace() {
        await this.loadFaceAPI();
        
        const video = document.getElementById('face-video');
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480 } 
        });
        
        video.srcObject = stream;
        
        return new Promise((resolve, reject) => {
            video.onloadedmetadata = async () => {
                try {
                    // Detect face
                    const detections = await faceapi
                        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
                        .withFaceLandmarks()
                        .withFaceDescriptor();
                    
                    if (!detections) {
                        throw new Error('No face detected');
                    }
                    
                    // Convert descriptor to base64
                    const descriptor = btoa(String.fromCharCode(...new Uint8Array(detections.descriptor.buffer)));
                    
                    // Stop video stream
                    stream.getTracks().forEach(track => track.stop());
                    
                    // Register with server
                    const response = await fetch(`${this.API_URL}/biometric/register/face`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                        },
                        body: JSON.stringify({ faceDescriptor: descriptor })
                    });
                    
                    const result = await response.json();
                    
                    if (!response.ok) {
                        throw new Error(result.error || 'Registration failed');
                    }
                    
                    resolve(result);
                    
                } catch (error) {
                    stream.getTracks().forEach(track => track.stop());
                    reject(error);
                }
            };
        });
    }
}

// Make it globally available
window.BiometricHandler = BiometricHandler;