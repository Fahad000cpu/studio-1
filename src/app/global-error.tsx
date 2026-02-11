
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AlertCircle } from 'lucide-react';
import { FirestorePermissionError } from '@/firebase/errors';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Optional: Log the error to an error reporting service
    console.error("Caught in Global Error Boundary:", error);
  }, [error]);
  
  const isPermissionError = error instanceof FirestorePermissionError;

  return (
    <html>
      <body>
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <div className="w-full max-w-2xl text-center bg-card p-8 rounded-lg shadow-lg border">
                <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
                <h1 className="text-2xl font-bold text-destructive mb-2">Application Error</h1>
                <p className="text-card-foreground mb-6">
                    {isPermissionError 
                        ? "A database permission error occurred. This means the app tried to access data it wasn't allowed to."
                        : "An unexpected error occurred. Please try again."
                    }
                </p>
                
                {isPermissionError && (
                    <Accordion type="single" collapsible className="w-full text-left bg-muted/50 p-4 rounded-md">
                        <AccordionItem value="item-1">
                            <AccordionTrigger>View Technical Details</AccordionTrigger>
                            <AccordionContent>
                                <p className="text-sm text-muted-foreground mb-2">The following request was denied by Firestore Security Rules. Use this information to debug your `firestore.rules` file.</p>
                                <pre className="w-full text-left text-xs bg-background p-3 rounded-md overflow-auto">
                                    <code>
                                        {JSON.stringify((error as FirestorePermissionError).request, null, 2)}
                                    </code>
                                </pre>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                )}

                <Button onClick={() => reset()} className="mt-8">
                    Try Again
                </Button>
            </div>
        </div>
      </body>
    </html>
  );
}
