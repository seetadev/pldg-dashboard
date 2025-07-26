# Claude Generated Code

**Task**: Objective:
Help design and implement new features based on the current roadmap or project needs. Focus on clean, scalable, and testable code

Claude Tasks:

🧩 Feature Implementation
Read the existing codebase and integrate new feature modules where appropriate.

Ensure new code follows existing patterns and conventions.

🗂️ Example Features (replace/add specifics as needed):
Add user role-based access control

Implement export to PDF

Add multi-language support

Enable dark mode toggle

🧪 Testing & Documentation
Add unit/integration tests for new functionality.

Update README or in-code comments if required.

**Generated on**: Sat Jul 26 09:16:37 UTC 2025

## Generated Content

```
I notice there's a mismatch between the task description (Ionic React TypeScript for government billing/invoicing) and the actual codebase (Next.js developer engagement dashboard). I'll work with the existing Next.js codebase and implement a feature that would be valuable for this dashboard: **User Role-Based Access Control**.

This feature will add authentication and authorization to control access to different parts of the dashboard based on user roles.

## FILES_TO_CREATE

1. `src/types/auth.ts`
2. `src/context/AuthContext.tsx`
3. `src/components/auth/LoginForm.tsx`
4. `src/components/auth/RoleGuard.tsx`
5. `src/lib/auth.ts`
6. `src/app/login/page.tsx`
7. `src/hooks/useAuth.ts`
8. `src/lib/__tests__/auth.test.ts`

## FILES_TO_MODIFY

1. `src/app/layout.tsx`
2. `src/app/dashboard/page.tsx`
3. `src/context/index.ts`
4. `src/types/dashboard.ts`

## CODE_CHANGES

### 1. Create `src/types/auth.ts`

```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  createdAt: Date;
  lastLogin?: Date;
}

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  VIEWER = 'viewer',
  PARTICIPANT = 'participant'
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  hasRole: (role: UserRole) => boolean;
}

export enum Permission {
  VIEW_DASHBOARD = 'view_dashboard',
  EXPORT_DATA = 'export_data',
  MANAGE_USERS = 'manage_users',
  VIEW_ANALYTICS = 'view_analytics',
  EDIT_SETTINGS = 'edit_settings'
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    Permission.VIEW_DASHBOARD,
    Permission.EXPORT_DATA,
    Permission.MANAGE_USERS,
    Permission.VIEW_ANALYTICS,
    Permission.EDIT_SETTINGS
  ],
  [UserRole.MANAGER]: [
    Permission.VIEW_DASHBOARD,
    Permission.EXPORT_DATA,
    Permission.VIEW_ANALYTICS
  ],
  [UserRole.VIEWER]: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_ANALYTICS
  ],
  [UserRole.PARTICIPANT]: [
    Permission.VIEW_DASHBOARD
  ]
};
```

### 2. Create `src/lib/auth.ts`

```typescript
import { User, LoginCredentials, UserRole } from '@/types/auth';

// Mock authentication for demonstration
// In production, this would integrate with your actual auth service
const MOCK_USERS: User[] = [
  {
    id: '1',
    email: 'admin@pldg.dev',
    name: 'Admin User',
    role: UserRole.ADMIN,
    createdAt: new Date('2024-01-01'),
    lastLogin: new Date()
  },
  {
    id: '2',
    email: 'manager@pldg.dev',
    name: 'Program Manager',
    role: UserRole.MANAGER,
    createdAt: new Date('2024-01-01'),
    lastLogin: new Date()
  },
  {
    id: '3',
    email: 'viewer@pldg.dev',
    name: 'Viewer User',
    role: UserRole.VIEWER,
    createdAt: new Date('2024-01-01'),
    lastLogin: new Date()
  }
];

export class AuthService {
  private static instance: AuthService;
  private currentUser: User | null = null;

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async login(credentials: LoginCredentials): Promise<User> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const user = MOCK_USERS.find(u => u.email === credentials.email);
    
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // In production, verify password hash
    if (credentials.password !== 'password123') {
      throw new Error('Invalid email or password');
    }

    // Update last login
    user.lastLogin = new Date();
    this.currentUser = user;

    // Store in localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_user', JSON.stringify(user));
      localStorage.setItem('auth_token', `token_${user.id}`);
    }

    return user;
  }

  async logout(): Promise<void> {
    this.currentUser = null;
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_token');
    }
  }

  async getCurrentUser(): Promise<User | null> {
    if (this.currentUser) {
      return this.currentUser;
    }

    if (typeof window === 'undefined') {
      return null;
    }

    const storedUser = localStorage.getItem('auth_user');
    const storedToken = localStorage.getItem('auth_token');

    if (!storedUser || !storedToken) {
      return null;
    }

    try {
      const user = JSON.parse(storedUser) as User;
      this.currentUser = user;
      return user;
    } catch {
      // Clear invalid data
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_token');
      return null;
    }
  }

  async refreshUser(): Promise<User | null> {
    // In production, this would make an API call to refresh user data
    return this.getCurrentUser();
  }

  isAuthenticated(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    
    return !!(localStorage.getItem('auth_token') && localStorage.getItem('auth_user'));
  }
}

export const authService = AuthService.getInstance();
```

### 3. Create `src/hooks/useAuth.ts`

```typescript
import { useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { AuthContextType } from '@/types/auth';

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

export function useRequireAuth() {
  const auth = useAuth();
  
  if (!auth.isAuthenticated) {
    throw new Error('Authentication required');
  }
  
  return auth;
}
```

### 4. Create `src/context/AuthContext.tsx`

```typescript
'use client';

import React, { createContext, useReducer, useEffect, ReactNode } from 'react';
import { 
  AuthState, 
  AuthContextType, 
  LoginCredentials, 
  Permission, 
  UserRole,
  ROLE_PERMISSIONS 
} from '@/types/auth';
import { authService } from '@/lib/auth';

const initialState: AuthState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null
};

type AuthAction = 
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: any }
  | { type: 'AUTH_ERROR'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'CLEAR_ERROR' };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return { ...state, isLoading: true, error: null };
    
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isLoading: false,
        isAuthenticated: true,
        error: null
      };
    
    case 'AUTH_ERROR':
      return {
        ...state,
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: action.payload
      };
    
    case 'AUTH_LOGOUT':
      return {
        ...state,
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null
      };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    default:
      return state;
  }
}

export const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      dispatch({ type: 'AUTH_START' });
      const user = await authService.getCurrentUser();
      
      if (user) {
        dispatch({ type: 'AUTH_SUCCESS', payload: user });
      } else {
        dispatch({ type: 'AUTH_LOGOUT' });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      dispatch({ type: 'AUTH_ERROR', payload: 'Failed to initialize authentication' });
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      dispatch({ type: 'AUTH_START' });
      const user = await authService.login(credentials);
      dispatch({ type: 'AUTH_SUCCESS', payload: user });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      dispatch({ type: 'AUTH_ERROR', payload: message });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      dispatch({ type: 'AUTH_LOGOUT' });
    } catch (error) {
      console.error('Logout error:', error);
      dispatch({ type: 'AUTH_LOGOUT' }); // Still logout on error
    }
  };

  const refreshUser = async () => {
    try {
      const user = await authService.refreshUser();
      if (user) {
        dispatch({ type: 'AUTH_SUCCESS', payload: user });
      } else {
        dispatch({ type: 'AUTH_LOGOUT' });
      }
    } catch (error) {
      console.error('Refresh user error:', error);
      dispatch({ type: 'AUTH_ERROR', payload: 'Failed to refresh user data' });
    }
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!state.user) return false;
    const rolePermissions = ROLE_PERMISSIONS[state.user.role] || [];
    return rolePermissions.includes(permission);
  };

  const hasRole = (role: UserRole): boolean => {
    return state.user?.role === role;
  };

  const contextValue: AuthContextType = {
    ...state,
    login,
    logout,
    refreshUser,
    hasPermission,
    hasRole
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
```

### 5. Create `src/components/auth/LoginForm.tsx`

```typescript
'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LoginCredentials } from '@/types/auth';

export function LoginForm() {
  const { login, isLoading, error } = useAuth();
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: ''
  });
  const [showDemo, setShowDemo] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await login(credentials);
    } catch (error) {
      // Error is handled by the AuthContext
      console.error('Login failed:', error);
    }
  };

  const handleDemoLogin = (role: string) => {
    const demoCredentials = {
      admin: { email: 'admin@pldg.dev', password: 'password123' },
      manager: { email: 'manager@pldg.dev', password: 'password123' },
      viewer: { email: 'viewer@pldg.dev', password: 'password123' }
    };

    const creds = demoCredentials[role as keyof typeof demoCredentials];
    if (creds) {
      setCredentials(creds);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            PLDG Dashboard Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to access the developer engagement dashboard
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your email"
                value={credentials.email}
                onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your password"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">Demo Accounts</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('admin')}
                className="px-3 py-2 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('manager')}
                className="px-3 py-2 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
              >
                Manager
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('viewer')}
                className="px-3 py-2 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200"
              >
                Viewer
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### 6. Create `src/components/auth/RoleGuard.tsx`

```typescript
'use client';

import React, { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { UserRole, Permission } from '@/types/auth';

interface RoleGuardProps {
  children: ReactNode;
  requiredRole?: UserRole;
  requiredPermission?: Permission;
  fallback?: ReactNode;
  requireAll?: boolean; // If both role and permission are specified
}

export function RoleGuard({
  children,
  requiredRole,
  requiredPermission,
  fallback = <div className="text-center text-gray-500 py-8">Access denied</div>,
  requireAll = false
}: RoleGuardProps) {
  const { user, hasRole, hasPermission, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <>{fallback}</>;
  }

  // Check permissions
  let hasRequiredRole = true;
  let hasRequiredPermission = true;

  if (requiredRole) {
    hasRequiredRole = hasRole(requiredRole);
  }

  if (requiredPermission) {
    hasRequiredPermission = hasPermission(requiredPermission);
  }

  // Determine access based on requireAll flag
  const hasAccess = requireAll 
    ? (hasRequiredRole && hasRequiredPermission)
    : (hasRequiredRole || hasRequiredPermission);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Convenience components for common use cases
export function AdminOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard requiredRole={UserRole.ADMIN} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

export function ManagerOrAdmin({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const { user } = useAuth();
  const hasAccess = user && (user.role === UserRole.ADMIN || user.role === UserRole.MANAGER);
  
  if (!hasAccess) {
    return <>{fallback || <div className="text-center text-gray-500 py-8">Manager or Admin access required</div>}</>;
  }
  
  return <>{children}</>;
}

export function WithPermission({ 
  children, 
  permission, 
  fallback 
}: { 
  children: ReactNode; 
  permission: Permission; 
  fallback?: ReactNode;
}) {
  return (
    <RoleGuard requiredPermission={permission} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}
```

### 7. Create `src/app/login/page.tsx`

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // Will redirect
  }

  return <LoginForm />;
}
```

### 8. Create `src/lib/__tests__/auth.test.ts`

```typescript
import { AuthService } from '../auth';
import { UserRole } from '@/types/auth';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = AuthService.getInstance();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const credentials = {
        email: 'admin@pldg.dev',
        password: 'password123'
      };

      const user = await authService.login(credentials);

      expect(user).toBeDefined();
      expect(user.email).toBe(credentials.email);
      expect(user.role).toBe(UserRole.ADMIN);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_user', expect.any(String));
      expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_token', expect.any(String));
    });

    it('should throw error for invalid email', async () => {
      const credentials = {
        email: 'invalid@example.com',
        password: 'password123'
      };

      await expect(authService.login(credentials)).rejects.toThrow('Invalid email or password');
    });

    it('should throw error for invalid password', async () => {
      const credentials = {
        email: 'admin@pldg.dev',
        password: 'wrongpassword'
      };

      await expect(authService.login(credentials)).rejects.toThrow('Invalid email or password');
    });
  });

  describe('logout', () => {
    it('should clear user data and localStorage', async () => {
      await authService.logout();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_user');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
    });
  });

  describe('getCurrentUser', () => {
    it('should return user from localStorage if valid', async () => {
      const mockUser = {
        id: '1',
        email: 'admin@pldg.dev',
        name: 'Admin User',
        role: UserRole.ADMIN,
        createdAt: new Date('2024-01-01'),
        lastLogin: new Date()
      };

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'auth_user') return JSON.stringify(mockUser);
        if (key === 'auth_token') return 'token_1';
        return null;
      });

      const user = await authService.getCurrentUser();

      expect(user).toEqual(mockUser);
    });

    it('should return null if no stored data', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const user = await authService.getCurrentUser();

      expect(user).toBeNull();
    });

    it('should clear invalid data and return null', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'auth_user') return 'invalid json';
        if (key === 'auth_token') return 'token_1';
        return null;
      });

      const user = await authService.getCurrentUser();

      expect(user).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_user');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
    });
  });
});
```

## FILES TO MODIFY

### 1. Modify `src/context/index.ts`

```typescript
// Add this export
export { AuthProvider, AuthContext } from './AuthContext';
export { DashboardSystemProvider, DashboardSystemContext } from './DashboardSystemContext';
```

### 2. Modify `src/app/layout.tsx`

```typescript
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import { DashboardSystemProvider } from '@/context/DashboardSystemContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'PLDG Developer Engagement Dashboard',
  description: 'Track developer engagement and program metrics',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <DashboardSystemProvider>
            {children}
          </DashboardSystemProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
```

### 3. Modify `src/app/dashboard/page.tsx`

Add authentication check and role-based features:

```typescript
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardSystem } from '@/lib/system';
import { RoleGuard, AdminOnly, WithPermission } from '@/components/auth/RoleGuard';
import { Permission, UserRole } from '@/types/auth';
import { Button } from '@/components/ui/button';
import { exportDashboardAction } from '@/lib/actions';

// Import your existing dashboard components
// import { DashboardMetrics } from '@/components/dashboard/DashboardMetrics';
// import { EngagementCharts } from '@/components/dashboard/EngagementCharts';
// ... other imports

export default function DashboardPage() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { 
    processedData, 
    isLoading: dataLoading, 
    isError, 
    refresh 
  } = useDashboardSystem();

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleExport = async () => {
    if (processedData) {
      try {
        await exportDashboardAction(processedData);
      } catch (error) {
        console.error('Export failed:', error);
      }
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with user info and logout */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">PLDG Dashboard</h1>
              <p className="text-sm text-gray-500">
                Welcome back, {user.name} ({user.role})
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <WithPermission permission={Permission.EXPORT_DATA}>
                <Button 
                  onClick={handleExport}
                  disabled={!processedData}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Export Data
                </Button>
              </WithPermission>
              
              <AdminOnly>
                <Button 
                  onClick={() => router.push('/admin')}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Admin Panel
                </Button>
              </AdminOnly>
              
              <Button 
                onClick={handleLogout}
                variant="outline"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isError ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            Failed to load dashboard data. 
            <button 
              onClick={refresh}
              className="ml-2 underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="
```
