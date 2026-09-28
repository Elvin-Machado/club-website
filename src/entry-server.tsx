<<<<<<< HEAD
=======
<<<<<<< HEAD
import { renderToString } from 'react-dom/server';
import App from './App';
import type { SiteData } from './types';

export function render(data: SiteData, pathname = '/') { return renderToString(<App initialData={data} pathname={pathname} />); }
=======
>>>>>>> e6a133606ce9d4b7d43c220df69bac3528f841ae
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import App from './App';
import type { SiteData } from './types';

export function render(data: SiteData, url: string) { return renderToString(<StaticRouter location={url}><App initialData={data} /></StaticRouter>); }
<<<<<<< HEAD
=======
>>>>>>> 24551fe568b8ad3d66a35507c45e3569b24f2d26
>>>>>>> e6a133606ce9d4b7d43c220df69bac3528f841ae
