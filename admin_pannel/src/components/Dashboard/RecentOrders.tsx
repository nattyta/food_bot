import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, MoreHorizontal } from 'lucide-react';

interface Order {
  id: string;
  customerName: string;
  items: string[];
  status: 'pending' | 'preparing' | 'ready' | 'completed';
  time: string;
  total: string;
}

const mockOrders: Order[] = [
  {
    id: '#ORD-001',
    customerName: 'John Doe',
    items: ['Burger Deluxe', 'Fries', 'Coke'],
    status: 'preparing',
    time: '2 min ago',
    total: '$18.50',
  },
  {
    id: '#ORD-002',
    customerName: 'Sarah Wilson',
    items: ['Caesar Salad', 'Iced Tea'],
    status: 'ready',
    time: '5 min ago',
    total: '$12.99',
  },
  {
    id: '#ORD-003',
    customerName: 'Mike Johnson',
    items: ['Pizza Margherita', 'Garlic Bread'],
    status: 'pending',
    time: '8 min ago',
    total: '$24.00',
  },
  {
    id: '#ORD-004',
    customerName: 'Emily Brown',
    items: ['Chicken Wings', 'Beer'],
    status: 'preparing',
    time: '12 min ago',
    total: '$16.75',
  },
];

const getStatusColor = (status: Order['status']) => {
  switch (status) {
    case 'pending': return 'status-pending';
    case 'preparing': return 'status-preparing';
    case 'ready': return 'status-ready';
    case 'completed': return 'status-completed';
    default: return 'status-pending';
  }
};

const getStatusText = (status: Order['status']) => {
  switch (status) {
    case 'pending': return 'Pending';
    case 'preparing': return 'Preparing';
    case 'ready': return 'Ready';
    case 'completed': return 'Completed';
    default: return 'Unknown';
  }
};

export const RecentOrders = () => {
  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Recent Orders</CardTitle>
            <CardDescription>Latest orders from the kitchen</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockOrders.map((order, index) => (
            <div 
              key={order.id}
              className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-card-hover transition-colors animate-slide-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center space-x-4">
                <div className="flex flex-col">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-sm">{order.id}</span>
                    <Badge className={getStatusColor(order.status)}>
                      {getStatusText(order.status)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{order.customerName}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.items.join(', ')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="font-semibold text-sm">{order.total}</p>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 mr-1" />
                    {order.time}
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};