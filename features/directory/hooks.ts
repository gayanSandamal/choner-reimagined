import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getActiveDirectory, setShowInDirectory } from './api';

export function useActiveDirectory(enabled = true) {
  return useQuery({ queryKey: ['active-directory'], queryFn: getActiveDirectory, enabled });
}

export function useSetShowInDirectory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setShowInDirectory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['active-directory'] })
  });
}
