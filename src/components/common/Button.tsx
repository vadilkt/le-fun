import React from 'react';
import { Loader2 } from 'lucide-react';
import './Button.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            className = '',
            variant = 'primary',
            size = 'md',
            isLoading = false,
            leftIcon,
            rightIcon,
            children,
            disabled,
            fullWidth = false,
            ...props
        },
        ref
    ) => {
        const variantClass = `btn-${variant}`;
        const sizeClass = `btn-${size}`;
        const widthClass = fullWidth ? 'btn-full' : '';

        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={`btn ${variantClass} ${sizeClass} ${widthClass} ${className}`}
                {...props}
            >
                {isLoading && <Loader2 className="btn-spinner" size={16} />}
                {!isLoading && leftIcon}
                {children}
                {!isLoading && rightIcon}
            </button>
        );
    }
);

Button.displayName = 'Button';
