// Add this to mobile/PramaanExpo/src/utils/iconMapping.js

export const getIconName = (iconName) => {
  // Map custom icon names to Material Icons names
  const iconMap = {
    'person-add': 'person-add-alt',
    'assessment': 'bar-chart',
    'settings': 'settings',
    'qr-code-scanner': 'qr-code-scanner',
    'add': 'add',
    'face': 'face',
    'fingerprint': 'fingerprint',
    'location-on': 'location-on',
    'school': 'school',
    'business': 'business',
    'dashboard': 'dashboard',
    'people': 'people',
    'report': 'description',
    'logout': 'logout',
    'camera': 'camera-alt',
    'check-circle': 'check-circle',
    'error': 'error',
    'warning': 'warning',
    'info': 'info',
    'calendar': 'event',
    'time': 'access-time',
    'download': 'file-download',
    'upload': 'file-upload',
    'delete': 'delete',
    'edit': 'edit',
    'save': 'save',
    'close': 'close',
    'menu': 'menu',
    'more-vert': 'more-vert',
    'search': 'search',
    'filter': 'filter-list',
    'sort': 'sort',
    'refresh': 'refresh',
    'notifications': 'notifications',
    'account': 'account-circle',
    'lock': 'lock',
    'visibility': 'visibility',
    'visibility-off': 'visibility-off',
  };

  return iconMap[iconName] || iconName;
};

// Usage in components:
// import { getIconName } from '../utils/iconMapping';
// <Icon name={getIconName('person-add')} size={24} color="#6C63FF" />