import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Landing from './pages/Landing';
import FarmerAuth from './pages/FarmerAuth';
import BuyerAuth from './pages/BuyerAuth';
import FarmerDashboard from './pages/FarmerDashboard';
import BuyerMarketplace from './pages/BuyerMarketplace';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth/farmer" element={<FarmerAuth />} />
          <Route path="/auth/buyer" element={<BuyerAuth />} />
          <Route path="/farmer/dashboard" element={<FarmerDashboard />} />
          <Route path="/buyer/marketplace" element={<BuyerMarketplace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
