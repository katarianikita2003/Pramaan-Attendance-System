// mobile/PramaanExpo/src/components/SafeDialog.js
import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Button, Portal } from 'react-native-paper';

// This is a safe alternative to react-native-paper's Dialog
// Use this if Dialog continues to cause issues
export const SafeDialog = ({ 
  visible, 
  onDismiss, 
  title, 
  children, 
  actions = [],
  dismissable = true,
  contentStyle = {}
}) => {
  return (
    <Portal>
      <Modal
        animationType="fade"
        transparent={true}
        visible={visible}
        onRequestClose={dismissable ? onDismiss : undefined}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={dismissable ? onDismiss : undefined}
        >
          <View 
            style={[styles.modalContent, contentStyle]} 
            onStartShouldSetResponder={() => true}
          >
            {title && (
              <View style={styles.titleContainer}>
                <Text style={styles.modalTitle}>{title}</Text>
              </View>
            )}
            
            <ScrollView style={styles.contentContainer}>
              {children}
            </ScrollView>
            
            {actions.length > 0 && (
              <View style={styles.actionsContainer}>
                {actions.map((action, index) => (
                  <Button
                    key={index}
                    mode={action.mode || 'text'}
                    onPress={action.onPress}
                    style={action.style}
                    disabled={action.disabled}
                  >
                    {action.label}
                  </Button>
                ))}
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </Portal>
  );
};

// Example usage component
export const ExampleDialogUsage = () => {
  const [visible, setVisible] = React.useState(false);

  const showDialog = () => setVisible(true);
  const hideDialog = () => setVisible(false);

  return (
    <View>
      <Button onPress={showDialog}>Show Dialog</Button>
      
      <SafeDialog
        visible={visible}
        onDismiss={hideDialog}
        title="Alert"
        actions={[
          {
            label: 'Cancel',
            onPress: hideDialog,
          },
          {
            label: 'OK',
            onPress: () => {
              console.log('OK Pressed');
              hideDialog();
            },
            mode: 'contained',
          },
        ]}
      >
        <Text>This is a safe dialog implementation that won't crash!</Text>
      </SafeDialog>
    </View>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    minWidth: 280,
    maxWidth: '90%',
    maxHeight: '80%',
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 11,
    },
    shadowOpacity: 0.55,
    shadowRadius: 14.78,
  },
  titleContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '500',
    color: '#000',
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 8,
    paddingBottom: 16,
  },
});

export default SafeDialog;