// src/components/SafeTouchableOpacity.js
import React from 'react';
import { TouchableOpacity } from 'react-native';
// This component ensures all boolean props are properly typed
export const SafeTouchableOpacity = ({
  disabled,
  ...props
}) => {
  return (
    <TouchableOpacity
      {...props}
      disabled={disabled === true}
    />
  );
};
export default SafeTouchableOpacity;
