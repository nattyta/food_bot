import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Staff, StaffRole, StaffStatus } from '@/pages/StaffManagement'; // Assuming types are exported from here
import { useToast } from '@/hooks/use-toast';

// Define the shape of the data the form will save
type StaffSaveData = Omit<Staff, 'id' | 'ordersHandled' | 'rating' | 'lastActive'> & { password?: string };

interface StaffFormProps {
  staff?: Staff | null;
  onSave: (staff: StaffSaveData | Staff) => void;
  onClose: () => void;
}

export const StaffForm = ({ staff, onSave, onClose }: StaffFormProps) => {
  const { toast } = useToast();
  
  // A single state object for all form fields
  const [formData, setFormData] = useState({
    name: '',
    role: 'kitchen' as StaffRole,
    phone: '',
    telegramId: '',
    status: 'active' as StaffStatus,
    password: '',
  });

  useEffect(() => {
    if (staff) {
      // If we are editing, populate the form with existing staff data
      setFormData({
        name: staff.name,
        role: staff.role,
        phone: staff.phone,
        telegramId: staff.telegramId || '',
        status: staff.status,
        password: '', // Password is not shown or edited here
      });
    }
  }, [staff]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation: Password is required only for new staff members
    if (!staff && !formData.password) {
      toast({
        title: "Validation Error",
        description: "Password is required for new staff members.",
        variant: "destructive",
      });
      return;
    }

    if (staff) {
      // If editing, we pass back the full staff object with updated form data
      onSave({
        ...staff,
        name: formData.name,
        role: formData.role,
        phone: formData.phone,
        telegramId: formData.telegramId || undefined,
        status: formData.status,
      });
    } else {
      // If creating, we pass the formData object which includes the password
      onSave({
        ...formData,
        telegramId: formData.telegramId || undefined,
      });
    }
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{staff ? 'Edit Staff Member' : 'Add New Staff Member'}</DialogTitle>
          <DialogDescription>
            {staff ? "Update the details for this staff member." : "Fill in the details to add a new staff member."}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., John Doe"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select value={formData.role} onValueChange={(value) => handleChange('role', value)}>
              <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
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
              placeholder="e.g., +251912345678"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telegramId">Telegram ID (Optional)</Label>
            <Input
              id="telegramId"
              value={formData.telegramId}
              onChange={(e) => handleChange('telegramId', e.target.value)}
              placeholder="e.g., @johndoe"
            />
          </div>

          {/* Password field only shows when creating a NEW staff member */}
          {!staff && (
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="Enter initial password"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{staff ? 'Update Staff' : 'Add Staff'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};