import React from 'react';
import { useTranslation } from 'react-i18next';
import AppBottomSheetModal from './AppBottomSheetModal';
import BookingScreen from '../screens/BookingScreen';

interface BookAppointmentModalProps {
  visible: boolean;
  technicianId: number;
  technicianName: string;
  projectId?: number;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function BookAppointmentModal({
  visible,
  technicianId,
  technicianName,
  projectId,
  onClose,
  onSuccess,
}: BookAppointmentModalProps) {
  const { t } = useTranslation();

  const handleSuccess = () => {
    onSuccess?.();
    onClose();
  };

  return (
    <AppBottomSheetModal
      visible={visible}
      onClose={onClose}
      title={t('Book Appointment')}
      subtitle={technicianName}
      scrollable={false}
      heightFraction={0.92}
    >
      <BookingScreen
        technicianId={technicianId}
        technicianName={technicianName}
        projectId={projectId}
        onBack={onClose}
        onSuccess={handleSuccess}
      />
    </AppBottomSheetModal>
  );
}

