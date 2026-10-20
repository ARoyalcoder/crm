'use client';

import * as React from 'react';
import { motion, type Variants } from 'motion/react';

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@animate-ui/react/icons';

type BriefcaseProps = IconProps<keyof typeof animations>;

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
    caseBody: {
      initial: { scaleY: 1 },
      animate: {
        scaleY: [1, 0.92, 1.04, 1],
        transition: { duration: 0.5, delay: 0.05, ease: 'easeOut' as const },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: BriefcaseProps) {
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
      {/* Top Handle and Straps: Lifts on hover */}
      <motion.path
        d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"
        variants={variants.handle}
        initial="initial"
        animate={controls}
      />
      {/* Suitcase Body */}
      <motion.rect
        width="20"
        height="14"
        x="2"
        y="6"
        rx="2"
        variants={variants.caseBody}
        initial="initial"
        animate={controls}
      />
    </motion.svg>
  );
}

function Briefcase(props: BriefcaseProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  Briefcase,
  Briefcase as BriefcaseIcon,
  type BriefcaseProps,
  type BriefcaseProps as BriefcaseIconProps,
};
