import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Truck, 
  MapPin, 
  Phone,
  QrCode,
  Star,
  Clock,
  Package,
  Navigation,
  CheckCircle,
  DollarSign
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface DeliveryOrder {
  id: string;
  customerName: string;
  customerPhone: string;
  address: string;
  floor?: string;
  room?: string;
  notes?: string;
  items: { name: string; quantity: number }[];
  total: number;
  orderTime: string;
  status: 'ready' | 'assigned' | 'on-the-way' | 'delivered';
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  rating?: number;
  qrCode?: string;
  pinCode?: string;
}

interface DeliveryStats {
  totalDeliveries: number;
  todayDeliveries: number;
  averageTime: number;
  averageRating: number;
  earnings: number;
}

const mockDeliveryOrders: DeliveryOrder[] = [
  {
    id: 'ORD-001',
    customerName: 'John Doe',
    customerPhone: '+1 (555) 123-4567',
    address: '123 Main St, Downtown',
    floor: '3rd floor',
    room: 'Apt 4B',
    notes: 'Call when you arrive, blue door',
    items: [
      { name: 'Burger Deluxe', quantity: 1 },
      { name: 'Fries', quantity: 1 },
      { name: 'Coke', quantity: 1 }
    ],
    total: 18.50,
    orderTime: '14:32',
    status: 'ready',
    qrCode: 'QR-001-ABC123',
    pinCode: '1234'
  },
  {
    id: 'ORD-002',
    customerName: 'Sarah Wilson',
    customerPhone: '+1 (555) 234-5678',
    address: '456 Oak Avenue, Midtown',
    floor: '2nd floor',
    room: 'Suite 205',
    items: [
      { name: 'Caesar Salad', quantity: 1 },
      { name: 'Iced Tea', quantity: 1 }
    ],
    total: 12.99,
    orderTime: '14:29',
    status: 'on-the-way',
    estimatedDeliveryTime: '15:15',
    qrCode: 'QR-002-DEF456',
    pinCode: '5678'
  },
  {
    id: 'ORD-003',
    customerName: 'Mike Johnson',
    customerPhone: '+1 (555) 345-6789',
    address: '789 Pine Street, Uptown',
    notes: 'Ring doorbell twice',
    items: [
      { name: 'Pizza Margherita', quantity: 1 },
      { name: 'Garlic Bread', quantity: 1 }
    ],
    total: 24.00,
    orderTime: '13:45',
    status: 'delivered',
    actualDeliveryTime: '14:20',
    rating: 5,
    qrCode: 'QR-003-GHI789',
    pinCode: '9012'
  }
];

const mockStats: DeliveryStats = {
  totalDeliveries: 156,
  todayDeliveries: 8,
  averageTime: 22,
  averageRating: 4.7,
  earnings: 1240.50
};

const getStatusColor = (status: DeliveryOrder['status']) => {
  switch (status) {
    case 'ready': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'assigned': return 'status-preparing';
    case 'on-the-way': return 'status-pending';
    case 'delivered': return 'status-completed';
    default: return 'status-pending';
  }
};

const DeliveryDashboard = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('available');
  const [orders, setOrders] = useState(mockDeliveryOrders);
  const [stats] = useState(mockStats);

  const updateOrderStatus = (orderId: string, newStatus: DeliveryOrder['status']) => {
    setOrders(prev =>
      prev.map(order =>
        order.id === orderId ? { 
          ...order, 
          status: newStatus,
          estimatedDeliveryTime: newStatus === 'on-the-way' ? 
            new Date(Date.now() + 25 * 60000).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : 
            order.estimatedDeliveryTime,
          actualDeliveryTime: newStatus === 'delivered' ?
            new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) :
            order.actualDeliveryTime
        } : order
      )
    );
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'available') {
      return matchesSearch && order.status === 'ready';
    }
    if (activeTab === 'active') {
      return matchesSearch && ['assigned', 'on-the-way'].includes(order.status);
    }
    if (activeTab === 'completed') {
      return matchesSearch && order.status === 'delivered';
    }
    return matchesSearch;
  });

  const availableCount = orders.filter(o => o.status === 'ready').length;
  const activeCount = orders.filter(o => ['assigned', 'on-the-way'].includes(o.status)).length;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center">
            <Truck className="mr-3 h-8 w-8 text-primary" />
            Delivery Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage deliveries and track performance
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

      {/* Performance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalDeliveries}</p>
                <p className="text-sm text-muted-foreground">Total Deliveries</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.todayDeliveries}</p>
                <p className="text-sm text-muted-foreground">Today's Deliveries</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-warning/10">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.averageTime}m</p>
                <p className="text-sm text-muted-foreground">Avg. Delivery Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-secondary/10">
                <Star className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.averageRating}</p>
                <p className="text-sm text-muted-foreground">Customer Rating</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-green-100">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">${stats.earnings}</p>
                <p className="text-sm text-muted-foreground">Total Earnings</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="available">
            Available Orders
            {availableCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {availableCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="active">
            Active Deliveries
            {activeCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="grid gap-4">
            {filteredOrders.map((order, index) => (
              <Card 
                key={order.id}
                className="animate-slide-in hover:shadow-elegant transition-all duration-200"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Truck className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold text-lg">{order.id}</h3>
                          <Badge className={getStatusColor(order.status)}>
                            {order.status.replace('-', ' ')}
                          </Badge>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium text-sm text-muted-foreground mb-1">Customer</h4>
                            <p className="font-medium">{order.customerName}</p>
                            <p className="text-sm text-muted-foreground flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {order.customerPhone}
                            </p>
                          </div>
                          
                          <div>
                            <h4 className="font-medium text-sm text-muted-foreground mb-1">Delivery Address</h4>
                            <p className="text-sm flex items-start">
                              <MapPin className="h-3 w-3 mr-1 mt-0.5 text-primary" />
                              <span>
                                {order.address}
                                {order.floor && <><br />{order.floor}</>}
                                {order.room && <>, {order.room}</>}
                              </span>
                            </p>
                            {order.notes && (
                              <p className="text-xs text-muted-foreground mt-1">
                                📝 {order.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                          <h4 className="text-sm font-medium mb-2">Items ({order.items.length})</h4>
                          <div className="space-y-1">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <span>{item.quantity}x {item.name}</span>
                              </div>
                            ))}
                          </div>
                          <div className="border-t mt-2 pt-2">
                            <div className="flex justify-between font-medium">
                              <span>Total:</span>
                              <span>${order.total.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>

                        {order.status === 'delivered' && order.rating && (
                          <div className="mt-3 flex items-center space-x-2">
                            <span className="text-sm text-muted-foreground">Customer Rating:</span>
                            <div className="flex items-center space-x-1">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`h-4 w-4 ${i < order.rating! ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end space-y-3">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Order Time</p>
                        <p className="font-medium">{order.orderTime}</p>
                        {order.estimatedDeliveryTime && (
                          <>
                            <p className="text-sm text-muted-foreground mt-1">Est. Delivery</p>
                            <p className="font-medium text-primary">{order.estimatedDeliveryTime}</p>
                          </>
                        )}
                        {order.actualDeliveryTime && (
                          <>
                            <p className="text-sm text-muted-foreground mt-1">Delivered</p>
                            <p className="font-medium text-success">{order.actualDeliveryTime}</p>
                          </>
                        )}
                      </div>

                      <div className="flex flex-col space-y-2">
                        {order.status === 'ready' && (
                          <Button 
                            size="sm"
                            onClick={() => updateOrderStatus(order.id, 'assigned')}
                            className="bg-primary hover:bg-primary-hover"
                          >
                            Accept Delivery
                          </Button>
                        )}
                        
                        {order.status === 'assigned' && (
                          <Button 
                            size="sm"
                            onClick={() => updateOrderStatus(order.id, 'on-the-way')}
                            className="bg-warning hover:opacity-90"
                          >
                            Start Delivery
                          </Button>
                        )}
                        
                        {(order.status === 'assigned' || order.status === 'on-the-way') && (
                          <>
                            <Button variant="outline" size="sm">
                              <Navigation className="h-4 w-4 mr-1" />
                              Get Directions
                            </Button>
                            <Button variant="outline" size="sm">
                              <Phone className="h-4 w-4 mr-1" />
                              Call Customer
                            </Button>
                          </>
                        )}
                        
                        {order.status === 'on-the-way' && (
                          <div className="space-y-2">
                            <Button 
                              size="sm"
                              onClick={() => updateOrderStatus(order.id, 'delivered')}
                              className="bg-success hover:opacity-90 w-full"
                            >
                              <QrCode className="h-4 w-4 mr-1" />
                              Scan QR / Complete
                            </Button>
                            
                            <div className="p-2 bg-muted/50 rounded text-center">
                              <p className="text-xs text-muted-foreground">PIN Code</p>
                              <p className="font-mono font-bold">{order.pinCode}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DeliveryDashboard;