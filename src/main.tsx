import React, { Suspense, lazy } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

const Admin = lazy(() => import('./Admin'));
const root = document.getElementById('root')!;
const initial = document.getElementById('nucleus-data');
const element = <React.StrictMode>{window.location.pathname.startsWith('/admin')
  ? <Suspense fallback={<div className="page-loading">Opening the control room…</div>}><Admin /></Suspense>
  : <App initialData={initial ? JSON.parse(initial.textContent || '{}') : undefined} pathname={window.location.pathname} />}</React.StrictMode>;
if (root.hasChildNodes()) hydrateRoot(root, element);
else createRoot(root).render(element);
