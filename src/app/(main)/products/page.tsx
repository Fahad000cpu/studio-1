
'use client';

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Search, MoreVertical, Edit, Trash2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

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
    const uniqueCategories = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
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
    <div className="w-full space-y-8">
      <Card className="bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                  <CardTitle className="text-3xl font-bold font-headline tracking-tight">Affiliate Products</CardTitle>
                  <CardDescription className="mt-1">
                      Check out these recommended products.
                  </CardDescription>
              </div>
              {!isLoading && isAdmin && (
                  <AddProductDialog>
                      <Button>
                          <PlusCircle className="mr-2 h-4 w-4" /> Add Product
                      </Button>
                  </AddProductDialog>
              )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
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
        </CardContent>
      </Card>

       {isLoading ? (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="overflow-hidden shadow-lg flex flex-col h-full">
                    <CardHeader className="p-0">
                        <div className="aspect-[4/3] relative bg-muted animate-pulse" />
                    </CardHeader>
                    <CardContent className="p-6 space-y-4 flex-grow">
                        <div className="h-6 w-3/4 rounded bg-muted animate-pulse" />
                        <div className="h-4 w-full rounded bg-muted animate-pulse" />
                        <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
                    </CardContent>
                </Card>
            ))}
         </div>
       ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredProducts.map((product) => (
             <Link key={product.id} href={`/products/${product.id}`} className="group outline-none block" tabIndex={0}>
                <Card className="overflow-hidden shadow-lg h-full hover:shadow-xl transition-shadow duration-300 group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2 glass flex flex-col">
                  <CardHeader className="relative aspect-[4/3] p-0">
                    {isAdmin && (
                        <div className="absolute top-2 right-2 z-20">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/30 text-white hover:bg-black/50 focus-visible:ring-white/50" onClick={(e) => e.preventDefault()}>
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
                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                                <Trash2 className="mr-2 h-4 w-4"/>
                                                <span>Delete</span>
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
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <CardTitle className="font-headline text-2xl absolute bottom-4 left-4 text-white z-10">{product.name}</CardTitle>
                    {product.category && <Badge variant="secondary" className="absolute top-3 left-3 z-10">{product.category}</Badge>}
                  </CardHeader>
                  <CardContent className="p-6 flex-grow">
                    <CardDescription>
                      {product.description}
                    </CardDescription>
                  </CardContent>
                </Card>
            </Link>
          ))}
        </div>
       )}
       {!isLoading && filteredProducts.length === 0 && (
         <div className="text-center py-16 text-muted-foreground">
            <Search className="mx-auto h-12 w-12 mb-4" />
            <h2 className="text-2xl font-bold font-headline text-foreground">No Products Found</h2>
            <p className="mt-2">Try adjusting your search or category filters.</p>
         </div>
       )}
    </div>
  );
}
