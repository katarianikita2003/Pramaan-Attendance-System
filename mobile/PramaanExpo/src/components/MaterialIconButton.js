// mobile/PramaanExpo/src/components/MaterialIconButton.js
import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// Icon mapping for commonly used icons
const iconMap = {
  'person-add': 'person-add-alt',
  'assessment': 'bar-chart',
  'settings': 'settings',
  'qr-code-scanner': 'qr-code-scanner',
  'add': 'add',
  'face': 'face',
  'fingerprint': 'fingerprint',
  'logout': 'logout',
  'profile': 'account-circle',
  'report': 'description',
  'attendance': 'event-available',
  'location': 'location-on',
  'organization': 'business',
  'scholar': 'school',
  'dashboard': 'dashboard',
  'analytics': 'analytics',
  'download': 'file-download',
  'upload': 'file-upload',
  'verify': 'verified',
  'check': 'check-circle',
  'close': 'close',
  'edit': 'edit',
  'delete': 'delete',
  'save': 'save',
  'calendar': 'event',
  'time': 'access-time',
  'alert': 'warning',
  'info': 'info',
  'success': 'check-circle',
  'error': 'error',
  'back': 'arrow-back',
  'forward': 'arrow-forward',
  'menu': 'menu',
  'more': 'more-vert',
  'search': 'search',
  'filter': 'filter-list',
  'sort': 'sort',
  'refresh': 'refresh',
  'notification': 'notifications',
  'email': 'email',
  'phone': 'phone',
  'lock': 'lock',
  'unlock': 'lock-open',
  'visibility': 'visibility',
  'visibility-off': 'visibility-off',
  'camera': 'camera-alt',
  'photo': 'photo',
  'image': 'image',
  'folder': 'folder',
  'file': 'insert-drive-file',
  'cloud': 'cloud',
  'sync': 'sync',
  'wifi': 'wifi',
  'gps': 'gps-fixed',
  'map': 'map',
  'navigate': 'navigation',
  'home': 'home',
  'work': 'work',
  'group': 'group',
  'person': 'person',
  'people': 'people',
  'schedule': 'schedule',
  'history': 'history',
  'help': 'help',
  'feedback': 'feedback',
  'share': 'share',
  'copy': 'content-copy',
  'paste': 'content-paste',
  'cut': 'content-cut',
};

// Get the correct icon name
const getIconName = (iconName) => {
  return iconMap[iconName] || iconName;
};

// Material Icon Button Component
export const MaterialIconButton = ({ 
  icon, 
  size = 24, 
  color = '#333', 
  onPress, 
  style,
  disabled = false,
  ...props 
}) => {
  const iconName = getIconName(icon);
  
  return (
    <TouchableOpacity 
      onPress={onPress} 
      style={[styles.iconButton, style]}
      disabled={disabled}
      {...props}
    >
      <MaterialIcons name={iconName} size={size} color={disabled ? '#ccc' : color} />
    </TouchableOpacity>
  );
};

// Material Icon Component (without button functionality)
export const MaterialIcon = ({ 
  icon, 
  size = 24, 
  color = '#333', 
  style,
  ...props 
}) => {
  const iconName = getIconName(icon);
  
  return (
    <MaterialIcons 
      name={iconName} 
      size={size} 
      color={color} 
      style={style}
      {...props}
    />
  );
};

// Icon with Text Component
export const IconWithText = ({
  icon,
  text,
  iconSize = 20,
  iconColor = '#333',
  textStyle,
  containerStyle,
  iconPosition = 'left',
}) => {
  const iconName = getIconName(icon);
  
  return (
    <View style={[styles.iconWithTextContainer, containerStyle]}>
      {iconPosition === 'left' && (
        <MaterialIcons name={iconName} size={iconSize} color={iconColor} style={styles.iconSpacing} />
      )}
      <Text style={[styles.iconText, textStyle]}>{text}</Text>
      {iconPosition === 'right' && (
        <MaterialIcons name={iconName} size={iconSize} color={iconColor} style={styles.iconSpacingLeft} />
      )}
    </View>
  );
};

// Export utility function
export { getIconName };

const styles = StyleSheet.create({
  iconButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWithTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconSpacing: {
    marginRight: 8,
  },
  iconSpacingLeft: {
    marginLeft: 8,
  },
  iconText: {
    fontSize: 16,
    color: '#333',
  },
});

export default MaterialIconButton;