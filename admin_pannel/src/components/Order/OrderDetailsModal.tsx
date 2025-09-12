// src/components/Order/OrderDetailsModal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Order, OrderItem } from '@/api/types';
import { format } from 'date-fns';

interface OrderDetailsModalProps {
  order: Order | null;
  onOpenChange: (isOpen: boolean) => void;
}

const DetailRow = ({ label, value }: { label: string; value?: string | number }) => {
  if (value === undefined || value === null) return null;
  return (
    <div className="flex justify-between items-center text-sm py-1">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground text-right">{value}</p>
    </div>
  );
};

export const OrderDetailsModal = ({ order, onOpenChange }: OrderDetailsModalProps) => {
  if (!order) return null;
  console.log("Data received by OrderDetailsModal:", JSON.stringify(order, null, 2));
  return (
    <Dialog open={!!order} onOpen-Change={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Order Details</DialogTitle>
          <DialogDescription>
            Detailed information for order <span className="font-semibold text-primary">{order.id}</span>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 py-4 max-h-[70vh] overflow-y-auto">
          <DetailRow label="Customer" value={order.customerName} />
          <DetailRow label="Phone" value={order.customerPhone} />
          <DetailRow label="Order Time" value={format(new Date(order.createdAt), "MMM d, yyyy 'at' h:mm a")} />
          <Separator className="my-2" />
          
          <div>
            <h4 className="font-semibold mb-2 text-foreground">Items</h4>
            <div className="space-y-2">
              {Array.isArray(order.items) && order.items.map((item: OrderItem, index) => (
                <div key={index} className="p-3 bg-muted/50 rounded-lg text-sm">
                  <div className="flex justify-between font-medium">
                    <span>{item.quantity}x {item.menuItemName}</span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                  
                  {/* --- THIS IS THE IMPROVED DISPLAY LOGIC --- */}
                  <ul className="list-none pl-4 mt-1 space-y-1 text-xs text-muted-foreground">
                    {Array.isArray(item.addOns) && item.addOns.map((addon, i) => (
                      <li key={`addon-${i}`}>+ {addon.name}</li>
                    ))}
                    {Array.isArray(item.extras) && item.extras.map((extra, i) => (
                      <li key={`extra-${i}`}>+ {extra.name}</li>
                    ))}
                    {Array.isArray(item.modifications) && item.modifications.map((mod, i) => (
                      <li key={`mod-${i}`}>- {mod.name}</li>
                    ))}
                  </ul>
                  {/* Item-specific special instruction */}
                  {item.specialInstruction && (
                      <p className="text-xs text-amber-500 pl-4 mt-1">Note: {item.specialInstruction}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {order.specialInstructions && (
            <div>
              <Separator className="my-2" />
              <div className="pt-2">
                <h4 className="font-semibold mb-2 text-foreground">Overall Special Instructions</h4>
                <p className="text-sm p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-200 whitespace-pre-wrap">
                  {order.specialInstructions}
                </p>
              </div>
            </div>
          )}

          <Separator className="my-2" />
          <div className="flex justify-between items-center text-lg font-bold pt-2">
            <p>Total</p>
            <p>${order.total.toFixed(2)}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};