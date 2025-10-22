'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
  const [, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
      } catch (err) {
        console.error('Admin auth check failed:', err);
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
    } catch (err) {
      console.error('Logout error:', err);
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
    } catch {
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
            {/* Mobile Menu Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Shield className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-500">
                {pathname === `${adminPath}/dashboard` ? 'Dashboard Overview' :
                 pathname === `${adminPath}/users` ? 'User Management' :
                 pathname === `${adminPath}/admin-users` ? 'Admin User Management' :
                 'Admin Panel'}
              </p>
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
         {/* Mobile Overlay */}
         {sidebarOpen && (
           <div 
             className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
             onClick={() => setSidebarOpen(false)}
           />
         )}
         
         {/* Sidebar */}
         <aside 
           className={`fixed lg:static top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-300 ease-in-out ${
             sidebarOpen ? 'translate-x-0' : '-translate-x-full'
           } lg:translate-x-0`}
         >
           <nav className="m-0 p-0">
             <div className="space-y-2 p-4">
              <Link href={`${adminPath}/dashboard`} onClick={() => setSidebarOpen(false)}>
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
              <Link href={`${adminPath}/users`} onClick={() => setSidebarOpen(false)}>
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
                <Link href={`${adminPath}/admin-users`} onClick={() => setSidebarOpen(false)}>
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
         <main className="flex-1 m-0 p-0 lg:ml-0">
           {children}
         </main>
      </div>

      {/* Profile Edit Dialog */}
      <Dialog open={profileModalOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="popup-container">
          <DialogHeader className="popup-header">
            <DialogTitle className="popup-title">Edit Profile</DialogTitle>
            <DialogDescription className="popup-description">
              Update your profile information and password.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="popup-content">
            <div className="popup-fields">
              {editError && (
                <div className="popup-error">
                  <div className="popup-error-text">
                    {editError}
                  </div>
                </div>
              )}

              <div className="popup-field">
                <Label htmlFor="name" className="popup-label">Name</Label>
                <div className="popup-input-container">
                  <Input
                    id="name"
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    required
                    disabled={editLoading}
                    className="popup-input"
                  />
                </div>
              </div>

              <div className="popup-field">
                <Label htmlFor="username" className="popup-label">Username</Label>
                <div className="popup-input-container">
                  <Input
                    id="username"
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                    required
                    disabled={editLoading}
                    className="popup-input"
                  />
                </div>
              </div>

              <div className="popup-field">
                <Label htmlFor="email" className="popup-label">Email</Label>
                <div className="popup-input-container">
                  <Input
                    id="email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                    required
                    disabled={editLoading}
                    className="popup-input"
                  />
                </div>
              </div>

              <div className="popup-field">
                <Label htmlFor="currentPassword" className="popup-label">Current Password</Label>
                <div className="popup-input-container">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={editForm.currentPassword}
                    onChange={(e) => setEditForm({...editForm, currentPassword: e.target.value})}
                    placeholder="Enter current password to make changes"
                    disabled={editLoading}
                    className="popup-input"
                  />
                  <button
                    type="button"
                    className="popup-toggle-button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="popup-input-help">
                  Required to make any changes
                </p>
              </div>

              <div className="popup-field">
                <Label htmlFor="newPassword" className="popup-label">New Password</Label>
                <div className="popup-input-container">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={editForm.newPassword}
                    onChange={(e) => setEditForm({...editForm, newPassword: e.target.value})}
                    placeholder="Leave blank to keep current password"
                    disabled={editLoading}
                    className="popup-input"
                  />
                  <button
                    type="button"
                    className="popup-toggle-button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="popup-input-help">
                  Leave blank to keep current password
                </p>
              </div>

              {editForm.newPassword && (
                <div className="popup-field">
                  <Label htmlFor="confirmPassword" className="popup-label">Confirm New Password</Label>
                  <div className="popup-input-container">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={editForm.confirmPassword}
                      onChange={(e) => setEditForm({...editForm, confirmPassword: e.target.value})}
                      placeholder="Confirm new password"
                      disabled={editLoading}
                      className="popup-input"
                    />
                    <button
                      type="button"
                      className="popup-toggle-button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="popup-buttons">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogOpenChange(false)}
                className="popup-button popup-button-secondary"
                disabled={editLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={editLoading}
                className="popup-button popup-button-primary"
              >
                {editLoading ? (
                  <div className="popup-button-loading">
                    <div className="popup-button-spinner"></div>
                    Saving...
                  </div>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
