import { useQuery } from '@tanstack/react-query'
import { fetchProfile } from '@/services/profiles'

export function useProfile() {
  return useQuery({ queryKey: ['profile'], queryFn: fetchProfile })
}
