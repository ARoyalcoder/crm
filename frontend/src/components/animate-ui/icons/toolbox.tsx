'use client';

import * as React from 'react';
import { motion, type Variants } from 'motion/react';

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@animate-ui/react/icons';

type ToolboxProps = IconProps<keyof typeof animations>;

const animations = {
  default: {
    group: {
      initial: { scale: 1 },
      animate: {
        scale: [1, 1.07, 0.96, 1],
        transition: { duration: 0.5, ease: 'easeInOut' as const },
      },
    },
    handle: {
      initial: { y: 0 },
      animate: {
        y: [0, -3, 0],
        transition: { duration: 0.45, ease: 'easeInOut' as const },
      },
    },
    latches: {
      initial: { scaleY: 1 },
      animate: {
        scaleY: [1, 1.4, 1],
        transition: { duration: 0.4, delay: 0.1, ease: 'easeOut' as const },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: ToolboxProps) {
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
      {/* Handle */}
      <motion.g variants={variants.handle} initial="initial" animate={controls}>
        <path d="M10 2v3" />
        <path d="M14 2v3" />
        <path d="M9 2h6" />
      </motion.g>
      {/* Body */}
      <path d="M18 21H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2z" />
      <path d="M2 13h20" />
      {/* Latches */}
      <motion.g variants={variants.latches} initial="initial" animate={controls}>
        <path d="M8 8v1" />
        <path d="M16 8v1" />
      </motion.g>
    </motion.svg>
  );
}

function Toolbox(props: ToolboxProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  Toolbox,
  Toolbox as ToolboxIcon,
  type ToolboxProps,
  type ToolboxProps as ToolboxIconProps,
};
