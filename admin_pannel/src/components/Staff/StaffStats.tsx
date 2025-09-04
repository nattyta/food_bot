import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Staff } from '@/pages/StaffManagement';
import { TrendingUp, Users, Clock, Star } from 'lucide-react';

interface StaffStatsProps {
  staff: Staff[];
}

export const StaffStats = ({ staff }: StaffStatsProps) => {
  const kitchenStaff = staff.filter(s => s.role === 'kitchen');
  const deliveryStaff = staff.filter(s => s.role === 'delivery');
  const managerStaff = staff.filter(s => s.role === 'manager');
  
  const activeKitchen = kitchenStaff.filter(s => s.status === 'active').length;
  const activeDelivery = deliveryStaff.filter(s => s.status === 'active').length;
  const activeManagers = managerStaff.filter(s => s.status === 'active').length;
  
  const topPerformers = staff
    .filter(s => s.status === 'active')
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3);
    
  const recentlyActive = staff
    .filter(s => s.status === 'active')
    .sort((a, b) => b.lastActive.getTime() - a.lastActive.getTime())
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Staff Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Staff Distribution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Kitchen Staff</span>
              <Badge variant="secondary">{activeKitchen}/{kitchenStaff.length}</Badge>
            </div>
            <Progress value={(activeKitchen / Math.max(kitchenStaff.length, 1)) * 100} />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Delivery Staff</span>
              <Badge variant="default">{activeDelivery}/{deliveryStaff.length}</Badge>
            </div>
            <Progress value={(activeDelivery / Math.max(deliveryStaff.length, 1)) * 100} />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Managers</span>
              <Badge variant="destructive">{activeManagers}/{managerStaff.length}</Badge>
            </div>
            <Progress value={(activeManagers / Math.max(managerStaff.length, 1)) * 100} />
          </div>
        </CardContent>
      </Card>

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <Star className="h-5 w-5 text-warning" />
            <span>Top Performers</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topPerformers.map((performer, index) => (
              <div key={performer.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{performer.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{performer.role}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-1">
                    <Star className="h-3 w-3 text-warning" />
                    <span className="text-sm font-medium">{performer.rating.toFixed(1)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{performer.ordersHandled} orders</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <Clock className="h-5 w-5 text-primary" />
            <span>Recent Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentlyActive.map((member) => {
              const diffMs = new Date().getTime() - member.lastActive.getTime();
              const diffMins = Math.floor(diffMs / (1000 * 60));
              
              let timeText = 'Just now';
              if (diffMins >= 1 && diffMins < 60) timeText = `${diffMins}m ago`;
              else if (diffMins >= 60) timeText = `${Math.floor(diffMins / 60)}h ago`;
              
              return (
                <div key={member.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{member.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{timeText}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};