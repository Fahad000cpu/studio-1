'use client';

import { useState, useMemo } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, PlusCircle, Search, MoreVertical, Edit, Trash2 } from "lucide-react";
import { useAdmin } from "@/hooks/use-admin";
import { AddProductDialog } from "@/components/add-product-dialog";
import { useCollection, useMemoFirebase, useFirestore, deleteDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import type { AffiliateProduct } from "@/types";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { EditProductDialog } from "@/components/edit-product-dialog";

export default function ProductsPage() {
  const { isAdmin, isLoading: isAdminLoading } = useAdmin();
  const firestore = useFirestore();
  const productsCollection = useMemoFirebase(() => collection(firestore, 'affiliate_products'), [firestore]);
  const { data: products, isLoading: productsLoading } = useCollection<AffiliateProduct>(productsCollection);
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const isLoading = isAdminLoading || productsLoading;

  const categories = useMemo(() => {
    if (!products) return [];
    const uniqueCategories = [...new Set(products.map(p => p.category).filter(Boolean))];
    if (uniqueCategories.length > 0) {
        return ["All", ...uniqueCategories];
    }
    return [];
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(product => {
      const matchesCategory = selectedCategory === null || selectedCategory === "All" || product.category === selectedCategory;
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, searchTerm, selectedCategory]);
  
  const handleDeleteProduct = (productId: string, productName: string) => {
    const productDocRef = doc(firestore, 'affiliate_products', productId);
    deleteDocumentNonBlocking(productDocRef);
    toast({
        title: "Product Deleted",
        description: `"${productName}" has been removed.`,
    });
  };

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Affiliate Products</h1>
          <p className="text-muted-foreground">
            Check out these recommended products.
          </p>
        </div>
        {!isLoading && isAdmin && (
          <AddProductDialog>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Product
            </Button>
          </AddProductDialog>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search for products..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {categories.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {categories.map(category => (
                    <Button 
                        key={category}
                        variant={selectedCategory === category || (selectedCategory === null && category === "All") ? "default" : "outline"}
                        onClick={() => setSelectedCategory(category === "All" ? null : category)}
                        className="whitespace-nowrap"
                    >
                        {category}
                    </Button>
                ))}
            </div>
        )}
      </div>

       {isLoading ? (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="overflow-hidden shadow-lg flex flex-col">
                    <CardHeader className="p-0">
                        <div className="aspect-[4/3] relative bg-muted animate-pulse" />
                    </CardHeader>
                    <CardContent className="p-6 space-y-2 flex-grow">
                        <div className="h-6 w-3/4 rounded bg-muted animate-pulse" />
                        <div className="h-4 w-full rounded bg-muted animate-pulse" />
                        <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
                    </CardContent>
                    <CardFooter>
                        <div className="h-10 w-full rounded bg-muted animate-pulse" />
                    </CardFooter>
                </Card>
            ))}
         </div>
       ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 group glass flex flex-col">
              <CardHeader className="relative aspect-[4/3] p-0">
                {isAdmin && (
                    <div className="absolute top-2 right-2 z-10">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-white hover:bg-black/50 focus-visible:ring-white/50">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <EditProductDialog product={product}>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        <span>Edit</span>
                                    </DropdownMenuItem>
                                </EditProductDialog>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                            <Trash2 className="mr-2 h-4 w-4 text-destructive"/>
                                            <span className="text-destructive">Delete</span>
                                        </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete the product "{product.name}".
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction 
                                                className="bg-destructive hover:bg-destructive/90"
                                                onClick={() => handleDeleteProduct(product.id, product.name)}>
                                                Delete
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
              </CardHeader>
              <CardContent className="p-6 flex-grow">
                <CardTitle className="font-headline text-2xl mb-2">{product.name}</CardTitle>
                <CardDescription>
                  {product.description}
                </CardDescription>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                  <a href={product.affiliateLink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    view product
                  </a>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
       )}
       {!isLoading && filteredProducts.length === 0 && (
         <div className="text-center py-16">
            <h2 className="text-2xl font-bold font-headline">No Products Found</h2>
            <p className="text-muted-foreground mt-2">Try adjusting your search or category filters.</p>
         </div>
       )}
    </div>
  );
}
