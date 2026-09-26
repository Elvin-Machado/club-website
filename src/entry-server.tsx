import { renderToString } from 'react-dom/server';
import App from './App';
import type { SiteData } from './types';

export function render(data: SiteData, pathname = '/') { return renderToString(<App initialData={data} pathname={pathname} />); }
