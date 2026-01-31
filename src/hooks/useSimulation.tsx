import { useEffect } from 'react';

// This hook was previously used for demo simulation with mock data.
// Now that we're using a real database, this is a no-op placeholder.
// It could be extended in the future for testing purposes.
export default function useSimulation() {
  useEffect(() => {
    // No-op - all data now comes from the database
  }, []);
}
