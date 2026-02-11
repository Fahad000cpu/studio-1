
'use client';

import { doc } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import type { AffiliateProduct } from '@/types';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProductDetailsPage({ params }: { params: { productId: string } }) {
  const { productId } = params;
  const firestore = useFirestore();
  const router = useRouter();

  const productDocRef = useMemoFirebase(
    () => doc(firestore, 'affiliate_products', productId),
    [firestore, productId]
  );
  
  const { data: product, isLoading } = useDoc<AffiliateProduct>(productDocRef);

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl">
        <div className="mb-4">
          <Skeleton className="h-10 w-40" />
        </div>
        <Card className="overflow-hidden">
          <div className="grid md:grid-cols-2">
            <Skeleton className="aspect-square w-full" />
            <div className="p-8 space-y-6">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-12 w-48 mt-8" />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto text-center py-20">
        <h1 className="text-2xl font-bold font-headline">Product Not Found</h1>
        <p className="text-muted-foreground mt-2">The product you are looking for does not exist.</p>
        <Button onClick={() => router.back()} className="mt-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4 -ml-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Products
      </Button>
      <Card className="overflow-hidden shadow-lg glass">
        <div className="grid md:grid-cols-2">
          <div className="relative aspect-square bg-muted">
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
            />
          </div>
          <div className="flex flex-col p-6 sm:p-8">
            <CardHeader className="p-0">
              {product.category && <Badge variant="secondary" className="mb-2 w-fit">{product.category}</Badge>}
              <CardTitle className="font-headline text-3xl md:text-4xl">{product.name}</CardTitle>
            </CardHeader>
            <CardContent className="p-0 mt-4 flex-grow">
              <CardDescription className="text-base leading-relaxed">
                {product.description}
              </CardDescription>
            </CardContent>
            <div className="mt-8">
               <Button asChild size="lg" className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90">
                  <a href={product.affiliateLink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-5 w-5" />
                    Buy Now
                  </a>
                </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
