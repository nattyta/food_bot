import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Edit, Trash2, Users, TrendingUp, Clock, Star } from 'lucide-react';
import { StaffForm } from '@/components/Staff/StaffForm';
import { StaffList } from '@/components/Staff/StaffList';
import { StaffStats } from '@/components/Staff/StaffStats';
import { StaffPerformance } from '@/components/Staff/StaffPerformance';
import { AssignOrderDialog } from '@/components/Staff/AssignOrderDialog';
import { useAuthWithToken } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { staffApi } from '@/api/staff';
import { Staff } from '@/api/types';

export type StaffRole = 'kitchen' | 'delivery' | 'manager';
export type StaffStatus = 'active' | 'inactive';

// Re-export Staff type for components
export type { Staff } from '@/api/types';

const StaffManagement = () => {
  const { token } = useAuthWithToken();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [showAssignOrder, setShowAssignOrder] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'assign'>('overview');

  // Fetch staff data
  const { data: staff = [], isLoading, error } = useQuery({
    queryKey: ['staff'],
    queryFn: () => staffApi.getAll(token!),
    enabled: !!token,
  });

  // Create staff mutation
  const createStaffMutation = useMutation({
    mutationFn: (newStaff: Omit<Staff, 'id' | 'ordersHandled' | 'rating' | 'lastActive'> & { password: string }) =>
      staffApi.create(token!, newStaff),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setShowForm(false);
      toast({
        title: "Success",
        description: "Staff member created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create staff member: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update staff mutation
  const updateStaffMutation = useMutation({
    mutationFn: ({ staffId, staffData }: { staffId: string; staffData: Partial<Staff> }) =>
      staffApi.update(token!, staffId, staffData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setEditingStaff(null);
      setShowForm(false);
      toast({
        title: "Success",
        description: "Staff member updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update staff member: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete staff mutation
  const deleteStaffMutation = useMutation({
    mutationFn: (staffId: string) => staffApi.delete(token!, staffId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast({
        title: "Success",
        description: "Staff member deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete staff member: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleAddStaff = (newStaff: Omit<Staff, 'id' | 'ordersHandled' | 'rating' | 'lastActive'>) => {
    createStaffMutation.mutate({ ...newStaff, password: 'defaultPassword123' });
  };

  const handleEditStaff = (updatedStaff: Staff) => {
    updateStaffMutation.mutate({ staffId: updatedStaff.id, staffData: updatedStaff });
  };

  const handleDeleteStaff = (id: string) => {
    deleteStaffMutation.mutate(id);
  };

  const handleToggleStatus = (id: string) => {
    const staffMember = staff.find(s => s.id === id);
    if (staffMember) {
      const newStatus = staffMember.status === 'active' ? 'inactive' : 'active';
      updateStaffMutation.mutate({ staffId: id, staffData: { status: newStatus } });
    }
  };

  const totalStaff = staff.length;
  const activeStaff = staff.filter(s => s.status === 'active').length;
  const totalOrders = staff.reduce((sum, s) => sum + s.ordersHandled, 0);
  const avgRating = staff.length > 0 ? staff.reduce((sum, s) => sum + s.rating, 0) / staff.length : 0;

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-destructive">
          Error loading staff data: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Staff Management</h1>
          <p className="text-muted-foreground">Manage your restaurant staff and track performance</p>
        </div>
        <Button 
          onClick={() => {
            setEditingStaff(null);
            setShowForm(true);
          }}
          className="bg-primary hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Staff
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-5 w-5 rounded" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-8" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Staff</p>
                    <p className="text-2xl font-bold">{totalStaff}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <div className="h-3 w-3 bg-success rounded-full"></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Staff</p>
                    <p className="text-2xl font-bold">{activeStaff}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-secondary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                    <p className="text-2xl font-bold">{totalOrders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Star className="h-5 w-5 text-warning" />
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Rating</p>
                    <p className="text-2xl font-bold">{avgRating.toFixed(1)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === 'overview' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('overview')}
        >
          Staff Overview
        </Button>
        <Button
          variant={activeTab === 'performance' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('performance')}
        >
          Performance
        </Button>
        <Button
          variant={activeTab === 'assign' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('assign')}
        >
          Assign Orders
        </Button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <StaffList 
              staff={staff}
              isLoading={isLoading}
              onEdit={(staff) => {
                setEditingStaff(staff);
                setShowForm(true);
              }}
              onDelete={handleDeleteStaff}
              onToggleStatus={handleToggleStatus}
            />
          </div>
          <div>
            <StaffStats staff={staff} isLoading={isLoading} />
          </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <StaffPerformance staff={staff} isLoading={isLoading} />
      )}

      {activeTab === 'assign' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Order Assignment</h2>
            <Button onClick={() => setShowAssignOrder(true)}>
              Assign New Order
            </Button>
          </div>
          {/* Order assignment content */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Order Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium">ORD</span>
                    </div>
                    <div>
                      <p className="font-medium">Order #ORD-001</p>
                      <p className="text-sm text-muted-foreground">Pizza Margherita - $24.00</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">Mike Johnson</p>
                    <Badge className="status-preparing">Assigned</Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium">ORD</span>
                    </div>
                    <div>
                      <p className="font-medium">Order #ORD-002</p>
                      <p className="text-sm text-muted-foreground">Burger Deluxe - $18.50</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">Sarah Wilson</p>
                    <Badge className="status-ready">On Delivery</Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium">ORD</span>
                    </div>
                    <div>
                      <p className="font-medium">Order #ORD-003</p>
                      <p className="text-sm text-muted-foreground">Caesar Salad - $12.99</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">Emily Davis</p>
                    <Badge className="status-completed">Delivered</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Staff Form Dialog */}
      {showForm && (
        <StaffForm
          staff={editingStaff}
          onSave={editingStaff ? handleEditStaff : handleAddStaff}
          onClose={() => {
            setShowForm(false);
            setEditingStaff(null);
          }}
        />
      )}

      {/* Assign Order Dialog */}
      {showAssignOrder && (
        <AssignOrderDialog
          staff={staff.filter(s => s.status === 'active')}
          onClose={() => setShowAssignOrder(false)}
          onAssign={(orderId, staffId) => {
            // Handle order assignment
            console.log('Assigning order', orderId, 'to staff', staffId);
            setShowAssignOrder(false);
          }}
        />
      )}
    </div>
  );
};

export default StaffManagement;