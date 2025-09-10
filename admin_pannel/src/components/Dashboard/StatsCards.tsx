import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ClipboardList, 
  Clock, 
  CheckCircle, 
  DollarSign,
  TrendingUp,
  Users
} from 'lucide-react';
import { useAuthWithToken } from '@/hooks/useAuth';
import { dashboardApi } from '@/api/dashboard';

interface StatCard {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

export const StatsCards = () => {
  const { token } = useAuthWithToken();

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.getStats(token!),
    enabled: !!token,
  });

  const statsData: StatCard[] = stats ? [
    {
      title: 'Active Orders',
      value: stats.activeOrders.toString(),
      change: stats.activeOrdersChange,
      trend: 'up',
      icon: ClipboardList,
      description: 'Orders being prepared',
    },
    {
      title: 'Avg. Prep Time',
      value: stats.avgPrepTime,
      change: stats.avgPrepTimeChange,
      trend: 'up',
      icon: Clock,
      description: 'Average preparation time',
    },
    {
      title: 'Completed Today',
      value: stats.completedToday.toString(),
      change: stats.completedTodayChange,
      trend: 'up',
      icon: CheckCircle,
      description: 'Orders completed today',
    },
    {
      title: 'Revenue Today',
      value: stats.revenueToday,
      change: stats.revenueTodayChange,
      trend: 'up',
      icon: DollarSign,
      description: 'Total revenue today',
    },
  ] : [];

  if (error) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="col-span-full text-center text-destructive">
          Error loading dashboard stats: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {isLoading ? (
        Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-6 w-16 mb-2" />
              <div className="flex items-center space-x-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-3 w-20" />
              </div>
            </CardContent>
          </Card>
        ))
      ) : statsData.map((stat, index) => (
        <Card 
          key={stat.title} 
          className="animate-fade-in hover:shadow-elegant transition-all duration-200 hover:-translate-y-1"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg">
              <stat.icon className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground mb-1">
              {stat.value}
            </div>
            <div className="flex items-center space-x-2">
              <Badge 
                variant={stat.trend === 'up' ? 'default' : 'secondary'}
                className={`text-xs ${stat.trend === 'up' ? 'bg-success/10 text-success hover:bg-success/20' : ''}`}
              >
                <TrendingUp className="h-3 w-3 mr-1" />
                {stat.change}
              </Badge>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};