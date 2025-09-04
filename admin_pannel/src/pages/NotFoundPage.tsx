import { Button } from '@/components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen gradient-background flex items-center justify-center p-4">
      <div className="text-center max-w-md animate-scale-in">
        <div className="text-6xl font-bold gradient-primary bg-clip-text text-transparent mb-4">
          404
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Page Not Found
        </h1>
        <p className="text-muted-foreground mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="space-y-3">
          <Button asChild className="w-full gradient-primary">
            <Link to="/">
              <Home className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <Button variant="outline" onClick={() => window.history.back()} className="w-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;