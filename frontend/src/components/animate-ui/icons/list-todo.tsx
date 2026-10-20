'use client';

import * as React from 'react';
import { motion, type Variants } from 'motion/react';

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from '@animate-ui/react/icons';

type ListTodoProps = IconProps<keyof typeof animations>;

const animations = {
  default: {
    group: {
      initial: { scale: 1 },
      animate: {
        scale: [1, 1.08, 1],
        transition: { duration: 0.5, ease: 'easeInOut' },
      },
    },
    check: {
      initial: { scale: 1 },
      animate: {
        scale: [1, 1.3, 0.9, 1],
        transition: { duration: 0.4, ease: 'easeOut' },
      },
    },
    lines: {
      initial: { x: 0 },
      animate: {
        x: [0, 2, 0],
        transition: { duration: 0.45, delay: 0.08, ease: 'easeOut' },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: ListTodoProps) {
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
      <rect x="3" y="5" width="6" height="6" rx="1" />
      <motion.path
        d="m3 17 2 2 4-4"
        variants={variants.check}
        initial="initial"
        animate={controls}
      />
      <motion.g variants={variants.lines} initial="initial" animate={controls}>
        <path d="M13 6h8" />
        <path d="M13 12h8" />
        <path d="M13 18h8" />
      </motion.g>
    </motion.svg>
  );
}

function ListTodo(props: ListTodoProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  ListTodo,
  ListTodo as ListTodoIcon,
  type ListTodoProps,
  type ListTodoProps as ListTodoIconProps,
};
