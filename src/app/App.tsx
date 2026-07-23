import { BrowserRouter } from 'react-router';
import AppRoutes from './routes/AppRoutes';
import PwaInstallPrompt from './features/shared/components/PwaInstallPrompt';
import { Toaster } from './components/ui/sonner';

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <PwaInstallPrompt />
      <Toaster />
    </BrowserRouter>
  );
}
