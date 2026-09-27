import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import App from './App';
import type { SiteData } from './types';

export function render(data: SiteData, url: string) { return renderToString(<StaticRouter location={url}><App initialData={data} /></StaticRouter>); }
