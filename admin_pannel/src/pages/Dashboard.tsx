import { StatsCards } from '@/components/Dashboard/StatsCards';
import { RecentOrders } from '@/components/Dashboard/RecentOrders';
import { useAuth } from '@/contexts/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Good morning, {user?.name}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            {user?.role === 'kitchen' 
              ? "Here's what's happening in the kitchen today"
              : user?.role === 'delivery' 
              ? "Here's your delivery overview for today"
              : "Here's your restaurant overview for today"
            }
          </p>
        </div>
      </div>

      <StatsCards />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentOrders />
        
        {/* Quick Actions Card */}
        <div className="space-y-6">
          {user?.role === 'kitchen' && (
            <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-6 border border-primary/20">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <button className="p-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium">
                  View Active Orders
                </button>
                <button className="p-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary-hover transition-colors text-sm font-medium">
                  Mark Order Ready
                </button>
                <button className="p-3 bg-success text-success-foreground rounded-lg hover:opacity-90 transition-opacity text-sm font-medium">
                  Complete Order
                </button>
                <button className="p-3 bg-warning text-warning-foreground rounded-lg hover:opacity-90 transition-opacity text-sm font-medium">
                  Report Issue
                </button>
              </div>
            </div>
          )}

          {user?.role === 'admin' && (
            <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-6 border border-primary/20">
              <h3 className="text-lg font-semibold mb-4">Manager Tools</h3>
              <div className="space-y-3">
                <button className="w-full p-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium text-left">
                  📊 View Analytics Dashboard
                </button>
                <button className="w-full p-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary-hover transition-colors text-sm font-medium text-left">
                  🍽️ Manage Menu Items
                </button>
                <button className="w-full p-3 bg-success text-success-foreground rounded-lg hover:opacity-90 transition-opacity text-sm font-medium text-left">
                  👥 Staff Management
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;