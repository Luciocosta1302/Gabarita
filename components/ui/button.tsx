import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Botões "carimbo": contorno de tinta e sombra dura que afunda ao tocar (o 3D do Duolingo
 * com o traço de impressão japonesa). ghost e link ficam leves para não poluir a tela.
 */
const PRESS = "border-2 border-ink shadow-[0_3px_0_var(--ink)] active:translate-y-[2px] active:shadow-[0_1px_0_var(--ink)]";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold tracking-wide transition-[transform,box-shadow,background-color,filter] duration-75 disabled:pointer-events-none disabled:opacity-45 outline-none focus-visible:ring-ring/60 focus-visible:ring-[3px] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        default: `bg-primary text-primary-foreground hover:brightness-105 ${PRESS}`,
        destructive: `bg-destructive text-white hover:brightness-105 ${PRESS}`,
        outline: `bg-card text-foreground hover:bg-accent ${PRESS}`,
        secondary: `bg-secondary text-secondary-foreground hover:brightness-110 ${PRESS}`,
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 gap-1.5 px-3",
        lg: "h-12 px-6 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />
  );
}

export { Button, buttonVariants };
