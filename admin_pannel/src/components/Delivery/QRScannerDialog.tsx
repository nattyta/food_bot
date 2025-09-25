import { useEffect, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QrCode, Hash, CheckCircle, CameraOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Html5QrcodeScanner, Html5QrcodeScannerState } from 'html5-qrcode';

interface QRScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  expectedPin?: string;
  onComplete: () => void;
}

const scannerElementId = "qr-scanner-view";

export const QRScannerDialog = ({ open, onOpenChange, orderId, onComplete }: QRScannerDialogProps) => {
  const { toast } = useToast();
  const [pinInput, setPinInput] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setPinInput('');
    setCameraError(null);
  }, [onOpenChange]);

  // A single, consolidated useEffect to manage the entire scanner lifecycle.
  useEffect(() => {
    if (!open) {
      return;
    }

    let scanner: Html5QrcodeScanner | null = null;

    const onScanSuccess = (decodedText: string) => {
      // We can add a log here to be sure
      console.log(`QR Code decoded successfully. Text: ${decodedText}`);

      if (scanner && scanner.getState() === Html5QrcodeScannerState.SCANNING) {
        toast({
          title: "QR Code Scanned!",
          description: `Verifying order...`,
        });
        onComplete();
        handleClose();
      }
    };

    const onScanFailure = (error: string) => {
      // This function is called frequently. We can ignore it to keep the console clean.
    };

    // Use a timeout to ensure the dialog's DOM element exists before we try to use it.
    const startTimeout = setTimeout(() => {
      if (document.getElementById(scannerElementId)) {
        scanner = new Html5QrcodeScanner(
          scannerElementId,
          { fps: 10, qrbox: { width: 250, height: 250 } },
          /* verbose= */ false
        );
        scanner.render(onScanSuccess, onScanFailure);
      } else {
        setCameraError("Scanner element could not be initialized.");
      }
    }, 300); // Increased timeout slightly for more reliability

    // This is the cleanup function that runs when the dialog closes.
    return () => {
      clearTimeout(startTimeout);
      if (scanner) {
        if (scanner.getState() === Html5QrcodeScannerState.SCANNING) {
          scanner.clear().catch(error => {
            console.error("Scanner cleanup failed:", error);
          });
        }
      }
    };
  }, [open, orderId, onComplete, toast, handleClose]);

  const handlePinSubmit = () => {
    const MOCK_PIN = '0000';
    if (pinInput === MOCK_PIN) {
      toast({ title: "Delivery Confirmed", description: `Order ${orderId} completed with PIN verification.` });
      onComplete();
      handleClose();
    } else {
      toast({ title: "Invalid PIN", description: "The PIN code you entered is incorrect.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <QrCode className="h-5 w-5 mr-2" />
            Complete Delivery - {orderId}
          </DialogTitle>
          <DialogDescription>
            Scan the customer's QR code or enter their PIN.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="qr" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="qr">QR Scanner</TabsTrigger>
            <TabsTrigger value="pin">PIN Entry</TabsTrigger>
          </TabsList>

          <TabsContent value="qr" className="space-y-4 pt-4">
             {cameraError ? (
                <div className="w-full h-48 border-2 border-destructive rounded-lg flex flex-col items-center justify-center bg-destructive/10 text-destructive">
                    <CameraOff className="h-12 w-12 mb-2" />
                    <p className="text-sm font-medium text-center px-4">{cameraError}</p>
                </div>
             ) : (
                <div id={scannerElementId} className="w-full aspect-video border-2 border-dashed border-muted-foreground rounded-lg overflow-hidden" />
             )}
          </TabsContent>
          
          <TabsContent value="pin" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin">Customer PIN Code</Label>
              <Input
                id="pin"
                type="text"
                placeholder="Enter 4-digit PIN"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                maxLength={4}
                className="text-center text-lg font-mono"
              />
            </div>
            <Button onClick={handlePinSubmit} disabled={pinInput.length !== 4} className="w-full">
              <Hash className="h-4 w-4 mr-2" />
              Verify PIN & Complete
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};