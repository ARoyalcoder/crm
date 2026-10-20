'use client';

import * as React from 'react';
import { motion, type Variants } from 'motion/react';

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@animate-ui/react/icons';

type BriefcasePlusProps = IconProps<keyof typeof animations>;

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
    plus: {
      initial: { scale: 1, rotate: 0 },
      animate: {
        scale: [1, 1.35, 1],
        rotate: [0, 90, 0],
        transition: { duration: 0.5, delay: 0.08, ease: 'easeInOut' as const },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: BriefcasePlusProps) {
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
        d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"
        variants={variants.handle}
        initial="initial"
        animate={controls}
      />
      <rect width="20" height="14" x="2" y="6" rx="2" />
      <motion.g
        variants={variants.plus}
        initial="initial"
        animate={controls}
        style={{ transformOrigin: '12px 13px' }}
      >
        <path d="M12 10v6" />
        <path d="M9 13h6" />
      </motion.g>
    </motion.svg>
  );
}

function BriefcasePlus(props: BriefcasePlusProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  BriefcasePlus,
  BriefcasePlus as BriefcasePlusIcon,
  type BriefcasePlusProps,
  type BriefcasePlusProps as BriefcasePlusIconProps,
};
