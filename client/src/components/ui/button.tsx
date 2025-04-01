import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:ring-offset-neutral-950 dark:focus-visible:ring-neutral-300",
  {
    variants: {
      variant: {
        default: "bg-neutral-900 text-neutral-50 hover:bg-neutral-900/90 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-50/90",
        destructive:
          "bg-red-500 text-neutral-50 hover:bg-red-500/90 dark:bg-red-900 dark:text-neutral-50 dark:hover:bg-red-900/90",
        outline:
          "border border-neutral-200 bg-white hover:bg-neutral-100 hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:bg-neutral-800 dark:hover:text-neutral-50",
        secondary:
          "bg-neutral-100 text-neutral-900 hover:bg-neutral-100/80 dark:bg-neutral-800 dark:text-neutral-50 dark:hover:bg-neutral-800/80",
        ghost: "hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-50",
        link: "text-neutral-900 underline-offset-4 hover:underline dark:text-neutral-50",
        // Telegram görevleri için özel buton varyantları
        telegram: "bg-[#0088cc] text-white hover:bg-[#0088cc]/90",
        telegramOutline: "border border-[#0088cc] text-[#0088cc] hover:bg-[#0088cc]/10",
        social: "bg-green-500/20 text-green-400 hover:bg-green-500/30",
        referral: "bg-pink-500/20 text-pink-400 hover:bg-pink-500/30"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

// Telegram görevleri için özel buton
export interface TelegramButtonProps extends ButtonProps {
  telegramAction?: string;
  telegramTarget?: string | null;
}

const TelegramButton = React.forwardRef<HTMLButtonElement, TelegramButtonProps>(
  ({ className, variant = "telegram", telegramAction, telegramTarget, children, ...props }, ref) => {
    // Buton içeriğini belirle
    let buttonText = children;
    
    if (!children) {
      switch (telegramAction) {
        case 'join_channel':
          buttonText = 'Kanala Katıl';
          break;
        case 'send_message':
          buttonText = 'Mesaj Gönder';
          break;
        case 'invite_friends':
          buttonText = 'Davet Et';
          break;
        default:
          buttonText = 'Telegram';
      }
    }
    
    return (
      <Button 
        className={cn("flex items-center gap-2", className)}
        variant={variant} 
        ref={ref}
        {...props}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="#0088cc" opacity="0.2"/>
          <path d="M17.3 7.3L15.8333 16.4667C15.8333 16.4667 15.5833 17.1667 14.8333 16.8667L9.83333 12.8667L9.83333 12.8667L8 12.3333C8 12.3333 7.58333 12.1933 7.53333 11.8667C7.48333 11.54 7.98333 11.3667 7.98333 11.3667L16.6667 7.83333C16.6667 7.83333 17.3 7.56667 17.3 7.3Z" fill="currentColor"/>
          <path d="M9.83333 12.8667L9.5 16.3333C9.5 16.3333 9.41667 16.8333 9.91667 16.8333C10.4167 16.8333 11.6667 15.6667 11.6667 15.6667L14.8333 12.8667L9.83333 12.8667Z" fill="currentColor"/>
        </svg>
        {buttonText}
      </Button>
    );
  }
);
TelegramButton.displayName = "TelegramButton";

export { Button, buttonVariants, TelegramButton }
