import { useEffect, useState, useCallback } from 'react'; // Removed useRef
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

export const QRScannerDialog = ({ open, onOpenChange, orderId, expectedPin, onComplete }: QRScannerDialogProps) => {
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
    // If the dialog is not open, we don't need to do anything.
    if (!open) {
      return;
    }

    // This variable will hold the scanner instance. It's local to this effect's "session".
    let scanner: Html5QrcodeScanner | null = null;

    const onScanSuccess = (decodedText: string) => {
      // Check if the scanner exists and is running to prevent multiple triggers
      if (scanner && scanner.getState() === Html5QrcodeScannerState.SCANNING) {
        toast({
          title: "QR Code Scanned!",
          description: `Order ${orderId} verified successfully.`,
        });
        onComplete();
        handleClose(); // This will trigger the cleanup function below.
      }
    };

    const onScanFailure = (error: string) => {
      // This callback is verbose. We can ignore most "errors" as they just mean "no QR code found".
    };

    // A timeout is a simple way to ensure the dialog's DOM element exists before we try to use it.
    const startTimeout = setTimeout(() => {
      if (document.getElementById(scannerElementId)) {
        scanner = new Html5QrcodeScanner(
          scannerElementId,
          { fps: 10, qrbox: 250 },
          false // verbose
        );
        scanner.render(onScanSuccess, onScanFailure);
      } else {
        setCameraError("Scanner element not found in the DOM.");
      }
    }, 250); // Using a slightly safer timeout of 250ms

    // --- This is the crucial cleanup function ---
    // It runs when the effect "unmounts": when `open` becomes false or the component is removed.
    return () => {
      clearTimeout(startTimeout); // Stop the timeout if the dialog closes before it fires.
      if (scanner) {
        // Check if the scanner is active before trying to clear it.
        if (scanner.getState() === Html5QrcodeScannerState.SCANNING) {
          scanner.clear().catch(error => {
            console.error("Scanner cleanup failed:", error);
          });
        }
      }
    };
  }, [open, orderId, onComplete, toast, handleClose]); // The dependencies for this effect.

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
                // This div is the target for the scanner
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