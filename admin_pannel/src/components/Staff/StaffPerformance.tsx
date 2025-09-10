import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Staff } from '@/pages/StaffManagement';
import { TrendingUp, Clock, Star, DollarSign, Target, Award } from 'lucide-react';

interface StaffPerformanceProps {
  staff: Staff[];
  isLoading?: boolean;
}

export const StaffPerformance = ({ staff, isLoading = false }: StaffPerformanceProps) => {
  const kitchenStaff = staff.filter(s => s.role === 'kitchen' && s.status === 'active');
  const deliveryStaff = staff.filter(s => s.role === 'delivery' && s.status === 'active');
  
  // Kitchen performance metrics
  const avgKitchenTime = kitchenStaff.reduce((sum, s) => sum + (s.averageTime || 0), 0) / Math.max(kitchenStaff.length, 1);
  const totalKitchenOrders = kitchenStaff.reduce((sum, s) => sum + s.ordersHandled, 0);
  const avgKitchenRating = kitchenStaff.reduce((sum, s) => sum + s.rating, 0) / Math.max(kitchenStaff.length, 1);
  
  // Delivery performance metrics
  const avgDeliveryTime = deliveryStaff.reduce((sum, s) => sum + (s.averageTime || 0), 0) / Math.max(deliveryStaff.length, 1);
  const totalDeliveryOrders = deliveryStaff.reduce((sum, s) => sum + s.ordersHandled, 0);
  const avgDeliveryRating = deliveryStaff.reduce((sum, s) => sum + s.rating, 0) / Math.max(deliveryStaff.length, 1);
  const totalEarnings = deliveryStaff.reduce((sum, s) => sum + (s.totalEarnings || 0), 0);

  return (
    <div className="space-y-6">
      {/* Overall Performance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{totalKitchenOrders + totalDeliveryOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-secondary" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Service Time</p>
                <p className="text-2xl font-bold">{Math.round((avgKitchenTime + avgDeliveryTime) / 2)}min</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Star className="h-5 w-5 text-warning" />
              <div>
                <p className="text-sm text-muted-foreground">Overall Rating</p>
                <p className="text-2xl font-bold">{((avgKitchenRating + avgDeliveryRating) / 2).toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kitchen Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Award className="h-5 w-5 text-secondary" />
            <span>Kitchen Staff Performance</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-secondary">{totalKitchenOrders}</p>
              <p className="text-sm text-muted-foreground">Orders Processed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{avgKitchenTime.toFixed(1)}min</p>
              <p className="text-sm text-muted-foreground">Avg Prep Time</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-warning">{avgKitchenRating.toFixed(1)}</p>
              <p className="text-sm text-muted-foreground">Avg Rating</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {kitchenStaff.map((member) => (
              <div key={member.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium">{member.name}</h4>
                    <Badge variant="secondary">Kitchen Staff</Badge>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-warning" />
                      <span className="font-medium">{member.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Orders Processed</p>
                    <p className="font-medium">{member.ordersHandled}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Avg Prep Time</p>
                    <p className="font-medium">{member.averageTime || 0}min</p>
                  </div>
                </div>
                
                <div className="mt-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-muted-foreground">Performance</span>
                    <span className="text-sm">{((member.rating / 5) * 100).toFixed(0)}%</span>
                  </div>
                  <Progress value={(member.rating / 5) * 100} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Delivery Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span>Delivery Staff Performance</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{totalDeliveryOrders}</p>
              <p className="text-sm text-muted-foreground">Orders Delivered</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-secondary">{avgDeliveryTime.toFixed(1)}min</p>
              <p className="text-sm text-muted-foreground">Avg Delivery Time</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-warning">{avgDeliveryRating.toFixed(1)}</p>
              <p className="text-sm text-muted-foreground">Avg Rating</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-success">${totalEarnings}</p>
              <p className="text-sm text-muted-foreground">Total Earnings</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {deliveryStaff.map((member) => (
              <div key={member.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium">{member.name}</h4>
                    <Badge variant="default">Delivery Staff</Badge>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-warning" />
                      <span className="font-medium">{member.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Deliveries</p>
                    <p className="font-medium">{member.ordersHandled}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Avg Time</p>
                    <p className="font-medium">{member.averageTime || 0}min</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Earnings</p>
                    <p className="font-medium">${member.totalEarnings || 0}</p>
                  </div>
                </div>
                
                <div className="mt-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-muted-foreground">Performance</span>
                    <span className="text-sm">{((member.rating / 5) * 100).toFixed(0)}%</span>
                  </div>
                  <Progress value={(member.rating / 5) * 100} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};