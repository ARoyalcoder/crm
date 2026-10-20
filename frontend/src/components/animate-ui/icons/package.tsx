'use client';

import * as React from 'react';
import { motion, type Variants } from 'motion/react';

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@animate-ui/react/icons';

type PackageProps = IconProps<keyof typeof animations>;

const animations = {
  default: {
    group: {
      initial: { y: 0, scale: 1 },
      animate: {
        y: [0, -3, 0],
        scale: [1, 1.08, 1],
        transition: { duration: 0.55, ease: 'easeInOut' as const },
      },
    },
    flap: {
      initial: { y: 0 },
      animate: {
        y: [0, -2, 0],
        transition: { duration: 0.45, delay: 0.08, ease: 'easeOut' as const },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: PackageProps) {
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
        d="m7.5 4.27 9 5.15"
        variants={variants.flap}
        initial="initial"
        animate={controls}
      />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </motion.svg>
  );
}

function Package(props: PackageProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  Package,
  Package as PackageIcon,
  type PackageProps,
  type PackageProps as PackageIconProps,
};
