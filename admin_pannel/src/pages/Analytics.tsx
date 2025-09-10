import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Clock,
  ShoppingCart,
  Star,
  Calendar,
  Filter
} from 'lucide-react';
import { Bar, Line, Pie, ResponsiveContainer, BarChart, LineChart, PieChart, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const salesData = [
  { name: 'Mon', revenue: 2400, orders: 24 },
  { name: 'Tue', revenue: 1398, orders: 18 },
  { name: 'Wed', revenue: 9800, orders: 42 },
  { name: 'Thu', revenue: 3908, orders: 35 },
  { name: 'Fri', revenue: 4800, orders: 48 },
  { name: 'Sat', revenue: 3800, orders: 38 },
  { name: 'Sun', revenue: 4300, orders: 43 }
];

const popularItems = [
  { name: 'Burger Deluxe', value: 35, color: '#8884d8' },
  { name: 'Pizza Margherita', value: 25, color: '#82ca9d' },
  { name: 'Caesar Salad', value: 20, color: '#ffc658' },
  { name: 'Chicken Wings', value: 12, color: '#ff7300' },
  { name: 'Others', value: 8, color: '#00ff00' }
];

const orderTrends = [
  { time: '09:00', orders: 5 },
  { time: '10:00', orders: 8 },
  { time: '11:00', orders: 15 },
  { time: '12:00', orders: 35 },
  { time: '13:00', orders: 28 },
  { time: '14:00', orders: 22 },
  { time: '15:00', orders: 18 },
  { time: '16:00', orders: 12 },
  { time: '17:00', orders: 16 },
  { time: '18:00', orders: 25 },
  { time: '19:00', orders: 32 },
  { time: '20:00', orders: 28 },
  { time: '21:00', orders: 20 }
];

const Analytics = () => {
  const stats = {
    totalRevenue: 45280,
    totalOrders: 486,
    averageOrderValue: 32.50,
    topCustomers: 142,
    averageRating: 4.7,
    preparationTime: 18
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center">
            <BarChart3 className="mr-3 h-8 w-8 text-primary" />
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Business insights and performance metrics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Last 30 Days
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 text-success mr-1" />
                  <span className="text-xs text-success">+12.5%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-success/10">
                <ShoppingCart className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalOrders}</p>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 text-success mr-1" />
                  <span className="text-xs text-success">+8.2%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-warning/10">
                <DollarSign className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">${stats.averageOrderValue}</p>
                <p className="text-sm text-muted-foreground">Avg Order Value</p>
                <div className="flex items-center mt-1">
                  <TrendingDown className="h-3 w-3 text-destructive mr-1" />
                  <span className="text-xs text-destructive">-2.1%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-secondary/10">
                <Users className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.topCustomers}</p>
                <p className="text-sm text-muted-foreground">Regular Customers</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 text-success mr-1" />
                  <span className="text-xs text-success">+15.3%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-purple-100">
                <Star className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.averageRating}</p>
                <p className="text-sm text-muted-foreground">Avg Rating</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 text-success mr-1" />
                  <span className="text-xs text-success">+0.3</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-blue-100">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.preparationTime}m</p>
                <p className="text-sm text-muted-foreground">Avg Prep Time</p>
                <div className="flex items-center mt-1">
                  <TrendingDown className="h-3 w-3 text-success mr-1" />
                  <span className="text-xs text-success">-2.5m</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="menu">Menu Analysis</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue & Orders Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="revenue" fill="#8884d8" name="Revenue ($)" />
                    <Bar dataKey="orders" fill="#82ca9d" name="Orders" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Popular Menu Items</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      dataKey="value"
                      data={popularItems}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {popularItems.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Order Volume by Hour</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={orderTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="orders" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Days</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Wednesday</span>
                    <Badge variant="secondary">$9,800</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Friday</span>
                    <Badge variant="secondary">$4,800</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Sunday</span>
                    <Badge variant="secondary">$4,300</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Credit Card</span>
                    <Badge>68%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Cash</span>
                    <Badge>22%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Digital Wallet</span>
                    <Badge>10%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Order Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Dine-in</span>
                    <Badge className="status-completed">45%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Takeout</span>
                    <Badge className="status-ready">32%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Delivery</span>
                    <Badge className="status-preparing">23%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="menu" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Best Sellers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {popularItems.slice(0, 4).map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <Badge variant="outline">{item.value}% of orders</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Low Performers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Fish & Chips</span>
                    <Badge variant="destructive">2% of orders</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Vegetarian Wrap</span>
                    <Badge variant="destructive">3% of orders</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Mushroom Soup</span>
                    <Badge variant="destructive">4% of orders</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer Loyalty</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>First-time customers</span>
                    <Badge>38%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Regular customers</span>
                    <Badge className="status-completed">45%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>VIP customers</span>
                    <Badge className="status-ready">17%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Peak Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>12:00 - 14:00</span>
                    <Badge className="status-pending">Lunch Rush</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>19:00 - 21:00</span>
                    <Badge className="status-pending">Dinner Rush</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Weekend Evenings</span>
                    <Badge className="status-preparing">Busiest</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Customer Satisfaction</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>5 Stars</span>
                    <Badge className="status-completed">67%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>4 Stars</span>
                    <Badge className="status-ready">23%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>3 Stars or below</span>
                    <Badge variant="destructive">10%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;