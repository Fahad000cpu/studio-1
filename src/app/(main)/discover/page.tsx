'use client';
import { useState } from 'react';
import DiscoverUsers from "@/components/discover-users";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { NotificationPermissionAlert } from "@/components/notification-permission-alert";
import { InstallPwaButton } from '@/components/install-pwa-button';

export default function DiscoverPage() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="container mx-auto">
      <div className="my-6 flex flex-col md:flex-row gap-4">
        <NotificationPermissionAlert className="flex-grow" />
        <InstallPwaButton className="flex-grow md:flex-grow-0" />
      </div>
      <div className="mb-8 bg-card/80 p-6 rounded-lg shadow-lg backdrop-blur-sm space-y-4">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Discover People</h1>
          <p className="text-muted-foreground">
            Connect with people near you based on your location.
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search for people..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <DiscoverUsers searchTerm={searchTerm} />
    </div>
  );
}
