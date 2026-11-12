import React from 'react';

interface DashboardButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

export function DashboardButton({ variant = 'secondary', children, style, ...props }: DashboardButtonProps) {
  const baseStyle: React.CSSProperties = {
    padding: "8px 16px",
    borderRadius: 8,
    fontWeight: variant === 'primary' ? 600 : 400,
    fontSize: 13,
    cursor: "pointer",
    textDecoration: "none",
    ...style
  };

  const variantStyle: React.CSSProperties = variant === 'primary' 
    ? { background: "#E8B66F", color: "#0B0907", border: "none" }
    : { background: "transparent", color: "#F7F3ED", border: "1px solid #3B2B1E" };

  return (
    <button style={{ ...baseStyle, ...variantStyle }} {...props}>
      {children}
    </button>
  );
}
