import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Staff, StaffRole, StaffStatus } from '@/pages/StaffManagement';

interface StaffFormProps {
  staff?: Staff | null;
  onSave: (staff: Staff | Omit<Staff, 'id' | 'ordersHandled' | 'rating' | 'lastActive'>) => void;
  onClose: () => void;
}

export const StaffForm = ({ staff, onSave, onClose }: StaffFormProps) => {
  const [formData, setFormData] = useState({
    name: '',
    role: 'kitchen' as StaffRole,
    phone: '',
    telegramId: '',
    status: 'active' as StaffStatus,
  });

  useEffect(() => {
    if (staff) {
      setFormData({
        name: staff.name,
        role: staff.role,
        phone: staff.phone,
        telegramId: staff.telegramId || '',
        status: staff.status,
      });
    }
  }, [staff]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (staff) {
      // Editing existing staff
      onSave({
        ...staff,
        ...formData,
        telegramId: formData.telegramId || undefined,
      });
    } else {
      // Adding new staff
      onSave({
        ...formData,
        telegramId: formData.telegramId || undefined,
      });
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{staff ? 'Edit Staff Member' : 'Add New Staff Member'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Enter staff name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => handleChange('role', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kitchen">Kitchen Staff</SelectItem>
                <SelectItem value="delivery">Delivery Person</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+1234567890"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telegramId">Telegram ID (Optional)</Label>
            <Input
              id="telegramId"
              value={formData.telegramId}
              onChange={(e) => handleChange('telegramId', e.target.value)}
              placeholder="@username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              {staff ? 'Update' : 'Add'} Staff
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};