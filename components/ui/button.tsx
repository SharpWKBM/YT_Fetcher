import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * shadcn-style button. Variants: default | destructive | outline | secondary | ghost | link.
 * Sizes: sm | default | lg | icon.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ' +
    'ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 ' +
    'focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * Render as the immediate child element (a, Link, etc.) instead of <button>,
   * merging the button styles onto it. Mirrors shadcn/ui's Slot pattern but
   * implemented inline via cloneElement to avoid pulling in @radix-ui/react-slot.
   */
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const finalClassName = cn(buttonVariants({ variant, size, className }));
    if (asChild && React.isValidElement(children)) {
      const childElement = children as React.ReactElement<{ className?: string }>;
      return React.cloneElement(childElement, {
        className: cn(finalClassName, childElement.props.className),
        ...props,
        ref,
      } as never);
    }
    return (
      <button ref={ref} className={finalClassName} {...props}>
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
