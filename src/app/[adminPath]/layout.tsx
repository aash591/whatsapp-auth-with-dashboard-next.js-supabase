'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Users, Activity, User, LogOut, Eye, EyeOff } from 'lucide-react';

interface AdminUser {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  lastLogin: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    username: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  
  // Get the admin path from the URL parameter
  const adminPath = `/${params.adminPath}`;

  useEffect(() => {
    const checkAuth = async () => {
      // Skip auth check for login page
      if (pathname === `${adminPath}/login`) {
        setLoading(false);
        return;
      }
      
      try {
        const response = await fetch('/api/admin/auth/me', {
          method: 'GET',
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setIsAuthenticated(true);
            setAdminUser(data.data);
          } else {
            router.push(`${adminPath}/login`);
          }
        } else {
          router.push(`${adminPath}/login`);
        }
      } catch (error) {
        console.error('Admin auth check failed:', error);
        router.push(`${adminPath}/login`);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [pathname, router, adminPath]);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      router.push(`${adminPath}/login`);
    }
  };

  const openProfileModal = () => {
    if (adminUser) {
      setEditForm({
        name: adminUser.name,
        username: adminUser.username,
        email: adminUser.email,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    }
    setProfileModalOpen(true);
    setDropdownOpen(false);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setProfileModalOpen(open);
    if (!open) {
      // Reset form when dialog closes
      setEditForm({
        name: '',
        username: '',
        email: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setEditError('');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');

    if (editForm.newPassword && editForm.newPassword !== editForm.confirmPassword) {
      setEditError('New passwords do not match');
      setEditLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/auth/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editForm.name,
          username: editForm.username,
          email: editForm.email,
          currentPassword: editForm.currentPassword,
          newPassword: editForm.newPassword
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setAdminUser(data.data);
        handleDialogOpenChange(false);
      } else {
        setEditError(data.message || 'Failed to update profile');
      }
    } catch (error) {
      setEditError('Failed to update profile');
    } finally {
      setEditLoading(false);
    }
  };


  // Show login page if not authenticated
  if (!isAuthenticated && pathname !== `${adminPath}/login`) {
    return null; // Will redirect to login
  }

  // Show login page content
  if (pathname === `${adminPath}/login`) {
    return <>{children}</>;
  }

  // Show admin dashboard layout
  return (
    <div className="min-h-screen bg-gray-50 m-0 p-0">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 m-0 p-0 h-16 flex items-center">
        <div className="flex items-center justify-between m-0 w-full">
          <div className="flex items-center space-x-4 p-4">
            <Shield className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-500">User Management System</p>
            </div>
          </div>
          
          {/* Admin Profile Dropdown */}
          <div className="relative flex-shrink-0 p-4" data-dropdown>
            <div 
              className={`h-10 rounded-lg border transition-all duration-200 flex items-center cursor-pointer ${
                dropdownOpen 
                  ? 'border-gray-300 bg-gray-50' 
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
                  <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center ml-2">
                    <span className="text-white text-sm font-medium">
                      {adminUser?.name?.charAt(0) || 'A'}
                    </span>
                  </div>
              <span className="text-sm font-medium text-gray-700 truncate mr-2">
                {adminUser?.name || 'Admin'}
              </span>
            </div>
            
            <div className={`absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 transition-all duration-200 ease-out transform ${
              dropdownOpen 
                ? 'opacity-100 scale-100 translate-y-0' 
                : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
            }`}>
                <div className="p-3 border-b border-gray-100">
                  <p className="text-sm font-medium">{adminUser?.name}</p>
                  <p className="text-xs text-gray-500">{adminUser?.email}</p>
                </div>
                <div className="py-1">
                  <button 
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center transition-colors duration-150"
                    onClick={openProfileModal}
                  >
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </button>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button 
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center transition-colors duration-150"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </button>
                </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex m-0 p-0">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen m-0 p-0">
          <nav className="m-0 p-0">
            <div className="space-y-2 p-4">
              <Link href={`${adminPath}/dashboard`}>
                <Button 
                  variant="ghost" 
                  className={`w-full justify-start ${
                    pathname === `${adminPath}/dashboard` ? 'bg-gray-100' : ''
                  }`}
                >
                  <Activity className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <Link href={`${adminPath}/users`}>
                <Button 
                  variant="ghost" 
                  className={`w-full justify-start ${
                    pathname === `${adminPath}/users` ? 'bg-gray-100' : ''
                  }`}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Users
                </Button>
              </Link>
              {adminUser?.role === 'super_admin' && (
                <Link href={`${adminPath}/admin-users`}>
                  <Button 
                    variant="ghost" 
                    className={`w-full justify-start ${
                      pathname === `${adminPath}/admin-users` ? 'bg-gray-100' : ''
                    }`}
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    Admin Users
                  </Button>
                </Link>
              )}
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 m-0 p-0">
          {children}
        </main>
      </div>

      {/* Profile Edit Dialog */}
      <Dialog open={profileModalOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your profile information and password.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4">
            {editError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {editError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={editForm.username}
                onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={editForm.currentPassword}
                  onChange={(e) => setEditForm({...editForm, currentPassword: e.target.value})}
                  placeholder="Enter current password to make changes"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={editForm.newPassword}
                  onChange={(e) => setEditForm({...editForm, newPassword: e.target.value})}
                  placeholder="Leave blank to keep current password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {editForm.newPassword && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={editForm.confirmPassword}
                    onChange={(e) => setEditForm({...editForm, confirmPassword: e.target.value})}
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={editLoading}
              >
                {editLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
