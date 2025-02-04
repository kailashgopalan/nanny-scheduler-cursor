import { collection, query, where, getDocs, addDoc, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { calculateHours, calculateAmount } from './paymentUtils';

export const migrateApprovedSchedulesToPayments = async () => {
  try {
    // Get all approved schedules that don't have payments
    const schedulesQuery = query(
      collection(db, 'scheduleRequests'),
      where('status', '==', 'approved')
    );
    
    const scheduleSnapshot = await getDocs(schedulesQuery);
    console.log(`Found ${scheduleSnapshot.size} approved schedules`);

    for (const scheduleDoc of scheduleSnapshot.docs) {
      const scheduleData = scheduleDoc.data();
      
      // Check if payment already exists for this schedule
      const paymentQuery = query(
        collection(db, 'payments'),
        where('scheduleRequestId', '==', scheduleDoc.id)
      );
      
      const paymentSnapshot = await getDocs(paymentQuery);
      
      if (paymentSnapshot.empty) {
        // Get nanny's hourly rate
        const nannyDoc = await getDoc(doc(db, 'users', scheduleData.nannyId));
        const nannyData = nannyDoc.data();
        const hourlyRate = nannyData?.hourlyRate || 0;

        console.log(`Creating payment for schedule ${scheduleDoc.id} with rate ${hourlyRate}`);

        const hours = calculateHours(scheduleData.startTime, scheduleData.endTime);
        const amount = calculateAmount(hours, hourlyRate);

        // Create payment record
        const paymentData = {
          amount,
          date: scheduleData.date,
          status: 'pending',
          employerId: scheduleData.employerId,
          nannyId: scheduleData.nannyId,
          method: 'pending',
          hours,
          scheduleRequestId: scheduleDoc.id,
          startTime: scheduleData.startTime,
          endTime: scheduleData.endTime,
          createdAt: new Date()
        };

        const paymentRef = await addDoc(collection(db, 'payments'), paymentData);
        console.log(`Created payment ${paymentRef.id} for schedule ${scheduleDoc.id}`);
      }
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Error during migration:', error);
  }
}; 