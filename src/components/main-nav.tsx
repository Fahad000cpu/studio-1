"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  Users,
  Image as ImageIcon,
  ShoppingBag,
  Settings,
  Shield,
} from "lucide-react";

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { useAdmin } from "@/hooks/use-admin";

export function MainNav() {
  const pathname = usePathname();
  const { isAdmin } = useAdmin();

  const menuItems = [
    { href: "/discover", label: "Discover", icon: Users },
    { href: "/chat", label: "Chat", icon: MessageSquare },
    { href: "/status", label: "Status", icon: ImageIcon },
    { href: "/products", label: "Products", icon: ShoppingBag },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  if (isAdmin) {
    menuItems.push({ href: "/admin", label: "Admin", icon: Shield });
  }

  return (
    <SidebarMenu>
      {menuItems.map(({ href, label, icon: Icon }) => (
        <SidebarMenuItem key={href}>
          <SidebarMenuButton
            asChild
            isActive={pathname === href}
            tooltip={label}
          >
            <Link href={href}>
              <Icon />
              <span>{label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
