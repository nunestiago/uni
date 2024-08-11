import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';

import { MantineProvider } from '@mantine/core';
import AppRoute from './app/routes/AppRoute';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <StrictMode>
    <MantineProvider>
      <AppRoute />
    </MantineProvider>
  </StrictMode>
);
