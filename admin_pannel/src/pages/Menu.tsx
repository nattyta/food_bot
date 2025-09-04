import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useAuth } from '@/contexts/AuthContext';
import MenuItemForm from '@/components/Menu/MenuItemForm';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  prepTime: number;
  image?: string;
  available: boolean;
  allergens: string[];
}

const mockMenuItems: MenuItem[] = [
  {
    id: 'MENU-001',
    name: 'Burger Deluxe',
    description: 'Juicy beef patty with lettuce, tomato, cheese, and our special sauce',
    price: 12.99,
    category: 'Burgers',
    prepTime: 8,
    available: true,
    allergens: ['gluten', 'dairy']
  },
  {
    id: 'MENU-002',
    name: 'Caesar Salad',
    description: 'Fresh romaine lettuce with parmesan cheese and croutons',
    price: 10.99,
    category: 'Salads',
    prepTime: 5,
    available: true,
    allergens: ['dairy', 'gluten']
  },
  {
    id: 'MENU-003',
    name: 'Pizza Margherita',
    description: 'Classic pizza with tomato sauce, mozzarella, and fresh basil',
    price: 18.00,
    category: 'Pizza',
    prepTime: 15,
    available: false,
    allergens: ['gluten', 'dairy']
  },
  {
    id: 'MENU-004',
    name: 'Fries',
    description: 'Crispy golden french fries with sea salt',
    price: 3.99,
    category: 'Sides',
    prepTime: 4,
    available: true,
    allergens: []
  }
];

const categories = ['All', 'Burgers', 'Pizza', 'Salads', 'Sides', 'Beverages', 'Desserts'];

const Menu = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleDelete = (itemId: string) => {
    // In a real app, this would make an API call
    console.log(`Deleting menu item ${itemId}`);
    // Show confirmation dialog first
  };

  const handleAddNew = () => {
    setEditingItem(null);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  const toggleAvailability = (itemId: string) => {
    // In a real app, this would make an API call
    console.log(`Toggling availability for item ${itemId}`);
  };

  const filteredItems = mockMenuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

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
        {filteredItems.map((item, index) => (
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
                  onClick={() => toggleAvailability(item.id)}
                  className="text-xs"
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
          onSave={(item) => {
            console.log('Saving item:', item);
            handleFormClose();
          }}
        />
      )}
    </div>
  );
};

export default Menu;