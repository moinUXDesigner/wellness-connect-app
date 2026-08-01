import type { AppointmentSummary } from '../types';

export const mockAppointments: AppointmentSummary[] = [
  { id: 'A-901', serviceType: 'psychology', clientName: 'Sarah Johnson', professionalName: 'Dr. Ananya Sharma', scheduleAt: '2026-05-05T10:30:00Z', status: 'scheduled' },
  { id: 'A-902', serviceType: 'training', clientName: 'Kabir Singh', professionalName: 'Rahul Mehta', scheduleAt: '2026-05-05T18:00:00Z', status: 'scheduled' },
  { id: 'A-903', serviceType: 'combined', clientName: 'Pooja Iyer', professionalName: 'Priya Nair', scheduleAt: '2026-05-04T08:00:00Z', status: 'completed' },
  { id: 'A-904', serviceType: 'training', clientName: 'Aman Kapoor', professionalName: 'Karan Singh', scheduleAt: '2026-05-01T16:00:00Z', status: 'cancelled' },
];
