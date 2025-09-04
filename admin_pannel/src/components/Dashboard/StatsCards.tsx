import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ClipboardList, 
  Clock, 
  CheckCircle, 
  DollarSign,
  TrendingUp,
  Users
} from 'lucide-react';

interface StatCard {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const statsData: StatCard[] = [
  {
    title: 'Active Orders',
    value: '23',
    change: '+12%',
    trend: 'up',
    icon: ClipboardList,
    description: 'Orders being prepared',
  },
  {
    title: 'Avg. Prep Time',
    value: '8.5m',
    change: '-2m',
    trend: 'up',
    icon: Clock,
    description: 'Average preparation time',
  },
  {
    title: 'Completed Today',
    value: '156',
    change: '+18%',
    trend: 'up',
    icon: CheckCircle,
    description: 'Orders completed today',
  },
  {
    title: 'Revenue Today',
    value: '$2,847',
    change: '+23%',
    trend: 'up',
    icon: DollarSign,
    description: 'Total revenue today',
  },
];

export const StatsCards = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsData.map((stat, index) => (
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