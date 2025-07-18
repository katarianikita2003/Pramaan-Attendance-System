import zkpService from './src/services/zkp.service.js';
console.log('Testing ZKP Service initialization...');
console.log('Current mode:', zkpService.mode);
console.log('Is initialized:', zkpService.isInitialized);
console.log('Has real ZKP:', zkpService.isRealZKP);
// Force initialization
await zkpService.initialize();
console.log('\nAfter initialization:');
console.log('Mode:', zkpService.mode);
console.log('Is real ZKP:', zkpService.isRealZKP);
console.log('Status:', zkpService.getStatus());
