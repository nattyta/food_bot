import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BarChart3, DollarSign, Users, ShoppingCart, Star, Calendar, Filter, ChevronDown, Clock, Trophy, Repeat
} from 'lucide-react';
import { Bar, Line, Pie, ResponsiveContainer, BarChart, LineChart, PieChart, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { useAuthWithToken } from '@/hooks/useAuth';
import { analyticsApi } from '@/api/analytics';

// Define colors for the pie charts
const PIE_CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F'];
const CUSTOMER_PIE_COLORS = ['#0088FE', '#00C49F'];

// Define the options for our date picker dropdown
const periodOptions = [
  { value: '1d', label: 'Today' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: 'all', label: 'All Time' },
];

const Analytics = () => {
  const { token } = useAuthWithToken();
  const [period, setPeriod] = useState(periodOptions[1]); // Default to 'Last 7 Days'

  const { data: analyticsData, isLoading, error } = useQuery({
    queryKey: ['analytics', period.value],
    queryFn: () => analyticsApi.getData(token!, period.value),
    enabled: !!token,
  });

  // --- THE FIX: Provide a default empty array for ALL mapped data ---
  const popularItemsWithColors = (analyticsData?.popularItems || []).map((item, index) => ({
    ...item,
    color: PIE_CHART_COLORS[index % PIE_CHART_COLORS.length],
  }));

  const customerSegmentsWithColors = (analyticsData?.customerSegments || []).map((item, index) => ({
    ...item,
    color: CUSTOMER_PIE_COLORS[index % CUSTOMER_PIE_COLORS.length],
  }));

  if (error) {
    return <div className="p-6 text-center text-destructive">Error loading analytics data: {error.message}</div>;
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center">
            <BarChart3 className="mr-3 h-8 w-8 text-primary" />
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Displaying metrics for: <span className="text-primary font-semibold">{period.label}</span>
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-[150px] justify-between">
                <div className="flex items-center"><Calendar className="h-4 w-4 mr-2" />{period.label}</div>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[150px]">
              {periodOptions.map(option => (
                <DropdownMenuItem key={option.value} onSelect={() => setPeriod(option)}>
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" disabled>
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {isLoading ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />) : (
          <>
            <Card><CardContent className="p-4"><div className="flex items-center space-x-2"><div className="p-2 rounded-lg bg-primary/10"><DollarSign className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">${analyticsData?.stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p><p className="text-sm text-muted-foreground">Total Revenue</p></div></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center space-x-2"><div className="p-2 rounded-lg bg-success/10"><ShoppingCart className="h-5 w-5 text-success" /></div><div><p className="text-2xl font-bold">{analyticsData?.stats.totalOrders}</p><p className="text-sm text-muted-foreground">Total Orders</p></div></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center space-x-2"><div className="p-2 rounded-lg bg-warning/10"><DollarSign className="h-5 w-5 text-warning" /></div><div><p className="text-2xl font-bold">${analyticsData?.stats.averageOrderValue.toFixed(2)}</p><p className="text-sm text-muted-foreground">Avg Order Value</p></div></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center space-x-2"><div className="p-2 rounded-lg bg-secondary/10"><Users className="h-5 w-5 text-secondary" /></div><div><p className="text-2xl font-bold">{analyticsData?.stats.newCustomers}</p><p className="text-sm text-muted-foreground">New Customers</p></div></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center space-x-2"><div className="p-2 rounded-lg bg-purple-100"><Star className="h-5 w-5 text-purple-600" /></div><div><p className="text-2xl font-bold">4.7</p><p className="text-sm text-muted-foreground">Avg Rating</p></div></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="flex items-center space-x-2"><div className="p-2 rounded-lg bg-blue-100"><Clock className="h-5 w-5 text-blue-600" /></div><div><p className="text-2xl font-bold">18m</p><p className="text-sm text-muted-foreground">Avg Prep Time</p></div></div></CardContent></Card>
          </>
        )}
      </div>

      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="menu">Menu Analysis</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card><CardHeader><CardTitle>Revenue & Orders (Last 7 Days)</CardTitle></CardHeader><CardContent>{isLoading ? <Skeleton className="h-[300px]" /> : (<ResponsiveContainer width="100%" height={300}><BarChart data={analyticsData?.salesData}><CartesianGrid strokeDasharray="3 3" /> <XAxis dataKey="name" fontSize={12} /> <YAxis fontSize={12} /> <Tooltip /> <Legend /><Bar dataKey="revenue" fill="#8884d8" name="Revenue ($)" /><Bar dataKey="orders" fill="#82ca9d" name="Orders" /></BarChart></ResponsiveContainer>)}</CardContent></Card>
            <Card><CardHeader><CardTitle>Order Volume by Hour (Today)</CardTitle></CardHeader><CardContent>{isLoading ? <Skeleton className="h-[300px]" /> : (<ResponsiveContainer width="100%" height={300}><LineChart data={analyticsData?.orderTrends}><CartesianGrid strokeDasharray="3 3" /> <XAxis dataKey="time" fontSize={12} /> <YAxis fontSize={12}/> <Tooltip /> <Legend /><Line type="monotone" dataKey="orders" name="Number of Orders" stroke="#8884d8" strokeWidth={2} activeDot={{ r: 8 }} /></LineChart></ResponsiveContainer>)}</CardContent></Card>
          </div>
        </TabsContent>
        
        <TabsContent value="menu" className="space-y-4">
          <Card><CardHeader><CardTitle>Top 5 Popular Menu Items ({period.label})</CardTitle></CardHeader><CardContent>{isLoading ? <Skeleton className="h-[300px]" /> : (<ResponsiveContainer width="100%" height={300}><PieChart><Pie dataKey="value" data={popularItemsWithColors} cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>{popularItemsWithColors.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color!} />))}</Pie><Tooltip formatter={(value, name) => [`${value} orders`, name]} /><Legend /></PieChart></ResponsiveContainer>)}</CardContent></Card>
        </TabsContent>
        
        <TabsContent value="customers" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1"><CardHeader><CardTitle>New vs. Returning ({period.label})</CardTitle></CardHeader><CardContent>{isLoading ? <Skeleton className="h-[300px]" /> : (<ResponsiveContainer width="100%" height={300}><PieChart><Pie dataKey="value" data={customerSegmentsWithColors} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} label>{customerSegmentsWithColors.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color!} />))}</Pie><Tooltip formatter={(value) => [`${value} customers`]} /><Legend /></PieChart></ResponsiveContainer>)}</CardContent></Card>
            <Card className="lg:col-span-1"><CardHeader><CardTitle className="flex items-center"><Trophy className="mr-2 h-5 w-5 text-yellow-500" /> Top Spenders ({period.label})</CardTitle></CardHeader><CardContent className="space-y-4">{isLoading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8" />) : ((analyticsData?.topSpenders || []).map((customer, index) => (<div key={index} className="flex items-center justify-between text-sm"><p className="font-medium truncate">{customer.name || "Unknown"}</p><Badge variant="secondary">${customer.value.toFixed(2)}</Badge></div>)))}</CardContent></Card>
            <Card className="lg:col-span-1"><CardHeader><CardTitle className="flex items-center"><Repeat className="mr-2 h-5 w-5 text-blue-500" /> Most Frequent ({period.label})</CardTitle></CardHeader><CardContent className="space-y-4">{isLoading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8" />) : ((analyticsData?.mostFrequentCustomers || []).map((customer, index) => (<div key={index} className="flex items-center justify-between text-sm"><p className="font-medium truncate">{customer.name || "Unknown"}</p><Badge variant="secondary">{customer.value} orders</Badge></div>)))}</CardContent></Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;