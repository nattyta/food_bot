import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Filter, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  MoreHorizontal,
  Eye
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  items: { name: string; quantity: number; price: number }[];
  status: 'pending' | 'preparing' | 'ready' | 'completed';
  orderTime: string;
  estimatedTime: string;
  total: number;
  type: 'dine-in' | 'takeout' | 'delivery';
}

const mockOrders: Order[] = [
  {
    id: 'ORD-001',
    customerName: 'John Doe',
    customerPhone: '+1 (555) 123-4567',
    items: [
      { name: 'Burger Deluxe', quantity: 1, price: 12.99 },
      { name: 'Fries', quantity: 1, price: 3.99 },
      { name: 'Coke', quantity: 1, price: 1.52 }
    ],
    status: 'preparing',
    orderTime: '14:32',
    estimatedTime: '5 min',
    total: 18.50,
    type: 'dine-in'
  },
  {
    id: 'ORD-002',
    customerName: 'Sarah Wilson',
    customerPhone: '+1 (555) 234-5678',
    items: [
      { name: 'Caesar Salad', quantity: 1, price: 10.99 },
      { name: 'Iced Tea', quantity: 1, price: 2.00 }
    ],
    status: 'ready',
    orderTime: '14:29',
    estimatedTime: 'Ready',
    total: 12.99,
    type: 'takeout'
  },
  {
    id: 'ORD-003',
    customerName: 'Mike Johnson',
    customerPhone: '+1 (555) 345-6789',
    items: [
      { name: 'Pizza Margherita', quantity: 1, price: 18.00 },
      { name: 'Garlic Bread', quantity: 1, price: 6.00 }
    ],
    status: 'pending',
    orderTime: '14:26',
    estimatedTime: '12 min',
    total: 24.00,
    type: 'delivery'
  }
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

const getStatusIcon = (status: Order['status']) => {
  switch (status) {
    case 'pending': return AlertCircle;
    case 'preparing': return Clock;
    case 'ready': return CheckCircle;
    case 'completed': return CheckCircle;
    default: return Clock;
  }
};

const Orders = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const updateOrderStatus = (orderId: string, newStatus: Order['status']) => {
    // In a real app, this would make an API call
    console.log(`Updating order ${orderId} to ${newStatus}`);
  };

  const filteredOrders = mockOrders.filter(order => {
    const matchesSearch = order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'all') return matchesSearch;
    return matchesSearch && order.status === activeTab;
  });

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Orders</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track all incoming orders
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Orders</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="preparing">Preparing</TabsTrigger>
          <TabsTrigger value="ready">Ready</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="grid gap-4">
            {filteredOrders.map((order, index) => {
              const StatusIcon = getStatusIcon(order.status);
              return (
                <Card 
                  key={order.id}
                  className="animate-slide-in hover:shadow-elegant transition-all duration-200"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <StatusIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold">{order.id}</h3>
                            <Badge variant="outline" className="text-xs">
                              {order.type}
                            </Badge>
                            <Badge className={getStatusColor(order.status)}>
                              {order.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {order.customerName} • {order.customerPhone}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Order time: {order.orderTime} • Est: {order.estimatedTime}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="font-semibold">${order.total.toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground">
                            {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {order.status === 'pending' && (
                            <Button 
                              size="sm"
                              onClick={() => updateOrderStatus(order.id, 'preparing')}
                              className="bg-primary hover:bg-primary-hover"
                            >
                              Start Preparing
                            </Button>
                          )}
                          
                          {order.status === 'preparing' && (
                            <Button 
                              size="sm"
                              onClick={() => updateOrderStatus(order.id, 'ready')}
                              className="bg-success hover:opacity-90"
                            >
                              Mark Ready
                            </Button>
                          )}
                          
                          {order.status === 'ready' && (
                            <Button 
                              size="sm"
                              onClick={() => updateOrderStatus(order.id, 'completed')}
                              className="bg-secondary hover:bg-secondary-hover"
                            >
                              Complete
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                      <h4 className="text-sm font-medium mb-2">Order Items:</h4>
                      <div className="space-y-1">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span>{item.quantity}x {item.name}</span>
                            <span className="font-mono">${item.price.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Orders;