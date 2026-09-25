import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

/*
 * The one button in the app. Three earlier copies of these class strings —
 * two in upload-statement-view.tsx and one in form-styles.ts — were replaced
 * by this, so a button can no longer drift screen to screen.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md border border-transparent text-sm font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "border-border bg-card text-foreground hover:bg-muted",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/70",
        ghost: "text-foreground hover:bg-muted",
        destructive: "text-destructive hover:bg-destructive/10",
        link: "h-auto p-0 text-foreground underline underline-offset-4 hover:text-primary",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-[0.8125rem]",
        lg: "h-12 px-6",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
