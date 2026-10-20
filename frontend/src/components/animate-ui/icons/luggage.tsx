'use client';

import * as React from 'react';
import { motion, type Variants } from 'motion/react';

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@animate-ui/react/icons';

type LuggageProps = IconProps<keyof typeof animations>;

const animations = {
  default: {
    group: {
      initial: { rotate: 0, x: 0 },
      animate: {
        rotate: [0, -6, 4, 0],
        x: [0, 2, 0],
        transition: { duration: 0.6, ease: 'easeInOut' as const },
      },
    },
    handle: {
      initial: { y: 0 },
      animate: {
        y: [0, -4, 0],
        transition: { duration: 0.5, ease: 'easeInOut' as const },
      },
    },
    wheels: {
      initial: { rotate: 0 },
      animate: {
        rotate: [0, 360],
        transition: { duration: 0.6, ease: 'linear' as const },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: LuggageProps) {
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
      {/* Extendable Pull Handle */}
      <motion.path
        d="M8 18V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v14"
        variants={variants.handle}
        initial="initial"
        animate={controls}
      />
      {/* Luggage Body */}
      <path d="M6 20h0a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h0" />
      <path d="M10 20h4" />
      {/* Spinning Wheels */}
      <motion.circle
        cx="8"
        cy="20"
        r="2"
        variants={variants.wheels}
        initial="initial"
        animate={controls}
        style={{ transformOrigin: '8px 20px' }}
      />
      <motion.circle
        cx="16"
        cy="20"
        r="2"
        variants={variants.wheels}
        initial="initial"
        animate={controls}
        style={{ transformOrigin: '16px 20px' }}
      />
    </motion.svg>
  );
}

function Luggage(props: LuggageProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  Luggage,
  Luggage as LuggageIcon,
  type LuggageProps,
  type LuggageProps as LuggageIconProps,
};
