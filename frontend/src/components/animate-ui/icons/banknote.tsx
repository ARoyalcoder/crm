'use client';

import * as React from 'react';
import { motion, type Variants } from 'motion/react';

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@animate-ui/react/icons';

type BanknoteProps = IconProps<keyof typeof animations>;

const animations = {
  default: {
    group: {
      initial: { rotate: 0, scale: 1 },
      animate: {
        rotate: [0, -6, 6, -3, 0],
        scale: [1, 1.1, 1],
        transition: { duration: 0.6, ease: 'easeInOut' },
      },
    },
    coin: {
      initial: { scale: 1 },
      animate: {
        scale: [1, 1.35, 1],
        transition: { duration: 0.5, delay: 0.1, ease: 'easeOut' },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: BanknoteProps) {
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
      <rect width="20" height="12" x="2" y="6" rx="2" />
      <motion.circle
        cx="12"
        cy="12"
        r="2"
        variants={variants.coin}
        initial="initial"
        animate={controls}
      />
      <path d="M6 12h.01M18 12h.01" />
    </motion.svg>
  );
}

function Banknote(props: BanknoteProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  Banknote,
  Banknote as BanknoteIcon,
  type BanknoteProps,
  type BanknoteProps as BanknoteIconProps,
};
