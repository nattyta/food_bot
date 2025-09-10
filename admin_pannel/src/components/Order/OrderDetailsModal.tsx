import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Order } from '@/api/types';
import { format } from 'date-fns';

interface OrderDetailsModalProps {
  order: Order | null;
  onOpenChange: (isOpen: boolean) => void;
}

const DetailRow = ({ label, value }: { label: string; value: string | number | undefined }) => (
  <div className="flex justify-between items-center text-sm">
    <p className="text-muted-foreground">{label}</p>
    <p className="font-medium text-foreground">{value}</p>
  </div>
);

export const OrderDetailsModal = ({ order, onOpenChange }: OrderDetailsModalProps) => {
  if (!order) return null;

  return (
    <Dialog open={!!order} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card">
        <DialogHeader>
          <DialogTitle className="text-xl">Order Details</DialogTitle>
          <DialogDescription>
            Detailed information for order <span className="font-semibold text-primary">{order.id}</span>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <DetailRow label="Customer" value={order.customerName} />
          <DetailRow label="Phone" value={order.customerPhone} />
          <DetailRow label="Order Time" value={format(new Date(order.createdAt), "MMM d, yyyy 'at' h:mm a")} />
          <Separator />
          
          <div>
            <h4 className="font-semibold mb-2 text-foreground">Items</h4>
            <div className="space-y-3">
              {Array.isArray(order.items) && order.items.map((item, index) => (
                <div key={index} className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex justify-between font-medium">
                    <span>{item.quantity}x {item.menuItemName}</span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                  
                  {/* --- DISPLAYING THE EXTRA DETAILS --- */}
                  {Array.isArray(item.addOns) && item.addOns.length > 0 && (
                    <div className="text-xs text-muted-foreground pl-4">
                      {item.addOns.map(addon => `+ ${addon.name}`).join(', ')}
                    </div>
                  )}
                  {Array.isArray(item.extras) && item.extras.length > 0 && (
                    <div className="text-xs text-muted-foreground pl-4">
                      {item.extras.map(extra => `+ ${extra.name}`).join(', ')}
                    </div>
                  )}
                  {Array.isArray(item.modifications) && item.modifications.length > 0 && (
                    <div className="text-xs text-muted-foreground pl-4">
                      {item.modifications.map(mod => `- ${mod.name}`).join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {order.specialInstructions && (
            <div>
              <Separator />
              <div className="pt-4">
                <h4 className="font-semibold mb-2 text-foreground">Special Instructions</h4>
                <p className="text-sm p-3 bg-muted/50 rounded-lg text-foreground/80">{order.specialInstructions}</p>
              </div>
            </div>
          )}

          <Separator />
          <div className="flex justify-between items-center text-lg font-bold">
            <p>Total</p>
            <p>${order.total.toFixed(2)}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};