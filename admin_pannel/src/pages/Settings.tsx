import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  CreditCard,
  Store,
  Palette,
  Globe,
  Mail,
  Phone,
  Clock,
  MapPin,
  Save,
  UserCheck,
  UserX
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Work Status for delivery staff
  const [workStatus, setWorkStatus] = useState({
    available: true,
    lastStatusChange: new Date().toISOString()
  });

  // Account Settings (for all roles)
  const [accountSettings, setAccountSettings] = useState({
    name: user?.name || '',
    phone: '+1 (555) 123-4567',
    email: user?.email || '',
    darkMode: false,
    language: 'en'
  });

  // Restaurant Settings
  const [restaurantSettings, setRestaurantSettings] = useState({
    name: 'FoodBot Restaurant',
    address: '123 Main Street, Downtown',
    phone: '+1 (555) 123-4567',
    email: 'info@foodbot.com',
    currency: 'USD',
    timezone: 'America/New_York',
    taxRate: '8.5',
    deliveryRadius: '5',
    minimumOrder: '15'
  });

  // Business Hours
  const [businessHours, setBusinessHours] = useState({
    monday: { open: '09:00', close: '22:00', closed: false },
    tuesday: { open: '09:00', close: '22:00', closed: false },
    wednesday: { open: '09:00', close: '22:00', closed: false },
    thursday: { open: '09:00', close: '22:00', closed: false },
    friday: { open: '09:00', close: '23:00', closed: false },
    saturday: { open: '10:00', close: '23:00', closed: false },
    sunday: { open: '10:00', close: '21:00', closed: false }
  });

  // Notification Settings
  const [notifications, setNotifications] = useState({
    newOrders: true,
    orderUpdates: true,
    deliveryAlerts: true,
    lowStock: true,
    dailyReports: false,
    weeklyReports: true,
    emailNotifications: true,
    smsNotifications: false
  });

  // Payment Settings
  const [paymentSettings, setPaymentSettings] = useState({
    cashEnabled: true,
    cardEnabled: true,
    digitalWalletEnabled: true,
    stripeConnected: false,
    paypalConnected: false
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "Settings saved",
        description: "Your settings have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  // Render role-based settings
  if (user?.role === 'staff') {
    return (
      <div className="p-6 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center">
              <SettingsIcon className="mr-3 h-8 w-8 text-primary" />
              Account Settings
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your account preferences
            </p>
          </div>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Update your personal information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={accountSettings.name}
                  onChange={(e) => setAccountSettings({...accountSettings, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={accountSettings.phone}
                  onChange={(e) => setAccountSettings({...accountSettings, phone: e.target.value})}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={accountSettings.email}
                onChange={(e) => setAccountSettings({...accountSettings, email: e.target.value})}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium">Security</h4>
              <Button variant="outline" className="w-full">
                <Shield className="h-4 w-4 mr-2" />
                Change Password
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user?.role === 'delivery') {
    return (
      <div className="p-6 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center">
              <SettingsIcon className="mr-3 h-8 w-8 text-primary" />
              Settings
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your work status and account settings
            </p>
          </div>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        <div className="space-y-6">
          {/* Work Status Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                {workStatus.available ? (
                  <UserCheck className="h-5 w-5 mr-2 text-green-500" />
                ) : (
                  <UserX className="h-5 w-5 mr-2 text-red-500" />
                )}
                Work Status
              </CardTitle>
              <CardDescription>
                Set your availability for delivery assignments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {workStatus.available ? (
                    <UserCheck className="h-5 w-5 text-green-500" />
                  ) : (
                    <UserX className="h-5 w-5 text-red-500" />
                  )}
                  <div>
                    <h4 className="font-medium">
                      {workStatus.available ? 'Available' : 'Not Available'}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {workStatus.available 
                        ? 'You can receive new delivery assignments' 
                        : 'You will not receive new delivery assignments'
                      }
                    </p>
                  </div>
                </div>
                <Switch
                  checked={workStatus.available}
                  onCheckedChange={(checked) => setWorkStatus({
                    ...workStatus, 
                    available: checked,
                    lastStatusChange: new Date().toISOString()
                  })}
                />
              </div>
              
              {workStatus.available && (
                <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    ✓ You're currently available for deliveries
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account Settings Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your personal information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={accountSettings.name}
                    onChange={(e) => setAccountSettings({...accountSettings, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={accountSettings.phone}
                    onChange={(e) => setAccountSettings({...accountSettings, phone: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={accountSettings.email}
                  onChange={(e) => setAccountSettings({...accountSettings, email: e.target.value})}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Security</h4>
                <Button variant="outline" className="w-full">
                  <Shield className="h-4 w-4 mr-2" />
                  Change Password / Reset Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Admin view (full settings)
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center">
            <SettingsIcon className="mr-3 h-8 w-8 text-primary" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your restaurant and account settings
          </p>
        </div>
        <Button onClick={handleSave} disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Tabs defaultValue="restaurant" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="restaurant">Restaurant</TabsTrigger>
          <TabsTrigger value="business-hours">Hours</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        <TabsContent value="restaurant" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Store className="h-5 w-5 mr-2" />
                Restaurant Information
              </CardTitle>
              <CardDescription>
                Basic information about your restaurant
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="restaurant-name">Restaurant Name</Label>
                  <Input
                    id="restaurant-name"
                    value={restaurantSettings.name}
                    onChange={(e) => setRestaurantSettings({...restaurantSettings, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={restaurantSettings.phone}
                    onChange={(e) => setRestaurantSettings({...restaurantSettings, phone: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={restaurantSettings.address}
                  onChange={(e) => setRestaurantSettings({...restaurantSettings, address: e.target.value})}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={restaurantSettings.email}
                    onChange={(e) => setRestaurantSettings({...restaurantSettings, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={restaurantSettings.currency} onValueChange={(value) => setRestaurantSettings({...restaurantSettings, currency: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tax-rate">Tax Rate (%)</Label>
                  <Input
                    id="tax-rate"
                    value={restaurantSettings.taxRate}
                    onChange={(e) => setRestaurantSettings({...restaurantSettings, taxRate: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delivery-radius">Delivery Radius (km)</Label>
                  <Input
                    id="delivery-radius"
                    value={restaurantSettings.deliveryRadius}
                    onChange={(e) => setRestaurantSettings({...restaurantSettings, deliveryRadius: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minimum-order">Minimum Order ($)</Label>
                  <Input
                    id="minimum-order"
                    value={restaurantSettings.minimumOrder}
                    onChange={(e) => setRestaurantSettings({...restaurantSettings, minimumOrder: e.target.value})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business-hours" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Business Hours
              </CardTitle>
              <CardDescription>
                Set your restaurant's operating hours for each day
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {days.map((day) => (
                <div key={day} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <div className="w-24 font-medium capitalize">{day}</div>
                  <Switch
                    checked={!businessHours[day].closed}
                    onCheckedChange={(checked) => 
                      setBusinessHours({
                        ...businessHours,
                        [day]: { ...businessHours[day], closed: !checked }
                      })
                    }
                  />
                  {!businessHours[day].closed ? (
                    <div className="flex items-center space-x-2">
                      <Input
                        type="time"
                        value={businessHours[day].open}
                        onChange={(e) => 
                          setBusinessHours({
                            ...businessHours,
                            [day]: { ...businessHours[day], open: e.target.value }
                          })
                        }
                        className="w-32"
                      />
                      <span>to</span>
                      <Input
                        type="time"
                        value={businessHours[day].close}
                        onChange={(e) => 
                          setBusinessHours({
                            ...businessHours,
                            [day]: { ...businessHours[day], close: e.target.value }
                          })
                        }
                        className="w-32"
                      />
                    </div>
                  ) : (
                    <Badge variant="secondary">Closed</Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose which notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <h4 className="font-medium">Order Notifications</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="new-orders">New Orders</Label>
                    <Switch
                      id="new-orders"
                      checked={notifications.newOrders}
                      onCheckedChange={(checked) => setNotifications({...notifications, newOrders: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="order-updates">Order Status Updates</Label>
                    <Switch
                      id="order-updates"
                      checked={notifications.orderUpdates}
                      onCheckedChange={(checked) => setNotifications({...notifications, orderUpdates: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="delivery-alerts">Delivery Alerts</Label>
                    <Switch
                      id="delivery-alerts"
                      checked={notifications.deliveryAlerts}
                      onCheckedChange={(checked) => setNotifications({...notifications, deliveryAlerts: checked})}
                    />
                  </div>
                </div>

                <Separator />

                <h4 className="font-medium">System Notifications</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="low-stock">Low Stock Alerts</Label>
                    <Switch
                      id="low-stock"
                      checked={notifications.lowStock}
                      onCheckedChange={(checked) => setNotifications({...notifications, lowStock: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="daily-reports">Daily Reports</Label>
                    <Switch
                      id="daily-reports"
                      checked={notifications.dailyReports}
                      onCheckedChange={(checked) => setNotifications({...notifications, dailyReports: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="weekly-reports">Weekly Reports</Label>
                    <Switch
                      id="weekly-reports"
                      checked={notifications.weeklyReports}
                      onCheckedChange={(checked) => setNotifications({...notifications, weeklyReports: checked})}
                    />
                  </div>
                </div>

                <Separator />

                <h4 className="font-medium">Delivery Methods</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email-notifications">Email Notifications</Label>
                    <Switch
                      id="email-notifications"
                      checked={notifications.emailNotifications}
                      onCheckedChange={(checked) => setNotifications({...notifications, emailNotifications: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sms-notifications">SMS Notifications</Label>
                    <Switch
                      id="sms-notifications"
                      checked={notifications.smsNotifications}
                      onCheckedChange={(checked) => setNotifications({...notifications, smsNotifications: checked})}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Payment Methods
              </CardTitle>
              <CardDescription>
                Configure payment options for your restaurant
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <div>
                      <h4 className="font-medium">Cash Payments</h4>
                      <p className="text-sm text-muted-foreground">Accept cash payments</p>
                    </div>
                  </div>
                  <Switch
                    checked={paymentSettings.cashEnabled}
                    onCheckedChange={(checked) => setPaymentSettings({...paymentSettings, cashEnabled: checked})}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <div>
                      <h4 className="font-medium">Card Payments</h4>
                      <p className="text-sm text-muted-foreground">Accept credit and debit cards</p>
                    </div>
                  </div>
                  <Switch
                    checked={paymentSettings.cardEnabled}
                    onCheckedChange={(checked) => setPaymentSettings({...paymentSettings, cardEnabled: checked})}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-primary" />
                    <div>
                      <h4 className="font-medium">Digital Wallets</h4>
                      <p className="text-sm text-muted-foreground">Apple Pay, Google Pay, etc.</p>
                    </div>
                  </div>
                  <Switch
                    checked={paymentSettings.digitalWalletEnabled}
                    onCheckedChange={(checked) => setPaymentSettings({...paymentSettings, digitalWalletEnabled: checked})}
                  />
                </div>

                <Separator />

                <h4 className="font-medium">Payment Gateways</h4>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                      <span className="text-xs font-bold text-blue-600">S</span>
                    </div>
                    <div>
                      <h4 className="font-medium">Stripe</h4>
                      <p className="text-sm text-muted-foreground">
                        {paymentSettings.stripeConnected ? 'Connected' : 'Not connected'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {paymentSettings.stripeConnected && (
                      <Badge className="status-completed">Connected</Badge>
                    )}
                    <Button variant="outline" size="sm">
                      {paymentSettings.stripeConnected ? 'Configure' : 'Connect'}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                      <span className="text-xs font-bold text-blue-600">P</span>
                    </div>
                    <div>
                      <h4 className="font-medium">PayPal</h4>
                      <p className="text-sm text-muted-foreground">
                        {paymentSettings.paypalConnected ? 'Connected' : 'Not connected'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {paymentSettings.paypalConnected && (
                      <Badge className="status-completed">Connected</Badge>
                    )}
                    <Button variant="outline" size="sm">
                      {paymentSettings.paypalConnected ? 'Configure' : 'Connect'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Account Information
              </CardTitle>
              <CardDescription>
                Manage your account settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="user-name">Name</Label>
                  <Input
                    id="user-name"
                    value={accountSettings.name}
                    onChange={(e) => setAccountSettings({...accountSettings, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user-phone">Phone</Label>
                  <Input
                    id="user-phone"
                    value={accountSettings.phone}
                    onChange={(e) => setAccountSettings({...accountSettings, phone: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-email">Email</Label>
                <Input
                  id="user-email"
                  type="email"
                  value={accountSettings.email}
                  onChange={(e) => setAccountSettings({...accountSettings, email: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-role">Role</Label>
                <Input
                  id="user-role"
                  value={user?.role || ''}
                  disabled
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Security</h4>
                <Button variant="outline" className="w-full">
                  <Shield className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
                <Button variant="outline" className="w-full">
                  <Mail className="h-4 w-4 mr-2" />
                  Change Email
                </Button>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Preferences</h4>
                <div className="flex items-center justify-between">
                  <Label htmlFor="dark-mode">Dark Mode</Label>
                  <Switch 
                    id="dark-mode" 
                    checked={accountSettings.darkMode}
                    onCheckedChange={(checked) => setAccountSettings({...accountSettings, darkMode: checked})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select 
                    value={accountSettings.language} 
                    onValueChange={(value) => setAccountSettings({...accountSettings, language: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium text-destructive">Danger Zone</h4>
                <Button variant="destructive" className="w-full">
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;