import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  ChefHat,
  Timer,
  Package,
  Eye
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  extras?: string[];
  modifications?: string;
  specialInstructions?: string;
}

interface StaffOrder {
  id: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  status: 'pending' | 'accepted' | 'in-progress' | 'ready' | 'completed';
  orderTime: string;
  estimatedTime: string;
  total: number;
  type: 'dine-in' | 'takeout' | 'delivery';
  paymentStatus: 'paid' | 'unpaid';
  tableNumber?: string;
  deliveryAddress?: string;
  specialNotes?: string;
}

const mockStaffOrders: StaffOrder[] = [
  {
    id: 'ORD-001',
    customerName: 'John Doe',
    customerPhone: '+1 (555) 123-4567',
    items: [
      { 
        name: 'Burger Deluxe', 
        quantity: 1, 
        price: 12.99,
        extras: ['Extra cheese', 'Bacon'],
        modifications: 'No onions',
        specialInstructions: 'Medium rare'
      },
      { name: 'Fries', quantity: 1, price: 3.99 },
      { name: 'Coke', quantity: 1, price: 1.52 }
    ],
    status: 'pending',
    orderTime: '14:32',
    estimatedTime: '20 min',
    total: 18.50,
    type: 'dine-in',
    paymentStatus: 'paid',
    tableNumber: 'Table 5'
  },
  {
    id: 'ORD-002',
    customerName: 'Sarah Wilson',
    customerPhone: '+1 (555) 234-5678',
    items: [
      { 
        name: 'Caesar Salad', 
        quantity: 1, 
        price: 10.99,
        extras: ['Grilled chicken'],
        specialInstructions: 'Dressing on the side'
      },
      { name: 'Iced Tea', quantity: 1, price: 2.00 }
    ],
    status: 'in-progress',
    orderTime: '14:29',
    estimatedTime: '5 min',
    total: 12.99,
    type: 'takeout',
    paymentStatus: 'paid'
  },
  {
    id: 'ORD-003',
    customerName: 'Mike Johnson',
    customerPhone: '+1 (555) 345-6789',
    items: [
      { 
        name: 'Pizza Margherita', 
        quantity: 1, 
        price: 18.00,
        extras: ['Extra mozzarella'],
        modifications: 'Thin crust'
      },
      { name: 'Garlic Bread', quantity: 1, price: 6.00 }
    ],
    status: 'accepted',
    orderTime: '14:26',
    estimatedTime: '25 min',
    total: 24.00,
    type: 'delivery',
    paymentStatus: 'paid',
    deliveryAddress: '123 Main St, Apt 4B'
  }
];

const getStatusColor = (status: StaffOrder['status']) => {
  switch (status) {
    case 'pending': return 'status-pending';
    case 'accepted': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'in-progress': return 'status-preparing';
    case 'ready': return 'status-ready';
    case 'completed': return 'status-completed';
    default: return 'status-pending';
  }
};

const getStatusIcon = (status: StaffOrder['status']) => {
  switch (status) {
    case 'pending': return AlertCircle;
    case 'accepted': return CheckCircle;
    case 'in-progress': return Timer;
    case 'ready': return Package;
    case 'completed': return CheckCircle;
    default: return Clock;
  }
};

const StaffDashboard = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [orders, setOrders] = useState(mockStaffOrders);

  const updateOrderStatus = (orderId: string, newStatus: StaffOrder['status']) => {
    setOrders(prev =>
      prev.map(order =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'active') {
      return matchesSearch && ['pending', 'accepted', 'in-progress'].includes(order.status);
    }
    if (activeTab === 'ready') {
      return matchesSearch && order.status === 'ready';
    }
    if (activeTab === 'completed') {
      return matchesSearch && order.status === 'completed';
    }
    return matchesSearch;
  });

  const activeOrdersCount = orders.filter(o => ['pending', 'accepted', 'in-progress'].includes(o.status)).length;
  const readyOrdersCount = orders.filter(o => o.status === 'ready').length;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center">
            <ChefHat className="mr-3 h-8 w-8 text-primary" />
            Kitchen Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage incoming orders and kitchen operations
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
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-warning/10">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeOrdersCount}</p>
                <p className="text-sm text-muted-foreground">Active Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-success/10">
                <Package className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{readyOrdersCount}</p>
                <p className="text-sm text-muted-foreground">Ready for Pickup</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Timer className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">18</p>
                <p className="text-sm text-muted-foreground">Avg. Prep Time (min)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active">
            Active Orders
            {activeOrdersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeOrdersCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="ready">
            Ready
            {readyOrdersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {readyOrdersCount}
              </Badge>
            )}
          </TabsTrigger>
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
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <StatusIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-semibold text-lg">{order.id}</h3>
                            <Badge variant="outline" className="text-xs">
                              {order.type}
                            </Badge>
                            <Badge className={getStatusColor(order.status)}>
                              {order.status.replace('-', ' ')}
                            </Badge>
                            <Badge variant={order.paymentStatus === 'paid' ? 'default' : 'destructive'}>
                              {order.paymentStatus}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {order.customerName} • {order.customerPhone}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Order: {order.orderTime} • Est: {order.estimatedTime}
                          </p>
                          {order.tableNumber && (
                            <p className="text-xs text-primary font-medium">{order.tableNumber}</p>
                          )}
                          {order.deliveryAddress && (
                            <p className="text-xs text-muted-foreground">📍 {order.deliveryAddress}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="font-semibold text-lg">${order.total.toFixed(2)}</p>
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
                              onClick={() => updateOrderStatus(order.id, 'accepted')}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              Accept Order
                            </Button>
                          )}
                          
                          {order.status === 'accepted' && (
                            <Button 
                              size="sm"
                              onClick={() => updateOrderStatus(order.id, 'in-progress')}
                              className="bg-primary hover:bg-primary-hover"
                            >
                              Start Cooking
                            </Button>
                          )}
                          
                          {order.status === 'in-progress' && (
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

                    {/* Order Items Details */}
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <h4 className="text-sm font-medium mb-3 flex items-center">
                        <Package className="h-4 w-4 mr-2" />
                        Order Items:
                      </h4>
                      <div className="space-y-3">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="border-l-2 border-primary pl-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <span className="font-medium">{item.quantity}x {item.name}</span>
                                {item.extras && item.extras.length > 0 && (
                                  <div className="text-xs text-success mt-1">
                                    + {item.extras.join(', ')}
                                  </div>
                                )}
                                {item.modifications && (
                                  <div className="text-xs text-warning mt-1">
                                    ⚠️ {item.modifications}
                                  </div>
                                )}
                                {item.specialInstructions && (
                                  <div className="text-xs text-primary mt-1 font-medium">
                                    📝 {item.specialInstructions}
                                  </div>
                                )}
                              </div>
                              <span className="font-mono text-sm">${item.price.toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {order.specialNotes && (
                        <div className="mt-3 p-2 bg-warning/10 rounded border-l-4 border-warning">
                          <p className="text-sm font-medium text-warning">Special Notes:</p>
                          <p className="text-sm">{order.specialNotes}</p>
                        </div>
                      )}
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

export default StaffDashboard;