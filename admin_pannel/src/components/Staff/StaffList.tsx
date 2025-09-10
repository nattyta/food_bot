import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Trash2, Phone, MessageCircle, Star, Clock } from 'lucide-react';
import { Staff } from '@/pages/StaffManagement';

interface StaffListProps {
  staff: Staff[];
  isLoading?: boolean;
  onEdit: (staff: Staff) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string) => void;
}

export const StaffList = ({ staff, isLoading = false, onEdit, onDelete, onToggleStatus }: StaffListProps) => {
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'kitchen': return 'secondary';
      case 'delivery': return 'default';
      case 'manager': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    return status === 'active' ? 'default' : 'secondary';
  };

  const formatLastActive = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'kitchen': return 'Kitchen';
      case 'delivery': return 'Delivery';
      case 'manager': return 'Manager';
      default: return role;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span>Staff Overview</span>
          <Badge variant="secondary">{staff.length} Total</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name & Role</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Performance</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-medium">{member.name}</p>
                    <Badge variant={getRoleBadgeVariant(member.role)}>
                      {getRoleDisplayName(member.role)}
                    </Badge>
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1 text-sm">
                      <Phone className="h-3 w-3" />
                      <span>{member.phone}</span>
                    </div>
                    {member.telegramId && (
                      <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                        <MessageCircle className="h-3 w-3" />
                        <span>{member.telegramId}</span>
                      </div>
                    )}
                  </div>
                </TableCell>
                
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggleStatus(member.id)}
                  >
                    <Badge variant={getStatusBadgeVariant(member.status)}>
                      {member.status}
                    </Badge>
                  </Button>
                </TableCell>
                
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1 text-sm">
                      <span className="font-medium">{member.ordersHandled}</span>
                      <span className="text-muted-foreground">orders</span>
                    </div>
                    <div className="flex items-center space-x-1 text-sm">
                      <Star className="h-3 w-3 text-warning" />
                      <span>{member.rating.toFixed(1)}</span>
                    </div>
                    {member.averageTime && (
                      <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{member.averageTime}min avg</span>
                      </div>
                    )}
                  </div>
                </TableCell>
                
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {formatLastActive(member.lastActive)}
                  </span>
                </TableCell>
                
                <TableCell className="text-right">
                  <div className="flex space-x-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(member)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(member.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};