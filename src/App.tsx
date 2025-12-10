import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Contexts
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './hooks/useCart';

// Common components
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { LoadingSpinner } from './components/common/LoadingSpinner';

// Layouts
import { CustomerLayout } from './components/layouts/CustomerLayout';
import { KitchenLayout } from './components/layouts/KitchenLayout';
import { StaffLayout } from './components/layouts/StaffLayout';

// Auth pages
import { LoginPage } from './pages/auth/LoginPage';
import { CustomerAuthPage } from './pages/auth/CustomerAuthPage';

// Customer pages
import { MenuPage } from './pages/customer/MenuPage';
import { CartPage } from './pages/customer/CartPage';
import { CheckoutPage } from './pages/customer/CheckoutPage';
import { CustomerOrdersPage } from './pages/customer/OrdersPage';

// Kitchen pages
import { KitchenDisplayPage } from './pages/kitchen/KitchenDisplayPage';

// Staff pages
import { StaffDashboardPage } from './pages/staff/StaffDashboardPage';
import { StaffOrdersPage } from './pages/staff/StaffOrdersPage';
import { MenuManagementPage } from './pages/staff/MenuManagementPage';

// Admin pages
import { DashboardPage } from './pages/admin/DashboardPage';
import { InventoryPage } from './pages/admin/InventoryPage';
import { AccountingPage } from './pages/admin/AccountingPage';
import { EmployeesPage } from './pages/admin/EmployeesPage';

// Role-based redirect component
function RoleBasedRedirect() {
  const { profile, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen message="Chargement..." />;
  }

  // Redirect based on role
  switch (profile?.role) {
    case 'client':
      return <Navigate to="/customer" replace />;
    case 'cuisinier':
      return <Navigate to="/kitchen" replace />;
    case 'serveur':
    case 'caissier':
      return <Navigate to="/staff" replace />;
    case 'manager':
      return <Navigate to="/staff" replace />;
    case 'admin':
      return <Navigate to="/admin" replace />;
    default:
      return <Navigate to="/customer/login" replace />;
  }
}

function AppRoutes() {
  return (
    <Routes>
      {/* ==================== */}
      {/* PUBLIC ROUTES */}
      {/* ==================== */}

      {/* Staff/Admin Login — URL secrète */}
      <Route path="/backoffice" element={<LoginPage />} />

      {/* Customer Login/Register */}
      <Route path="/customer/login" element={<CustomerAuthPage />} />

      {/* ==================== */}
      {/* CUSTOMER ROUTES */}
      {/* ==================== */}
      <Route
        path="/customer"
        element={
          <ProtectedRoute allowedRoles={['client']}>
            <CustomerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<MenuPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="orders" element={<CustomerOrdersPage />} />
      </Route>

      {/* ==================== */}
      {/* KITCHEN ROUTES */}
      {/* ==================== */}
      <Route
        path="/kitchen"
        element={
          <ProtectedRoute allowedRoles={['cuisinier', 'manager', 'admin']}>
            <KitchenLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<KitchenDisplayPage />} />
      </Route>

      {/* ==================== */}
      {/* STAFF ROUTES */}
      {/* ==================== */}
      <Route
        path="/staff"
        element={
          <ProtectedRoute allowedRoles={['serveur', 'caissier', 'manager', 'admin']}>
            <StaffLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<StaffDashboardPage />} />
        <Route path="orders" element={<StaffOrdersPage />} />
        <Route
          path="menus"
          element={
            <ProtectedRoute allowedRoles={['manager', 'admin']}>
              <MenuManagementPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* ==================== */}
      {/* ADMIN ROUTES */}
      {/* ==================== */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <StaffLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="orders" element={<StaffOrdersPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="accounting" element={<AccountingPage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="menus" element={<MenuManagementPage />} />
      </Route>

      {/* ==================== */}
      {/* FALLBACK ROUTES */}
      {/* ==================== */}

      {/* Root redirect based on role */}
      <Route path="/" element={<RoleBasedRedirect />} />

      {/* Catch-all redirect */}
      <Route path="*" element={<RoleBasedRedirect />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <div className="app-root">
            <AppRoutes />
          </div>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
