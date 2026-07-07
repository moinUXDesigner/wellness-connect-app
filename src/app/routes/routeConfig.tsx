import { BrowserRouter } from 'react-router';
import AppRoutes from './AppRoutes';

export default function RouteConfig() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
