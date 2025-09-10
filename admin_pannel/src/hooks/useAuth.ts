// src/hooks/useAuth.tsx
import { useAuth as useAuthContext } from '@/contexts/AuthContext';

export const useAuthWithToken = () => {
  return useAuthContext(); // The context now directly provides the token
};

// Re-export the original useAuth for compatibility
export { useAuth } from '@/contexts/AuthContext';