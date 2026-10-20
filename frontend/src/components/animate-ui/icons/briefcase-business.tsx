'use client';

import * as React from 'react';
import { motion, type Variants } from 'motion/react';

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@animate-ui/react/icons';

type BriefcaseBusinessProps = IconProps<keyof typeof animations>;

const animations = {
  default: {
    group: {
      initial: { scale: 1 },
      animate: {
        scale: [1, 1.08, 0.96, 1],
        transition: { duration: 0.5, ease: 'easeInOut' as const },
      },
    },
    handle: {
      initial: { y: 0 },
      animate: {
        y: [0, -3.5, 0],
        transition: { duration: 0.45, ease: 'easeInOut' as const },
      },
    },
    latch: {
      initial: { scale: 1 },
      animate: {
        scale: [1, 1.6, 1],
        transition: { duration: 0.4, delay: 0.1, ease: 'easeOut' as const },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: BriefcaseBusinessProps) {
  const { controls } = useAnimateIconContext();
  const variants = getVariants(animations);

  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      variants={variants.group}
      initial="initial"
      animate={controls}
      {...props}
    >
      <motion.path
        d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"
        variants={variants.handle}
        initial="initial"
        animate={controls}
      />
      <rect width="20" height="14" x="2" y="6" rx="2" />
      <path d="M22 13a18.15 18.15 0 0 1-20 0" />
      <motion.path
        d="M12 12h.01"
        variants={variants.latch}
        initial="initial"
        animate={controls}
      />
    </motion.svg>
  );
}

function BriefcaseBusiness(props: BriefcaseBusinessProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  BriefcaseBusiness,
  BriefcaseBusiness as BriefcaseBusinessIcon,
  type BriefcaseBusinessProps,
  type BriefcaseBusinessProps as BriefcaseBusinessIconProps,
};
