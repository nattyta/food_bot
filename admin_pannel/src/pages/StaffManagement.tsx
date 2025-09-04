import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Users, TrendingUp, Clock, Star } from 'lucide-react';
import { StaffForm } from '@/components/Staff/StaffForm';
import { StaffList } from '@/components/Staff/StaffList';
import { StaffStats } from '@/components/Staff/StaffStats';
import { StaffPerformance } from '@/components/Staff/StaffPerformance';
import { AssignOrderDialog } from '@/components/Staff/AssignOrderDialog';

export type StaffRole = 'kitchen' | 'delivery' | 'manager';
export type StaffStatus = 'active' | 'inactive';

export interface Staff {
  id: string;
  name: string;
  role: StaffRole;
  phone: string;
  telegramId?: string;
  status: StaffStatus;
  ordersHandled: number;
  rating: number;
  lastActive: Date;
  averageTime?: number; // in minutes
  totalEarnings?: number;
}

// Mock data
const mockStaff: Staff[] = [
  {
    id: '1',
    name: 'John Smith',
    role: 'kitchen',
    phone: '+1234567890',
    telegramId: '@johnsmith',
    status: 'active',
    ordersHandled: 45,
    rating: 4.8,
    lastActive: new Date(Date.now() - 30 * 60 * 1000), // 30 mins ago
    averageTime: 12
  },
  {
    id: '2',
    name: 'Sarah Wilson',
    role: 'delivery',
    phone: '+1234567891',
    status: 'active',
    ordersHandled: 32,
    rating: 4.9,
    lastActive: new Date(Date.now() - 5 * 60 * 1000), // 5 mins ago
    averageTime: 18,
    totalEarnings: 450
  },
  {
    id: '3',
    name: 'Mike Johnson',
    role: 'manager',
    phone: '+1234567892',
    telegramId: '@mikej',
    status: 'active',
    ordersHandled: 120,
    rating: 4.7,
    lastActive: new Date(Date.now() - 2 * 60 * 1000), // 2 mins ago
  }
];

const StaffManagement = () => {
  const [staff, setStaff] = useState<Staff[]>(mockStaff);
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [showAssignOrder, setShowAssignOrder] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'assign'>('overview');

  const handleAddStaff = (newStaff: Omit<Staff, 'id' | 'ordersHandled' | 'rating' | 'lastActive'>) => {
    const staff: Staff = {
      ...newStaff,
      id: Date.now().toString(),
      ordersHandled: 0,
      rating: 5.0,
      lastActive: new Date()
    };
    setStaff(prev => [...prev, staff]);
    setShowForm(false);
  };

  const handleEditStaff = (updatedStaff: Staff) => {
    setStaff(prev => prev.map(s => s.id === updatedStaff.id ? updatedStaff : s));
    setEditingStaff(null);
    setShowForm(false);
  };

  const handleDeleteStaff = (id: string) => {
    setStaff(prev => prev.filter(s => s.id !== id));
  };

  const handleToggleStatus = (id: string) => {
    setStaff(prev => prev.map(s => 
      s.id === id 
        ? { ...s, status: s.status === 'active' ? 'inactive' : 'active' }
        : s
    ));
  };

  const totalStaff = staff.length;
  const activeStaff = staff.filter(s => s.status === 'active').length;
  const totalOrders = staff.reduce((sum, s) => sum + s.ordersHandled, 0);
  const avgRating = staff.reduce((sum, s) => sum + s.rating, 0) / staff.length;

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
              onEdit={(staff) => {
                setEditingStaff(staff);
                setShowForm(true);
              }}
              onDelete={handleDeleteStaff}
              onToggleStatus={handleToggleStatus}
            />
          </div>
          <div>
            <StaffStats staff={staff} />
          </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <StaffPerformance staff={staff} />
      )}

      {activeTab === 'assign' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Order Assignment</h2>
            <Button onClick={() => setShowAssignOrder(true)}>
              Assign New Order
            </Button>
          </div>
          {/* Order assignment content would go here */}
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">Order assignment interface coming soon...</p>
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