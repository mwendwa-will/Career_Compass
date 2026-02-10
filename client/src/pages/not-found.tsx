import { Link } from "wouter";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="max-w-md text-center space-y-6 px-6">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto">
          <AlertCircle className="w-10 h-10 text-muted-foreground" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-display font-bold text-foreground">Page not found</h1>
          <p className="text-muted-foreground">
            The page you are looking for doesn't exist or has been moved.
          </p>
        </div>

        <Link href="/">
          <Button className="w-full">Return Home</Button>
        </Link>
      </div>
    </div>
  );
}
