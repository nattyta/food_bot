import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QrCode, Camera, Hash, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QRScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  expectedPin?: string;
  onComplete: () => void;
}

export const QRScannerDialog = ({ open, onOpenChange, orderId, expectedPin, onComplete }: QRScannerDialogProps) => {
  const { toast } = useToast();
  const [pinInput, setPinInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState('');

  const handlePinSubmit = () => {
    if (pinInput === expectedPin) {
      toast({
        title: "Delivery Confirmed",
        description: `Order ${orderId} completed successfully with PIN verification.`,
      });
      onComplete();
      onOpenChange(false);
      setPinInput('');
    } else {
      toast({
        title: "Invalid PIN",
        description: "The PIN code you entered is incorrect. Please try again.",
        variant: "destructive",
      });
    }
  };

  const startCamera = () => {
    setScanning(true);
    // Simulate camera scanning
    setTimeout(() => {
      // Mock QR scan result
      setScanResult(`QR-${orderId}-VERIFIED`);
      setScanning(false);
      toast({
        title: "QR Code Scanned",
        description: `Order ${orderId} verified successfully via QR code.`,
      });
      onComplete();
      onOpenChange(false);
    }, 2000);
  };

  const handleClose = () => {
    onOpenChange(false);
    setPinInput('');
    setScanResult('');
    setScanning(false);
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
            Scan the customer's QR code or enter their PIN to complete the delivery
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="qr" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="qr">QR Scanner</TabsTrigger>
            <TabsTrigger value="pin">PIN Entry</TabsTrigger>
          </TabsList>
          
          <TabsContent value="qr" className="space-y-4">
            <div className="flex flex-col items-center space-y-4">
              {!scanning && !scanResult && (
                <div className="w-full h-48 border-2 border-dashed border-muted-foreground rounded-lg flex flex-col items-center justify-center bg-muted/20">
                  <Camera className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground text-center">
                    Click to start camera and scan customer's QR code
                  </p>
                </div>
              )}
              
              {scanning && (
                <div className="w-full h-48 border-2 border-primary rounded-lg flex flex-col items-center justify-center bg-primary/10 animate-pulse">
                  <Camera className="h-12 w-12 text-primary mb-2" />
                  <p className="text-sm text-primary font-medium">
                    Scanning QR Code...
                  </p>
                  <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mt-2" />
                </div>
              )}
              
              {scanResult && (
                <div className="w-full h-48 border-2 border-success rounded-lg flex flex-col items-center justify-center bg-success/10">
                  <CheckCircle className="h-12 w-12 text-success mb-2" />
                  <p className="text-sm text-success font-medium">
                    QR Code Verified Successfully!
                  </p>
                </div>
              )}
              
              <Button 
                onClick={startCamera} 
                disabled={scanning || !!scanResult}
                className="w-full"
              >
                <Camera className="h-4 w-4 mr-2" />
                {scanning ? 'Scanning...' : 'Start Camera'}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="pin" className="space-y-4">
            <div className="space-y-4">
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
                <p className="text-xs text-muted-foreground">
                  Ask the customer for their delivery PIN code
                </p>
              </div>
              
              <Button 
                onClick={handlePinSubmit} 
                disabled={pinInput.length !== 4}
                className="w-full"
              >
                <Hash className="h-4 w-4 mr-2" />
                Verify PIN & Complete
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};