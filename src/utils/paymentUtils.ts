export const calculateHours = (startTime: string, endTime: string): number => {
  const start = new Date(`1970-01-01T${startTime}`);
  const end = new Date(`1970-01-01T${endTime}`);
  
  // Debug
  console.log('Calculating hours:', {
    startTime,
    endTime,
    startDate: start,
    endDate: end,
    hours: (end.getTime() - start.getTime()) / (1000 * 60 * 60)
  });
  
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
};

export const calculateAmount = (hours: number, hourlyRate: number): number => {
  return hours * hourlyRate;
}; 