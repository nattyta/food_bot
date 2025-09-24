import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Truck, MapPin, CheckCircle, Package, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ordersApi } from '@/api/orders';
import { Order as DeliveryOrder, OrderStatus } from '@/api/types';
import { QRScannerButton } from '@/components/Delivery/QRScannerButton';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

const getStatusColor = (status: OrderStatus) => {
  switch (status) {
    case 'ready': return 'bg-blue-500/20 text-blue-500';
    case 'on_the_way': return 'bg-yellow-500/20 text-yellow-500';
    case 'delivered': return 'bg-green-500/20 text-green-500';
    default: return 'bg-gray-500/20 text-gray-500';
  }
};

const DeliveryDashboard = () => {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('available');

  // --- DATA FETCHING (Approach A: Separate Queries) ---
  const { data: availableOrdersData = [], isLoading: isLoadingAvailable, error: availableError } = useQuery({
    queryKey: ['delivery', 'available'],
    queryFn: () => ordersApi.getAvailableDeliveries(token!),
    enabled: !!token,
    refetchInterval: 20000,
  });

  const { data: myDeliveriesData = [], isLoading: isLoadingMyDeliveries, error: myDeliveriesError } = useQuery({
    queryKey: ['delivery', 'myDeliveries'],
    queryFn: () => ordersApi.getMyDeliveries(token!),
    enabled: !!token,
    refetchInterval: 20000,
  });

  // Combine loading and error states for a single status display
  const isLoading = isLoadingAvailable || isLoadingMyDeliveries;
  const error = availableError || myDeliveriesError;

  const acceptMutation = useMutation({
    mutationFn: (orderId: string) => ordersApi.acceptDelivery(token!, orderId),
    onSuccess: () => {
      toast({ title: "Order Accepted!" });
      queryClient.invalidateQueries({ queryKey: ['delivery'] });
      setActiveTab('my-deliveries');
    },
    onError: (err: Error) => {
      toast({ title: "Failed to Accept", description: err.message, variant: "destructive" });
    },
  });
  
  const completeMutation = useMutation({
    mutationFn: (orderId: string) => ordersApi.updateStatus(token!, orderId, 'delivered'),
    onSuccess: () => {
      toast({ title: "Delivery Completed!" });
      queryClient.invalidateQueries({ queryKey: ['delivery'] });
    },
    onError: (err: Error) => { /* ... */ },
  });

  const handleAcceptDelivery = (orderId: string) => acceptMutation.mutate(orderId);
  const handleCompleteDelivery = (orderId: string) => completeMutation.mutate(orderId);
  
  const getFilteredList = (list: DeliveryOrder[]) => {
    if (!searchTerm) return list;
    const lowerSearch = searchTerm.toLowerCase();
    return list.filter(o => o.id.toLowerCase().includes(lowerSearch) || o.customerName.toLowerCase().includes(lowerSearch));
  };

  const availableOrders = getFilteredList(availableOrdersData);
  const myDeliveries = getFilteredList(myDeliveriesData);
  const completedDeliveries: DeliveryOrder[] = []; // This tab is not yet implemented

  const ordersToShow = activeTab === 'available' ? availableOrders :
                       activeTab === 'my-deliveries' ? myDeliveries :
                       completedDeliveries;
                       
  const availableCount = availableOrders.length;
  const activeCount = myDeliveries.length;

  if (error) {
    return <div className="p-6 text-center text-destructive">Error: {error.message}</div>;
  }
  
  return (  
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold flex items-center"><Truck className="mr-3 h-8 w-8 text-primary" />Delivery Dashboard</h1><p className="text-muted-foreground mt-1">Accept available orders and manage your deliveries</p></div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search orders..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 w-64" />
        </div>
      </div>
      
      {/* Performance stats are removed for the MVP, but can be added back here */}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="available">Available <Badge variant="secondary" className="ml-2">{availableCount}</Badge></TabsTrigger>
          <TabsTrigger value="my-deliveries">My Deliveries <Badge variant="secondary" className="ml-2">{activeCount}</Badge></TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="mt-6">
          <div className="grid gap-4">
            {isLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40" />) : 
              ordersToShow.length === 0 ? <div className="text-center text-muted-foreground py-16"><CheckCircle className="mx-auto h-12 w-12 text-gray-400" /> <p className="mt-2">No orders in this category.</p></div> :
              ordersToShow.map((order) => (
                <Card key={order.id}>
                  <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold">{order.id}</h3>
                        <Badge className={getStatusColor(order.status)}>{order.status.replace('_', ' ')}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center"><MapPin className="h-4 w-4 mr-2 flex-shrink-0" />{order.deliveryAddress}</p>
                      <p className="text-sm text-muted-foreground">{order.items.length} items • ${order.total.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Ordered at: {format(new Date(order.createdAt), "h:mm a")}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                      {order.status === 'ready' && <Button className="w-full" onClick={() => handleAcceptDelivery(order.id)} disabled={acceptMutation.isPending}>{acceptMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Accept Delivery'}</Button>}
                      {order.status === 'on_the_way' && <QRScannerButton orderId={order.id} onComplete={() => handleCompleteDelivery(order.id)} />}
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