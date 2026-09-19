/**
 * NEXA // APPLICATION ROOT
 * Wraps the whole command center in the shared NEXA system context so every
 * HUD panel, module and overlay observes the same live state machine.
 */

import { NexaSystemProvider } from './state/NexaSystemContext';
import { NexaApplication } from './NexaApplication';
import { OwnerLockProvider } from './security/ownerLock';

export default function App() {
  return (
    <NexaSystemProvider>
      <OwnerLockProvider>
        <NexaApplication />
      </OwnerLockProvider>
    </NexaSystemProvider>
  );
}
