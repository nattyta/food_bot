import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { X, Upload, Image as ImageIcon, Plus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthWithToken } from '@/hooks/useAuth';
import { menuApi } from '@/api/menu';

interface MenuExtra {
  name: string;
  price: number;
}

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
  extras: MenuExtra[];
  modifications: string[];
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
  const { token } = useAuthWithToken();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    category: '',
    prepTime: 5,
    image: '',
    available: true,
    allergens: [] as string[],
    extras: [] as MenuExtra[],
    modifications: [] as string[]
  });

  const [newExtra, setNewExtra] = useState({ name: '', price: 0 });
  const [newModification, setNewModification] = useState('');

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
        allergens: item.allergens,
        extras: item.extras || [],
        modifications: item.modifications || []
      });
    }
  }, [item]);

  const handleImageUpload = async (file: File) => {
    if (!token) {
      toast({ title: "Authentication Error", description: "Not authorized to upload.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({ title: "File Too Large", description: "Image size cannot exceed 5MB.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const response = await menuApi.uploadImage(token, file);
      // The backend returns a relative path like /static/images/burger.jpg
      // We prepend the API base URL to make it an absolute URL for the <img> tag
      const imageUrl = `${import.meta.env.VITE_API_BASE_URL || ''}${response.url}`;
      setFormData(prev => ({ ...prev, image: imageUrl }));
      toast({ title: "Success", description: "Image uploaded successfully." });
    } catch (error) {
      toast({ title: "Upload Failed", description: "Could not upload the image.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

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
    
    // Before saving, we need to convert the full image URL back to a relative path
    // so the backend can store it correctly.
    const dataToSave = {
        ...formData,
        image: formData.image.replace(import.meta.env.VITE_API_BASE_URL || '', '')
    };

    onSave(dataToSave);
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

  const addExtra = () => {
    if (newExtra.name.trim() && newExtra.price > 0) {
      setFormData(prev => ({
        ...prev,
        extras: [...prev.extras, { ...newExtra }]
      }));
      setNewExtra({ name: '', price: 0 });
    }
  };

  const removeExtra = (index: number) => {
    setFormData(prev => ({
      ...prev,
      extras: prev.extras.filter((_, i) => i !== index)
    }));
  };

  const addModification = () => {
    if (newModification.trim()) {
      setFormData(prev => ({
        ...prev,
        modifications: [...prev.modifications, newModification.trim()]
      }));
      setNewModification('');
    }
  };

  const removeModification = (index: number) => {
    setFormData(prev => ({
      ...prev,
      modifications: prev.modifications.filter((_, i) => i !== index)
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
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files && handleImageUpload(e.target.files[0])}
              className="hidden"
              accept="image/png, image/jpeg"
            />
            {formData.image ? (
              <div className="relative group">
                <img src={formData.image} alt={formData.name || "Menu item"} className="w-full h-48 object-cover rounded-lg border" />
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Upload className="h-4 w-4 mr-2" /> Change
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => !isUploading && fileInputRef.current?.click()}
              >
                {isUploading ? (
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="mt-4 text-sm">Uploading...</p>
                  </div>
                ) : (
                  <>
                    <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                    <div className="mt-4">
                      <Button type="button" variant="outline" size="sm" disabled={isUploading}>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Image
                      </Button>
                      <p className="text-sm text-muted-foreground mt-2">
                        Click or Drag & Drop (PNG, JPG up to 5MB)
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
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
                  <Label htmlFor={allergen} className="text-sm capitalize font-normal">
                    {allergen}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Extras</Label>
            <div className="space-y-2">
              {formData.extras.map((extra, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm">{extra.name} (+${extra.price.toFixed(2)})</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className='h-7 w-7'
                    onClick={() => removeExtra(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  placeholder="Extra name (e.g., Extra cheese)"
                  value={newExtra.name}
                  onChange={(e) => setNewExtra(prev => ({ ...prev, name: e.target.value }))}
                />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Price"
                  value={newExtra.price || ''}
                  onChange={(e) => setNewExtra(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  className="w-28"
                />
                <Button type="button" onClick={addExtra} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Modifications</Label>
            <div className="space-y-2">
              {formData.modifications.map((modification, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm">{modification}</span>
                   <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className='h-7 w-7'
                    onClick={() => removeModification(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  placeholder="Modification (e.g., No onion, Well-done)"
                  value={newModification}
                  onChange={(e) => setNewModification(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addModification())}
                />
                <Button type="button" onClick={addModification} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
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