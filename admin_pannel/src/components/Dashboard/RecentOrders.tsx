import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, MoreHorizontal } from 'lucide-react';
import { useAuthWithToken } from '@/hooks/useAuth';
import { dashboardApi } from '@/api/dashboard';


const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'status-pending';
    case 'preparing': return 'status-preparing';
    case 'ready': return 'status-ready';
    case 'completed': return 'status-completed';
    default: return 'status-pending';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'pending': return 'Pending';
    case 'preparing': return 'Preparing';
    case 'ready': return 'Ready';
    case 'completed': return 'Completed';
    default: return 'Unknown';
  }
};

export const RecentOrders = () => {
  const { token } = useAuthWithToken();

  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: ['recent-orders'],
    queryFn: () => dashboardApi.getRecentOrders(token!, 5),
    enabled: !!token,
  });

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / 60000);
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} min ago`;
    } else {
      const diffInHours = Math.floor(diffInMinutes / 60);
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    }
  };

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
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-4 rounded-lg border border-border animate-pulse"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right space-y-2">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </div>
            ))
          ) : error ? (
            <div className="text-center text-destructive py-4">
              Error loading recent orders: {error.message}
            </div>
          ) : orders.map((order, index) => (
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
                    {order.items.map(item => item.menuItemName).join(', ')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="font-semibold text-sm">${order.total.toFixed(2)}</p>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatTime(order.createdAt)}
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