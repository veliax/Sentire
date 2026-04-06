import { Navigate, Outlet } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export function ProtectedRoute() {
  const { isLoggedIn } = useApp();
  return isLoggedIn ? <Outlet /> : <Navigate to="/login" replace />;
}
