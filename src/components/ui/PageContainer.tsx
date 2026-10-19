import type { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

/** Общая обёртка страниц: ширина, центрирование и отступы. */
export function PageContainer({ children, className = '' }: PageContainerProps) {
  return (
    <div className={`mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10 ${className}`}>
      {children}
    </div>
  );
}
