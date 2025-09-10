import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, Clock, CheckCircle, AlertCircle, Eye } from 'lucide-react';
import { useAuthWithToken } from '@/hooks/useAuth'; // Use the correct auth hook
import { ordersApi } from '@/api/orders';
import { Order } from '@/api/types'; // Your Order type
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

// Helper functions (can remain as they are)
const getStatusColor = (status: Order['status']) => {
  switch (status) {
    case 'pending': return 'bg-yellow-500/20 text-yellow-500';
    case 'preparing': return 'bg-blue-500/20 text-blue-500';
    case 'ready': return 'bg-green-500/20 text-green-500';
    case 'completed': return 'bg-gray-500/20 text-gray-500';
    default: return 'bg-gray-500/20 text-gray-500';
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
  const { token } = useAuthWithToken();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // --- LIVE DATA FETCHING ---
  // useQuery fetches orders based on the active tab (status filter)
  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: ['orders', activeTab],
    queryFn: () => ordersApi.getAll(token!, activeTab),
    enabled: !!token, // Only fetch if the user is logged in
    refetchInterval: 15000, // Automatically refetch every 15 seconds for live updates
  });

  // --- LIVE STATUS UPDATES ---
  // useMutation handles the API call to update an order's status
  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: Order['status'] }) =>
      ordersApi.updateStatus(token!, orderId, status),
    onSuccess: () => {
      // When a mutation is successful, invalidate the 'orders' query
      // This tells react-query to refetch the data and update the UI automatically
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({ title: 'Success', description: 'Order status has been updated.' });
    },
    onError: (err) => {
      toast({
        title: 'Update Failed',
        description: `Could not update order status: ${err.message}`,
        variant: 'destructive',
      });
    }
  });

  const handleUpdateStatus = (orderId: string, newStatus: Order['status']) => {
    // Call the mutation to trigger the API call
    updateStatusMutation.mutate({ orderId, status: newStatus });
  };

  // Client-side search filtering on the fetched data
  const filteredOrders = orders.filter(order =>
    order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header and Search Bar (your existing JSX is fine) */}
      <div className="flex items-center justify-between">
        {/* ... */}
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
            {isLoading ? (
              // Display skeletons while the initial data is loading
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-lg" />)
            ) : error ? (
              <div className="text-destructive text-center py-8">Error loading orders: {error.message}</div>
            ) : filteredOrders.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">No orders found for this status.</div>
            ) : (
              filteredOrders.map((order, index) => {
                const StatusIcon = getStatusIcon(order.status);
                return (
                  <Card 
                    key={order.id}
                    className="animate-slide-in hover:shadow-lg transition-shadow duration-200"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center space-x-4">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <StatusIcon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2 flex-wrap">
                              <h3 className="font-semibold">{order.id}</h3>
                              <Badge variant="outline" className="text-xs">{order.type}</Badge>
                              <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {order.customerName} • {order.customerPhone}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Order time: {order.orderTime} • Est: {order.estimatedTime}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4 w-full sm:w-auto">
                          <div className="text-right flex-grow">
                            <p className="font-semibold">${order.total.toFixed(2)}</p>
                            <p className="text-sm text-muted-foreground">
                              {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button variant="outline" size="sm"><Eye className="h-4 w-4" /></Button>
                            
                            {order.status === 'pending' && (
                              <Button size="sm" onClick={() => handleUpdateStatus(order.id, 'preparing')} disabled={updateStatusMutation.isPending}>
                                Start Preparing
                              </Button>
                            )}
                            
                            {order.status === 'preparing' && (
                              <Button size="sm" onClick={() => handleUpdateStatus(order.id, 'ready')} disabled={updateStatusMutation.isPending}>
                                Mark Ready
                              </Button>
                            )}
                            
                            {order.status === 'ready' && (
                              <Button size="sm" onClick={() => handleUpdateStatus(order.id, 'completed')} disabled={updateStatusMutation.isPending}>
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
              })
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Orders;