import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { QrCode } from 'lucide-react';
import { QRScannerDialog } from './QRScannerDialog';

interface QRScannerButtonProps {
  orderId: string;
  expectedPin?: string;
  onComplete: () => void;
}

export const QRScannerButton = ({ orderId, expectedPin, onComplete }: QRScannerButtonProps) => {
  const [showScanner, setShowScanner] = useState(false);

  return (
    <>
      <Button 
        size="sm"
        onClick={() => setShowScanner(true)}
        className="bg-success hover:opacity-90 w-full"
      >
        <QrCode className="h-4 w-4 mr-1" />
        Scan QR / Complete
      </Button>
      
      <QRScannerDialog
        open={showScanner}
        onOpenChange={setShowScanner}
        orderId={orderId}
        expectedPin={expectedPin}
        onComplete={onComplete}
      />
    </>
  );
};