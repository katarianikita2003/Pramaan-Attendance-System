import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Title, Text, Button, DataTable, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AttendanceReportScreen({ navigation }) {
  const [reportType, setReportType] = useState('daily'); // daily, weekly, monthly

  // Mock data
  const reportData = [
    { name: 'John Doe', id: 'SCH001', status: 'Present' },
    { name: 'Jane Smith', id: 'SCH002', status: 'Present' },
    { name: 'Mike Johnson', id: 'SCH003', status: 'Absent' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <Card.Content>
            <Title>Attendance Report</Title>
            <View style={styles.filters}>
              <Chip
                selected={reportType === 'daily'}
                onPress={() => setReportType('daily')}
                style={styles.chip}
              >
                Daily
              </Chip>
              <Chip
                selected={reportType === 'weekly'}
                onPress={() => setReportType('weekly')}
                style={styles.chip}powershell# Continue AttendanceReportScreen.tsx
$attendanceReportScreenContinued = @'
             >
               Weekly
             </Chip>
             <Chip
               selected={reportType === 'monthly'}
               onPress={() => setReportType('monthly')}
               style={styles.chip}
             >
               Monthly
             </Chip>
           </View>
         </Card.Content>
       </Card>

       <Card style={styles.card}>
         <Card.Content>
           <Title>Report Summary</Title>
           <View style={styles.summaryGrid}>
             <View style={styles.summaryItem}>
               <Text style={styles.summaryValue}>25</Text>
               <Text style={styles.summaryLabel}>Total</Text>
             </View>
             <View style={styles.summaryItem}>
               <Text style={[styles.summaryValue, { color: '#27AE60' }]}>22</Text>
               <Text style={styles.summaryLabel}>Present</Text>
             </View>
             <View style={styles.summaryItem}>
               <Text style={[styles.summaryValue, { color: '#E74C3C' }]}>3</Text>
               <Text style={styles.summaryLabel}>Absent</Text>
             </View>
             <View style={styles.summaryItem}>
               <Text style={[styles.summaryValue, { color: '#F39C12' }]}>88%</Text>
               <Text style={styles.summaryLabel}>Rate</Text>
             </View>
           </View>
         </Card.Content>
       </Card>

       <Card style={styles.card}>
         <DataTable>
           <DataTable.Header>
             <DataTable.Title>Name</DataTable.Title>
             <DataTable.Title>ID</DataTable.Title>
             <DataTable.Title>Status</DataTable.Title>
           </DataTable.Header>

           {reportData.map((item, index) => (
             <DataTable.Row key={index}>
               <DataTable.Cell>{item.name}</DataTable.Cell>
               <DataTable.Cell>{item.id}</DataTable.Cell>
               <DataTable.Cell>
                 <Chip
                   mode="flat"
                   compact
                   textStyle={{ color: 'white', fontSize: 12 }}
                   style={{
                     backgroundColor: item.status === 'Present' ? '#27AE60' : '#E74C3C',
                   }}
                 >
                   {item.status}
                 </Chip>
               </DataTable.Cell>
             </DataTable.Row>
           ))}
         </DataTable>
       </Card>

       <Button
         mode="contained"
         icon="download"
         onPress={() => Alert.alert('Export', 'Report export feature coming soon')}
         style={styles.exportButton}
       >
         Export Report
       </Button>
     </ScrollView>
   </SafeAreaView>
 );
}

const styles = StyleSheet.create({
 container: {
   flex: 1,
   backgroundColor: '#f5f5f5',
 },
 scrollContent: {
   padding: 16,
 },
 card: {
   marginBottom: 16,
   elevation: 2,
 },
 filters: {
   flexDirection: 'row',
   marginTop: 12,
   gap: 8,
 },
 chip: {
   marginRight: 8,
 },
 summaryGrid: {
   flexDirection: 'row',
   justifyContent: 'space-around',
   marginTop: 16,
 },
 summaryItem: {
   alignItems: 'center',
 },
 summaryValue: {
   fontSize: 28,
   fontWeight: 'bold',
 },
 summaryLabel: {
   fontSize: 14,
   color: '#666',
   marginTop: 4,
 },
 exportButton: {
   marginTop: 16,
 },
});