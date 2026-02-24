import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router";
import { ErrorBoundary } from '@/components/error/boundary';
import { RouteErrorBoundary } from '@/components/error/route-error-boundary';
import HomePage from '@/pages/home'
import WorkoutPage from '@/pages/workout'
import NutritionPage from '@/pages/nutrition'
import CaloriesPage from '@/pages/calories'
import PantryPage from '@/pages/pantry'
import ProgressPage from '@/pages/progress'
import SetupPage from '@/pages/setup'
import LoginPage from '@/pages/login'
import RegisterPage from '@/pages/register'
import SubscribePage from '@/pages/subscribe'
import SuccessPage from '@/pages/success'
import { Layout } from '@/components/layout'
import '@/index.css'
import { Toaster } from 'sonner'
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { ProtectedRoute } from '@/components/protected-route';
import { PaywallGuard } from '@/components/paywall-guard';
import { Outlet } from 'react-router';

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

// Handle module load failures (e.g., after deployment with stale chunks)
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  window.location.reload();
});

const router = createBrowserRouter([
  {
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <PaywallGuard><Outlet /></PaywallGuard>,
        children: [
          {
            path: "/",
            element: <HomePage />,
          },
          {
            path: "/workout",
            element: <WorkoutPage />,
          },
          {
            path: "/nutrition",
            element: <NutritionPage />,
          },
          {
            path: "/calories",
            element: <CaloriesPage />,
          },
          {
            path: "/pantry",
            element: <PantryPage />,
          },
          {
            path: "/progress",
            element: <ProgressPage />,
          },
        ],
      },
    ],
  },
  {
    path: "/subscribe",
    element: (
      <ProtectedRoute>
        <SubscribePage />
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/success",
    element: (
      <ProtectedRoute>
        <SuccessPage />
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/setup",
    element: (
      <ProtectedRoute>
        <SetupPage />
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/login",
    element: <LoginPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
    errorElement: <RouteErrorBoundary />,
  },
]);

// Signal to parent frame that app is ready
const notifyParentReady = () => {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'preview-ready', url: location.href }, '*')
  }
}

// Do not touch this code
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConvexAuthProvider client={convex}>
      <ErrorBoundary>
        <RouterProvider router={router} />
      </ErrorBoundary>
      <Toaster />
    </ConvexAuthProvider>
  </StrictMode>,
)

// Notify after initial render completes (with fallbacks)
if ('requestIdleCallback' in window) {
  window.requestIdleCallback(notifyParentReady)
} else {
  setTimeout(notifyParentReady, 0)
}
// Also notify on load as backup in case idle callback is delayed
window.addEventListener('load', notifyParentReady, { once: true })
