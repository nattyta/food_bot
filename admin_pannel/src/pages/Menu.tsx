import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  Filter, 
  Plus,
  Edit2,
  Trash2,
  DollarSign,
  ChefHat,
  Clock
} from 'lucide-react';
import { useAuthWithToken } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { menuApi } from '@/api/menu';
import { MenuItem } from '@/api/types';
import MenuItemForm from '@/components/Menu/MenuItemForm';


const categories = ['All', 'Burgers', 'Pizza', 'Salads', 'Sides', 'Beverages', 'Desserts'];

const Menu = () => {
  const { token } = useAuthWithToken();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Fetch menu items
  const { data: menuItems = [], isLoading, error } = useQuery({
    queryKey: ['menu', selectedCategory],
    queryFn: () => menuApi.getAll(token!, selectedCategory),
    enabled: !!token,
  });

  // Create menu item mutation
  const createMenuItemMutation = useMutation({
    mutationFn: (newItem: Omit<MenuItem, 'id'>) => menuApi.create(token!, newItem),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      setShowForm(false);
      toast({
        title: "Success",
        description: "Menu item created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create menu item: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update menu item mutation
  const updateMenuItemMutation = useMutation({
    mutationFn: ({ itemId, itemData }: { itemId: string; itemData: Partial<MenuItem> }) =>
      menuApi.update(token!, itemId, itemData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      setEditingItem(null);
      setShowForm(false);
      toast({
        title: "Success",
        description: "Menu item updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update menu item: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete menu item mutation
  const deleteMenuItemMutation = useMutation({
    mutationFn: (itemId: string) => menuApi.delete(token!, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      toast({
        title: "Success",
        description: "Menu item deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete menu item: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Toggle availability mutation
  const toggleAvailabilityMutation = useMutation({
    mutationFn: ({ itemId, available }: { itemId: string; available: boolean }) =>
      menuApi.toggleAvailability(token!, itemId, available),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      toast({
        title: "Success",
        description: "Menu item availability updated",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update availability: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleDelete = (itemId: string) => {
    deleteMenuItemMutation.mutate(itemId);
  };

  const handleAddNew = () => {
    setEditingItem(null);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  const toggleAvailability = (item: MenuItem) => {
    toggleAvailabilityMutation.mutate({ 
      itemId: item.id, 
      available: !item.available 
    });
  };

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleSaveItem = (itemData: Partial<MenuItem>) => {
    if (editingItem) {
      updateMenuItemMutation.mutate({ 
        itemId: editingItem.id, 
        itemData 
      });
    } else {
      createMenuItemMutation.mutate(itemData as Omit<MenuItem, 'id'>);
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-destructive">
          Error loading menu items: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Menu Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage your restaurant's menu items and pricing
          </p>
        </div>
        <Button onClick={handleAddNew} className="bg-primary hover:bg-primary-hover">
          <Plus className="h-4 w-4 mr-2" />
          Add New Item
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search menu items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <div className="flex items-center space-x-2">
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="transition-colors"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          More Filters
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <div className="flex space-x-1">
                    <Skeleton className="h-8 w-8 rounded" />
                    <Skeleton className="h-8 w-8 rounded" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredItems.map((item, index) => (
          <Card 
            key={item.id}
            className="animate-slide-in hover:shadow-elegant transition-all duration-200"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <Badge variant={item.available ? "default" : "secondary"}>
                      {item.available ? 'Available' : 'Unavailable'}
                    </Badge>
                  </div>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {item.category}
                  </Badge>
                </div>
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(item)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(item.id)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <CardDescription className="text-sm">
                {item.description}
              </CardDescription>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span className="font-semibold text-foreground">${item.price.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{item.prepTime} min</span>
                  </div>
                </div>
                <Button
                  variant={item.available ? "outline" : "default"}
                  size="sm"
                  onClick={() => toggleAvailability(item)}
                  className="text-xs"
                  disabled={toggleAvailabilityMutation.isPending}
                >
                  {item.available ? 'Disable' : 'Enable'}
                </Button>
              </div>

              {item.allergens.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.allergens.map(allergen => (
                    <Badge key={allergen} variant="outline" className="text-xs">
                      {allergen}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {showForm && (
        <MenuItemForm
          item={editingItem}
          onClose={handleFormClose}
          onSave={handleSaveItem}
        />
      )}
    </div>
  );
};

export default Menu;