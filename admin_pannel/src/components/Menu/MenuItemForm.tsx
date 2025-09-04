import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

interface MenuItemFormProps {
  item?: MenuItem | null;
  onClose: () => void;
  onSave: (item: Partial<MenuItem>) => void;
}

const categories = ['Burgers', 'Pizza', 'Salads', 'Sides', 'Beverages', 'Desserts'];
const allergensList = ['gluten', 'dairy', 'nuts', 'eggs', 'soy', 'shellfish', 'fish'];

const MenuItemForm = ({ item, onClose, onSave }: MenuItemFormProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    category: '',
    prepTime: 5,
    image: '',
    available: true,
    allergens: [] as string[]
  });

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        prepTime: item.prepTime,
        image: item.image || '',
        available: item.available,
        allergens: item.allergens
      });
    }
  }, [item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.description || !formData.category) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    onSave(formData);
    toast({
      title: item ? "Item Updated" : "Item Created",
      description: `Menu item "${formData.name}" has been ${item ? 'updated' : 'created'} successfully`,
    });
  };

  const handleAllergenChange = (allergen: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      allergens: checked 
        ? [...prev.allergens, allergen]
        : prev.allergens.filter(a => a !== allergen)
    }));
  };

  const removeAllergen = (allergen: string) => {
    setFormData(prev => ({
      ...prev,
      allergens: prev.allergens.filter(a => a !== allergen)
    }));
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {item ? 'Edit Menu Item' : 'Add New Menu Item'}
          </DialogTitle>
          <DialogDescription>
            {item ? 'Update the details for this menu item' : 'Create a new menu item for your restaurant'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Burger Deluxe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe your menu item..."
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price ($) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prepTime">Prep Time (minutes)</Label>
              <Input
                id="prepTime"
                type="number"
                min="1"
                value={formData.prepTime}
                onChange={(e) => setFormData(prev => ({ ...prev, prepTime: parseInt(e.target.value) || 5 }))}
                placeholder="5"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Image</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors">
              <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
              <div className="mt-4">
                <Button type="button" variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Image
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  PNG, JPG up to 5MB
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Allergens</Label>
            <div className="flex flex-wrap gap-2 mb-3">
              {formData.allergens.map(allergen => (
                <Badge key={allergen} variant="secondary" className="flex items-center gap-1">
                  {allergen}
                  <button
                    type="button"
                    onClick={() => removeAllergen(allergen)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {allergensList.map(allergen => (
                <div key={allergen} className="flex items-center space-x-2">
                  <Checkbox
                    id={allergen}
                    checked={formData.allergens.includes(allergen)}
                    onCheckedChange={(checked) => handleAllergenChange(allergen, checked as boolean)}
                  />
                  <Label htmlFor={allergen} className="text-sm capitalize">
                    {allergen}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="available"
              checked={formData.available}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, available: checked as boolean }))}
            />
            <Label htmlFor="available">Available for ordering</Label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary-hover">
              {item ? 'Update Item' : 'Create Item'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MenuItemForm;