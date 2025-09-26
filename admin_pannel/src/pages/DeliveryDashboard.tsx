import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, Truck, MapPin, CheckCircle, Package, Loader2, Phone,
  Star, Clock, Navigation, DollarSign
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ordersApi } from '@/api/orders';
import { Order as DeliveryOrder, OrderStatus, DeliveryStats } from '@/api/types';
import { QRScannerButton } from '@/components/Delivery/QRScannerButton';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

// This maps your backend statuses to the new frontend design statuses
const mapOrderStatus = (status: OrderStatus): 'ready' | 'on_the_way' | 'delivered' => {
  if (status === 'ready') return 'ready';
  if (status === 'on_the_way') return 'on_the_way';
  return 'delivered';
};

const getStatusColor = (status: 'ready' | 'on_the_way' | 'delivered') => {
  switch (status) {
    case 'ready': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'on_the_way': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'delivered': return 'bg-green-100 text-green-800 border-green-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const DeliveryDashboard = () => {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('available');

  // --- 1. DATA FETCHING LOGIC ---
  const { data: availableOrdersData = [], isLoading: isLoadingAvailable } = useQuery({
    queryKey: ['delivery', 'available'],
    queryFn: () => ordersApi.getAvailableDeliveries(token!),
    enabled: !!token,
    refetchInterval: 20000,
  });

  const { data: myDeliveriesData = [], isLoading: isLoadingMyDeliveries } = useQuery({
    queryKey: ['delivery', 'myDeliveries'],
    queryFn: () => ordersApi.getMyDeliveries(token!),
    enabled: !!token,
    refetchInterval: 20000,
  });

  const { data: completedDeliveriesData = [], isLoading: isLoadingCompleted } = useQuery({
    queryKey: ['delivery', 'completed'],
    queryFn: () => ordersApi.getCompletedDeliveries(token!),
    enabled: !!token,
  });

  const { data: stats, isLoading: isLoadingStats } = useQuery<DeliveryStats>({
    queryKey: ['delivery', 'stats'],
    queryFn: () => ordersApi.getDeliveryStats(token!),
    enabled: !!token,
  });

  const isLoading = isLoadingAvailable || isLoadingMyDeliveries || isLoadingCompleted || isLoadingStats;

  // --- 2. MUTATION LOGIC ---
  const acceptMutation = useMutation({
    mutationFn: (orderId: string) => ordersApi.acceptDelivery(token!, orderId),
    onSuccess: () => {
      toast({ title: "Order Accepted!" });
      queryClient.invalidateQueries({ queryKey: ['delivery'] });
      setActiveTab('active'); // The new design uses 'active' for this tab
    },
    onError: (err: Error) => {
      toast({ title: "Failed to Accept", description: err.message, variant: "destructive" });
    },
  });
  
  const completeMutation = useMutation({
    mutationFn: (orderId: string) => ordersApi.completeDelivery(token!, orderId),
    onSuccess: () => {
      toast({ title: "Delivery Completed!" });
      queryClient.invalidateQueries({ queryKey: ['delivery'] });
    },
    onError: (err: Error) => { 
      toast({ title: "Completion Failed", description: err.message, variant: "destructive" });
    },
  });

  // --- 3. HANDLER FUNCTIONS ---
  const handleAcceptDelivery = (orderId: string) => acceptMutation.mutate(orderId);
  const handleCompleteDelivery = (orderId: string) => completeMutation.mutate(orderId);
  
  const handleGetDirections = (address?: string) => {
    if (!address) {
      toast({
        title: "Address not available",
        description: "This order does not have a delivery address.",
        variant: "destructive",
      });
      return;
    }
    const encodedAddress = encodeURIComponent(address);
    // This universal link works best for both iOS (Apple Maps) and Android (Google Maps)
    const mapUrl = `https://maps.apple.com/?q=${encodedAddress}`;
    window.open(mapUrl, '_blank');
  };

  // --- 4. FILTERING LOGIC ---
  const allOrders = [
    ...availableOrdersData,
    ...myDeliveriesData,
    ...completedDeliveriesData
  ];

  const filteredOrders = allOrders.filter(order => {
    const matchesSearch = (order.customerName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (order.id?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (activeTab === 'available') return order.status === 'ready';
    if (activeTab === 'active') return order.status === 'on_the_way';
    if (activeTab === 'completed') return order.status === 'delivered';
    return true;
  });

  const availableCount = availableOrdersData.length;
  const activeCount = myDeliveriesData.length;
  
  // --- 5. RENDER THE NEW UI STRUCTURE WITH REAL DATA ---
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
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search orders..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 w-64" />
        </div>
      </div>

      {/* Performance Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {isLoadingStats || !stats ? Array.from({length: 5}).map((_, i) => <Skeleton key={i} className="h-24" />) : (
          <>
            <Card><CardContent className="p-4"><div className="flex items-center space-x-2"><div className="p-2 rounded-lg bg-primary/10"><Package className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{stats.totalDeliveries}</p><p className="text-sm text-muted-foreground">Total</p></div></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center space-x-2"><div className="p-2 rounded-lg bg-success/10"><CheckCircle className="h-5 w-5 text-success" /></div><div><p className="text-2xl font-bold">{stats.todayDeliveries}</p><p className="text-sm text-muted-foreground">Today</p></div></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center space-x-2"><div className="p-2 rounded-lg bg-warning/10"><Clock className="h-5 w-5 text-warning" /></div><div><p className="text-2xl font-bold">{stats.averageTime}m</p><p className="text-sm text-muted-foreground">Avg. Time</p></div></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center space-x-2"><div className="p-2 rounded-lg bg-secondary/10"><Star className="h-5 w-5 text-secondary" /></div><div><p className="text-2xl font-bold">{stats.averageRating}</p><p className="text-sm text-muted-foreground">Rating</p></div></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center space-x-2"><div className="p-2 rounded-lg bg-green-100"><DollarSign className="h-5 w-5 text-green-600" /></div><div><p className="text-2xl font-bold">${stats.earnings.toFixed(2)}</p><p className="text-sm text-muted-foreground">Earnings</p></div></div></CardContent></Card>
          </>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="available">Available {availableCount > 0 && <Badge variant="secondary" className="ml-2">{availableCount}</Badge>}</TabsTrigger>
          <TabsTrigger value="active">Active Deliveries {activeCount > 0 && <Badge variant="secondary" className="ml-2">{activeCount}</Badge>}</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="grid gap-4">
            {isLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64" />) :
              filteredOrders.length === 0 ? <div className="text-center text-muted-foreground py-16"><CheckCircle className="mx-auto h-12 w-12 text-gray-400" /> <p className="mt-2">No orders in this category.</p></div> :
              filteredOrders.map((order, index) => (
                <Card key={order.id} className="animate-slide-in" style={{ animationDelay: `${index * 50}ms` }}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="p-2 rounded-lg bg-primary/10"><Truck className="h-5 w-5 text-primary" /></div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-semibold text-lg">{order.id}</h3>
                            <Badge className={getStatusColor(mapOrderStatus(order.status))}>
                              {order.status.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-medium text-sm text-muted-foreground mb-1">Customer</h4>
                              <p className="font-medium">{order.customerName}</p>
                              <p className="text-sm text-muted-foreground flex items-center"><Phone className="h-3 w-3 mr-1" />{order.customerPhone}</p>
                            </div>
                            <div>
                              <h4 className="font-medium text-sm text-muted-foreground mb-1">Delivery Address</h4>
                              <p className="text-sm flex items-start"><MapPin className="h-3 w-3 mr-1 mt-0.5 text-primary" /><span>{order.deliveryAddress}</span></p>
                              {order.specialInstructions && <p className="text-xs text-muted-foreground mt-1">📝 {order.specialInstructions}</p>}
                            </div>
                          </div>
                          <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                            <h4 className="text-sm font-medium mb-2">Items ({order.items.length})</h4>
                            <div className="space-y-1">{order.items.map((item, idx) => (<div key={idx} className="flex justify-between text-sm"><span>{item.quantity}x {item.menuItemName}</span></div>))}</div>
                            <div className="border-t mt-2 pt-2"><div className="flex justify-between font-medium"><span>Total:</span><span>${order.total.toFixed(2)}</span></div></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-3">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Order Time</p>
                          <p className="font-medium">{format(new Date(order.createdAt), "HH:mm")}</p>
                          {order.status === 'delivered' && (
                            <><p className="text-sm text-muted-foreground mt-1">Delivered</p><p className="font-medium text-success">{format(new Date(order.updatedAt), "HH:mm")}</p></>
                          )}
                        </div>
                        <div className="flex flex-col space-y-2">
                          {order.status === 'ready' && <Button size="sm" onClick={() => handleAcceptDelivery(order.id)} disabled={acceptMutation.isPending}>{acceptMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Accept Delivery'}</Button>}
                          {(order.status === 'on_the_way') && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => handleGetDirections(order.deliveryAddress)}><Navigation className="h-4 w-4 mr-1" />Directions</Button>
                              <Button variant="outline" size="sm"><Phone className="h-4 w-4 mr-1" />Call Customer</Button>
                              <QRScannerButton orderId={order.id} onComplete={() => handleCompleteDelivery(order.id)} />
                            </>
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