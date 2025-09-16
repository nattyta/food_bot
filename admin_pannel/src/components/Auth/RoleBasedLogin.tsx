import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/api/types';
import { Loader2, User, Users, Truck } from 'lucide-react';
import { Lock } from 'lucide-react'; 

const roleConfig = {
  admin: {
    icon: User,
    title: 'Admin Portal',
    description: 'Access full restaurant management',
    color: 'bg-primary text-primary-foreground',
    defaultEmail: 'admin@foodbot.com',
  },
  kitchen: {
    icon: Users,
    title: 'Kitchen Staff',
    description: 'Manage orders and kitchen operations',
    color: 'bg-secondary text-secondary-foreground',
    defaultEmail: 'staff@foodbot.com',
  },
  delivery: {
    icon: Truck,
    title: 'Delivery Portal',
    description: 'Track deliveries and routes',
    color: 'bg-success text-success-foreground',
    defaultEmail: 'delivery@foodbot.com',
  },

  manager: {
    icon: Lock, // Or another icon you prefer
    title: 'Manager Portal',
    description: 'Oversee operations and staff',
    color: 'bg-destructive text-destructive-foreground',
    defaultEmail: 'manager@foodbot.com',
  },


};

export const RoleBasedLogin = () => {
  const { login, loading } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setEmail(roleConfig[role].defaultEmail);
    setPassword('password123');
    setError('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;

    try {
      setError('');
      await login(email, password, selectedRole);
    } catch (err) {
      setError('Login failed. Please check your credentials.');
    }
  };

  if (selectedRole) {
    const config = roleConfig[selectedRole];
    const Icon = config.icon;

    return (
      <div className="min-h-screen gradient-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className={`w-16 h-16 rounded-full ${config.color} flex items-center justify-center mx-auto mb-4`}>
              <Icon className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl">{config.title}</CardTitle>
            <p className="text-muted-foreground">{config.description}</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              
              {error && (
                <div className="text-destructive text-sm">{error}</div>
              )}

              <div className="space-y-2">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => setSelectedRole(null)}
                >
                  Back to Role Selection
                </Button>
              </div>
            </form>
            
            <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
              <p className="font-medium mb-1">Demo Credentials:</p>
              <p>Email: {config.defaultEmail}</p>
              <p>Password: password123</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">FoodBot</h1>
          <p className="text-muted-foreground">Choose your access level</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {(Object.entries(roleConfig) as [UserRole, typeof roleConfig[UserRole]][]).map(([role, config]) => {
            const Icon = config.icon;
            return (
              <Card 
                key={role} 
                className="cursor-pointer hover:shadow-elegant transition-all duration-200 hover:scale-105"
                onClick={() => handleRoleSelect(role)}
              >
                <CardHeader className="text-center">
                  <div className={`w-20 h-20 rounded-full ${config.color} flex items-center justify-center mx-auto mb-4`}>
                    <Icon className="h-10 w-10" />
                  </div>
                  <CardTitle className="text-xl">{config.title}</CardTitle>
                  <p className="text-muted-foreground text-sm">{config.description}</p>
                </CardHeader>
                <CardContent className="text-center">
                  <Badge variant="outline" className="capitalize">
                    {role}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};