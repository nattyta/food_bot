import { useState } from 'react'; // <-- Import useState
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart3,
  DollarSign,
  Users,
  Clock,
  ShoppingCart,
  Star,
  Calendar,
  Filter
} from 'lucide-react';
import { Bar, Line, Pie, ResponsiveContainer, BarChart, LineChart, PieChart, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { useAuthWithToken } from '@/hooks/useAuth';
import { analyticsApi } from '@/api/analytics';

// Define colors for the pie chart to be used dynamically
const PIE_CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F'];

const Analytics = () => {
  const { token } = useAuthWithToken();
  const [period, setPeriod] = useState('7d'); // <-- State for the time period

  const { data: analyticsData, isLoading, error } = useQuery({
    // CRITICAL: The query key now includes the period.
    // When `period` changes, React Query will automatically refetch the data.
    queryKey: ['analytics', period],
    queryFn: () => analyticsApi.getData(token!, period), // <-- Pass period to the API call
    enabled: !!token,
  });

  // Process popular items data with colors for the chart
  const popularItemsWithColors = analyticsData?.popularItems.map((item, index) => ({
    ...item,
    color: PIE_CHART_COLORS[index % PIE_CHART_COLORS.length],
  }));

  if (error) {
    return <div className="p-6 text-center text-destructive">Error loading analytics data: {error.message}</div>;
  }

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
        {/* --- MODIFIED BUTTONS --- */}
        <div className="flex items-center space-x-2">
          <Button
            variant={period === '7d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('7d')}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Last 7 Days
          </Button>
          <Button
            variant={period === '30d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('30d')}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Last 30 Days
          </Button>
          <Button variant="outline" size="sm" disabled>
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      {/* The rest of the component remains the same, as it dynamically reads from `analyticsData` */}
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)
        ) : (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-lg bg-primary/10"><DollarSign className="h-5 w-5 text-primary" /></div>
                  <div>
                    <p className="text-2xl font-bold">${analyticsData?.stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-lg bg-success/10"><ShoppingCart className="h-5 w-5 text-success" /></div>
                  <div>
                    <p className="text-2xl font-bold">{analyticsData?.stats.totalOrders}</p>
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-lg bg-warning/10"><DollarSign className="h-5 w-5 text-warning" /></div>
                  <div>
                    <p className="text-2xl font-bold">${analyticsData?.stats.averageOrderValue.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">Avg Order Value</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-lg bg-secondary/10"><Users className="h-5 w-5 text-secondary" /></div>
                  <div>
                    <p className="text-2xl font-bold">{analyticsData?.stats.newCustomers}</p>
                    <p className="text-sm text-muted-foreground">New Customers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-lg bg-purple-100"><Star className="h-5 w-5 text-purple-600" /></div>
                  <div>
                    <p className="text-2xl font-bold">4.7</p>
                    <p className="text-sm text-muted-foreground">Avg Rating</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-lg bg-blue-100"><Clock className="h-5 w-5 text-blue-600" /></div>
                  <div>
                    <p className="text-2xl font-bold">18m</p>
                    <p className="text-sm text-muted-foreground">Avg Prep Time</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sales" disabled>Sales</TabsTrigger>
          <TabsTrigger value="menu" disabled>Menu Analysis</TabsTrigger>
          <TabsTrigger value="customers" disabled>Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Revenue & Orders (Last 7 Days)</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? <Skeleton className="h-[300px]" /> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analyticsData?.salesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="revenue" fill="#8884d8" name="Revenue ($)" />
                      <Bar dataKey="orders" fill="#82ca9d" name="Orders" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Top 5 Popular Menu Items</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? <Skeleton className="h-[300px]" /> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie dataKey="value" data={popularItemsWithColors} cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {popularItemsWithColors?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color!} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [`${value} orders`, name]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Order Volume by Hour (Today)</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-[300px]" /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsData?.orderTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" fontSize={12} />
                    <YAxis fontSize={12}/>
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="orders" name="Number of Orders" stroke="#8884d8" strokeWidth={2} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="sales"></TabsContent>
        <TabsContent value="menu"></TabsContent>
        <TabsContent value="customers"></TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;