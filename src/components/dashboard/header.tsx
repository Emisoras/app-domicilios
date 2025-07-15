'use client'

import Link from "next/link"
import { useRouter } from 'next/navigation';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { PanelLeft, LayoutDashboard, Bike, Users, Map, ClipboardList, Settings, Search, ListOrdered, Calculator, Headset } from 'lucide-react'
import { Logo } from "../icons/logo"
import { Input } from "../ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import type { User, Role } from "@/types"

const navLinks: { href: string; icon: React.ElementType; label: string; roles: Role[] }[] = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'agent', 'delivery'] },
    { href: '/dashboard/pedidos', icon: ClipboardList, label: 'Pedidos', roles: ['admin', 'agent'] },
    { href: '/dashboard/clientes', icon: Users, label: 'Clientes', roles: ['admin', 'agent'] },
    { href: '/dashboard/agentes', icon: Headset, label: 'Agentes', roles: ['admin'] },
    { href: '/dashboard/domiciliarios', icon: Bike, label: 'Domiciliarios', roles: ['admin', 'agent'] },
    { href: '/dashboard/rutas', icon: Map, label: 'Rutas', roles: ['admin', 'agent'] },
    { href: '/dashboard/mis-rutas', icon: ListOrdered, label: 'Mis Rutas', roles: ['delivery'] },
    { href: '/dashboard/cuadre-caja', icon: Calculator, label: 'Cuadre de Caja', roles: ['admin', 'agent', 'delivery'] },
    { href: '/dashboard/configuracion', icon: Settings, label: 'Configuración', roles: ['admin', 'agent', 'delivery'] },
];

export function Header({ user }: { user: User }) {
    const router = useRouter();
    const accessibleNavLinks = navLinks.filter(link => link.roles.includes(user.role));
    const userInitials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    
    const handleLogout = async () => {
        await fetch('/api/logout', { method: 'POST' });
        router.push('/');
    };

    return (
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="sm:hidden">
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-xs">
              <nav className="grid gap-6 text-lg font-medium">
                <Link href="#" className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base">
                  <Logo className="h-5 w-5 transition-all group-hover:scale-110" />
                  <span className="sr-only">Droguería Avenida</span>
                </Link>
                {accessibleNavLinks.map(({ href, icon: Icon, label }) => (
                  <Link key={label} href={href} className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
                    <Icon className="h-5 w-5" />
                    {label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          <div className="relative ml-auto flex-1 md:grow-0">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Buscar pedido, cliente..." className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px]" />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="overflow-hidden rounded-full">
                <Avatar>
                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                    <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/configuracion">Configuración</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>Soporte</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleLogout}>Cerrar Sesión</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
    )
}
