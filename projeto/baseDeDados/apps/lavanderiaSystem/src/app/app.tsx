// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { MantineProvider } from '@mantine/core';
import styles from './app.module.scss';

import NxWelcome from './nx-welcome';

export function App() {
  return (
    <div>
      <NxWelcome title="lavanderiaSystem" />
    </div>
  );
}

export default App;
