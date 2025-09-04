import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Staff } from '@/pages/StaffManagement';
import { MapPin, Clock, Star, User } from 'lucide-react';

interface AssignOrderDialogProps {
  staff: Staff[];
  onClose: () => void;
  onAssign: (orderId: string, staffId: string) => void;
}

// Mock orders data
const mockOrders = [
  {
    id: 'ORD-001',
    customerName: 'John Doe',
    customerPhone: '+1234567890',
    address: '123 Main St, Apt 4B',
    items: ['Burger Deluxe', 'Fries', 'Coke'],
    total: 25.99,
    estimatedTime: 30,
    priority: 'normal' as const
  },
  {
    id: 'ORD-002',
    customerName: 'Sarah Smith',
    customerPhone: '+1234567891',
    address: '456 Oak Ave, Suite 12',
    items: ['Pizza Margherita', 'Garlic Bread'],
    total: 18.50,
    estimatedTime: 25,
    priority: 'high' as const
  },
  {
    id: 'ORD-003',
    customerName: 'Mike Johnson',
    customerPhone: '+1234567892',
    address: '789 Pine St, Floor 2',
    items: ['Pasta Carbonara', 'Caesar Salad', 'Water'],
    total: 22.75,
    estimatedTime: 35,
    priority: 'normal' as const
  }
];

export const AssignOrderDialog = ({ staff, onClose, onAssign }: AssignOrderDialogProps) => {
  const [selectedOrder, setSelectedOrder] = useState<string>('');
  const [selectedStaff, setSelectedStaff] = useState<string>('');

  const deliveryStaff = staff.filter(s => s.role === 'delivery');
  const selectedOrderData = mockOrders.find(o => o.id === selectedOrder);

  const handleAssign = () => {
    if (selectedOrder && selectedStaff) {
      onAssign(selectedOrder, selectedStaff);
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'normal': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Order to Delivery Staff</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Select Order */}
          <div className="space-y-3">
            <h3 className="font-medium">Select Order</h3>
            <div className="grid gap-3">
              {mockOrders.map((order) => (
                <Card 
                  key={order.id}
                  className={`cursor-pointer border-2 transition-colors ${
                    selectedOrder === order.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedOrder(order.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{order.id}</span>
                          <Badge variant={getPriorityBadgeVariant(order.priority)}>
                            {order.priority}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center space-x-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{order.customerName}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground">{order.customerPhone}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{order.address}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Est. {order.estimatedTime} min</span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-medium">${order.total}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.items.length} items
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm text-muted-foreground">
                        Items: {order.items.join(', ')}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Select Delivery Staff */}
          {selectedOrder && (
            <div className="space-y-3">
              <h3 className="font-medium">Assign to Delivery Staff</h3>
              <div className="grid gap-3">
                {deliveryStaff.map((member) => (
                  <Card 
                    key={member.id}
                    className={`cursor-pointer border-2 transition-colors ${
                      selectedStaff === member.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedStaff(member.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{member.name}</span>
                            <Badge variant="default">Delivery</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{member.phone}</p>
                        </div>
                        
                        <div className="text-right space-y-1">
                          <div className="flex items-center space-x-1">
                            <Star className="h-4 w-4 text-warning" />
                            <span className="text-sm font-medium">{member.rating.toFixed(1)}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {member.ordersHandled} deliveries
                          </p>
                          {member.averageTime && (
                            <p className="text-sm text-muted-foreground">
                              {member.averageTime}min avg
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Order Summary */}
          {selectedOrder && selectedStaff && selectedOrderData && (
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Assignment Summary</h4>
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Order:</span> {selectedOrderData.id}</p>
                <p><span className="text-muted-foreground">Customer:</span> {selectedOrderData.customerName}</p>
                <p><span className="text-muted-foreground">Delivery Person:</span> {staff.find(s => s.id === selectedStaff)?.name}</p>
                <p><span className="text-muted-foreground">Estimated Time:</span> {selectedOrderData.estimatedTime} minutes</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleAssign}
              disabled={!selectedOrder || !selectedStaff}
              className="flex-1"
            >
              Assign Order
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};