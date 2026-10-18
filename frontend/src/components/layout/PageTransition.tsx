import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

type PageTransitionProps = {
  children: ReactNode
  locationKey: string
}

/**
 * Smooth entrance motion for every page, mirroring the fluid cubic-bezier curve from LoginPage.
 */
export function PageTransition({ children, locationKey }: PageTransitionProps) {
  return (
    <motion.div
      key={locationKey}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{
        duration: 0.24,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="min-h-full"
    >
      {children}
    </motion.div>
  )
}
