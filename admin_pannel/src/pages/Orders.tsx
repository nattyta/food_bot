import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Clock, CheckCircle, AlertCircle, Eye, Truck, XCircle } from 'lucide-react';
import { useAuthWithToken } from '@/hooks/useAuth';
import { ordersApi } from '@/api/orders';
import { Order, OrderItem, OrderStatus } from '@/api/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { OrderDetailsModal } from '@/components/Order/OrderDetailsModal'; // Import the new modal component

// Helper function to map your API status to colors
const getStatusColor = (status: OrderStatus) => {
  switch (status) {
    case 'pending': return 'bg-yellow-500/20 text-yellow-500';
    case 'preparing': return 'bg-blue-500/20 text-blue-500';
    case 'ready': return 'bg-teal-500/20 text-teal-500';
    case 'on_the_way': return 'bg-indigo-500/20 text-indigo-500';
    case 'delivered': return 'bg-green-500/20 text-green-500';
    case 'cancelled': return 'bg-red-500/20 text-red-500';
    default: return 'bg-gray-500/20 text-gray-500';
  }
};

// Helper function to map your API status to icons
const getStatusIcon = (status: OrderStatus) => {
  switch (status) {
    case 'pending': return AlertCircle;
    case 'preparing': return Clock;
    case 'ready': return CheckCircle;
    case 'on_the_way': return Truck;
    case 'delivered': return CheckCircle;
    case 'cancelled': return XCircle;
    default: return Clock;
  }
};

const Orders = () => {
  const { token } = useAuthWithToken();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<OrderStatus | 'all'>('all');
  
  // State to manage which order is selected for the modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Fetch orders based on the active tab using react-query
  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: ['orders', activeTab],
    queryFn: () => ordersApi.getAll(token!, activeTab === 'all' ? undefined : activeTab),
    enabled: !!token,
    refetchInterval: 15000,
  });

  // Mutation for updating an order's status
  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) =>
      ordersApi.updateStatus(token!, orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({ title: "Success", description: "Order status has been updated." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: `Failed to update status: ${err.message}`, variant: "destructive" });
    },
  });
  
  const handleUpdateStatus = (orderId: string, newStatus: OrderStatus) => {
    updateStatusMutation.mutate({ orderId, status: newStatus });
  };

  // Client-side filtering of the fetched orders
  const filteredOrders = orders.filter(order =>
    (order.customerName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (order.id?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );
  
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Orders</h1>
          <p className="text-muted-foreground mt-1">Manage and track all incoming orders</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by Order ID or Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-64"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as OrderStatus | 'all')}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="preparing">Preparing</TabsTrigger>
          <TabsTrigger value="ready">Ready</TabsTrigger>
          <TabsTrigger value="on_the_way">On the Way</TabsTrigger>
          <TabsTrigger value="delivered">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="grid gap-4">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-52 w-full rounded-lg" />)
            ) : error ? (
              <div className="text-destructive text-center py-8 col-span-full">Error: {(error as Error).message}</div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 col-span-full">No orders found for this status.</div>
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
                          <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                            <StatusIcon className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                              <h3 className="font-semibold">{order.id}</h3>
                              <Badge variant="outline" className="text-xs capitalize">{order.type?.replace('_', ' ')}</Badge>
                              <Badge className={`${getStatusColor(order.status)} capitalize`}>{order.status.replace('_', ' ')}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {order.customerName} • {order.customerPhone}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Order time: {format(new Date(order.createdAt), "h:mm a")}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4 w-full sm:w-auto self-end sm:self-center">
                          <div className="text-right flex-grow">
                            <p className="font-semibold text-lg">${order.total.toFixed(2)}</p>
                            <p className="text-sm text-muted-foreground">
                              {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            {order.status === 'pending' && (
                              <Button size="sm" onClick={() => handleUpdateStatus(order.id, 'preparing')} disabled={updateStatusMutation.isPending}>
                                Accept Order
                              </Button>
                            )}
                            
                            {order.status === 'preparing' && (
                              <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => handleUpdateStatus(order.id, 'ready')} disabled={updateStatusMutation.isPending}>
                                Mark as Ready
                              </Button>
                            )}
                            
                            {order.status === 'ready' && (
                              <Button size="sm" className="bg-teal-600 hover:bg-teal-700" onClick={() => handleUpdateStatus(order.id, 'on_the_way')} disabled={updateStatusMutation.isPending}>
                                Assign Delivery
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                        <h4 className="text-sm font-medium mb-2">Items:</h4>
                        <div className="space-y-1">
                          {Array.isArray(order.items) && order.items.map((item: OrderItem, idx: number) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span>{item.quantity}x {item.menuItemName}</span>
                              <span className="font-mono">
                                ${typeof item.price === 'number' ? (item.price * item.quantity).toFixed(2) : '0.00'}
                              </span>
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

      <OrderDetailsModal 
        order={selectedOrder} 
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSelectedOrder(null);
          }
        }} 
      />
    </div>
  );
};

export default Orders;