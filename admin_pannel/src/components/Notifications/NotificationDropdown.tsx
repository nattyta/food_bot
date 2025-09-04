import { useState } from 'react';
import { Bell, Clock, CheckCircle, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Notification {
  id: string;
  type: 'order' | 'delivery' | 'system';
  title: string;
  message: string;
  time: string;
  read: boolean;
  urgent?: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'order',
    title: 'New Order #ORD-004',
    message: 'Pizza Margherita from John Doe',
    time: '2 min ago',
    read: false,
    urgent: true,
  },
  {
    id: '2',
    type: 'delivery',
    title: 'Delivery Completed',
    message: 'Order #ORD-001 delivered successfully',
    time: '15 min ago',
    read: false,
  },
  {
    id: '3',
    type: 'order',
    title: 'Order Ready',
    message: 'Order #ORD-002 is ready for pickup',
    time: '30 min ago',
    read: true,
  },
  {
    id: '4',
    type: 'system',
    title: 'Kitchen Alert',
    message: 'Low stock: Mozzarella cheese',
    time: '1 hour ago',
    read: true,
  },
];

export const NotificationDropdown = () => {
  const [notifications, setNotifications] = useState(mockNotifications);
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getIcon = (type: string, urgent?: boolean) => {
    if (urgent) return <AlertCircle className="h-4 w-4 text-destructive" />;
    
    switch (type) {
      case 'order': return <Clock className="h-4 w-4 text-primary" />;
      case 'delivery': return <CheckCircle className="h-4 w-4 text-success" />;
      default: return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-3">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No notifications</p>
          </div>
        ) : (
          <ScrollArea className="h-80">
            {notifications.map((notification) => (
              <div key={notification.id}>
                <DropdownMenuItem 
                  className={`p-3 cursor-pointer ${!notification.read ? 'bg-primary/5' : ''}`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start space-x-3 w-full">
                    <div className="mt-1">
                      {getIcon(notification.type, notification.urgent)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">
                          {notification.title}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNotification(notification.id);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {notification.time}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                    )}
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </div>
            ))}
          </ScrollArea>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem className="p-3 text-center text-primary cursor-pointer">
          View all notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};