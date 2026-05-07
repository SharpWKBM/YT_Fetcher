import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Lightweight avatar — an image with graceful fallback to initials when the
 * src 404s or is missing. Avoids pulling in @radix-ui/react-avatar for now.
 */
interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback?: string;
}

export function Avatar({ src, alt = '', fallback = '?', className, ...props }: AvatarProps) {
  const [errored, setErrored] = React.useState(false);
  const showImg = !!src && !errored;
  return (
    <div
      className={cn(
        'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted',
        className,
      )}
      {...props}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt={alt}
          loading="lazy"
          onError={() => setErrored(true)}
          className="aspect-square h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-sm font-medium text-muted-foreground">
          {fallback.slice(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  );
}
