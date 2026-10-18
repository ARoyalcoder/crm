import { useAuth } from '@/features/auth/auth-context'
import { ControlTowerPage } from '@/features/analytics/pages/ControlTowerPage'
import { MyWorkPage } from '@/features/analytics/pages/MyWorkPage'

/**
 * Where everyone lands. People who run the business (ANALYTICS_VIEW) open the control tower; everyone else opens
 * their own work. Both are always reachable from the sidebar; this only decides which one is first.
 */
export function HomePage() {
  const { user } = useAuth()
  return user?.permissions.includes('ANALYTICS_VIEW') ? <ControlTowerPage /> : <MyWorkPage />
}
