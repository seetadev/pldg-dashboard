'use client';

import {
  createContext,
  useContext,
  forwardRef,
  ElementRef,
  ComponentPropsWithoutRef,
} from 'react';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';
import { toggleVariants } from '@/components/ui/toggle';

const ToggleGroupContext = createContext<VariantProps<typeof toggleVariants>>({
  size: 'default',
  variant: 'default',
});

const ToggleGroupContent = forwardRef<
  ElementRef<typeof ToggleGroup.Root>,
  ComponentPropsWithoutRef<typeof ToggleGroup.Root> &
    VariantProps<typeof toggleVariants>
>(({ className, variant, size, children, ...props }, ref) => (
  <ToggleGroup.Root
    ref={ref}
    className={cn('flex items-center justify-center gap-1', className)}
    {...props}
  >
    <ToggleGroupContext.Provider value={{ variant, size }}>
      {children}
    </ToggleGroupContext.Provider>
  </ToggleGroup.Root>
));

ToggleGroupContent.displayName = ToggleGroup.Root.displayName;

const ToggleGroupItem = forwardRef<
  ElementRef<typeof ToggleGroup.Item>,
  ComponentPropsWithoutRef<typeof ToggleGroup.Item> &
    VariantProps<typeof toggleVariants>
>(({ className, children, variant, size, ...props }, ref) => {
  const context = useContext(ToggleGroupContext);

  return (
    <ToggleGroup.Item
      ref={ref}
      className={cn(
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
        }),
        className
      )}
      {...props}
    >
      {children}
    </ToggleGroup.Item>
  );
});

ToggleGroupItem.displayName = ToggleGroup.Item.displayName;

export { ToggleGroupContent, ToggleGroupItem };
