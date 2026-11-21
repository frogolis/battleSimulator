import React from 'react';

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex h-screen bg-background text-foreground">
    {children}
  </div>
);

export const Sidebar: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <aside className="w-64 border-r bg-sidebar">
    {children}
  </aside>
);

export const SidebarHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="border-b p-4">
    {children}
  </div>
);

export const SidebarContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex-1 overflow-y-auto">
    {children}
  </div>
);

export const SidebarFooter: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="border-t p-4">
    {children}
  </div>
);

export const SidebarGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="py-2">
    {children}
  </div>
);

export const SidebarGroupLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground">
    {children}
  </div>
);

export const SidebarGroupContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div>
    {children}
  </div>
);

export const SidebarMenu: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ul className="space-y-1 px-2">
    {children}
  </ul>
);

export const SidebarMenuItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li>
    {children}
  </li>
);

export const SidebarMenuButton: React.FC<{ 
  children: React.ReactNode; 
  onClick?: () => void;
  isActive?: boolean;
}> = ({ children, onClick, isActive }) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
      isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'
    }`}
  >
    {children}
  </button>
);
