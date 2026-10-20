'use client';

import * as React from 'react';
import { motion, type Variants } from 'motion/react';

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@animate-ui/react/icons';

type TargetProps = IconProps<keyof typeof animations>;

const animations = {
  default: {
    group: {
      initial: { scale: 1 },
      animate: {
        scale: [1, 1.15, 0.95, 1],
        transition: { duration: 0.6, ease: 'easeInOut' },
      },
    },
    outer: {
      initial: { scale: 1, opacity: 1 },
      animate: {
        scale: [1, 1.08, 1],
        transition: { duration: 0.5, ease: 'easeOut' },
      },
    },
    middle: {
      initial: { scale: 1 },
      animate: {
        scale: [1, 1.12, 1],
        transition: { duration: 0.5, delay: 0.08, ease: 'easeOut' },
      },
    },
    bullseye: {
      initial: { scale: 1 },
      animate: {
        scale: [1, 1.4, 0.9, 1],
        transition: { duration: 0.45, delay: 0.12, ease: 'easeInOut' },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: TargetProps) {
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
      <motion.circle
        cx="12"
        cy="12"
        r="10"
        variants={variants.outer}
        initial="initial"
        animate={controls}
      />
      <motion.circle
        cx="12"
        cy="12"
        r="6"
        variants={variants.middle}
        initial="initial"
        animate={controls}
      />
      <motion.circle
        cx="12"
        cy="12"
        r="2"
        variants={variants.bullseye}
        initial="initial"
        animate={controls}
      />
    </motion.svg>
  );
}

function Target(props: TargetProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  Target,
  Target as TargetIcon,
  type TargetProps,
  type TargetProps as TargetIconProps,
};
