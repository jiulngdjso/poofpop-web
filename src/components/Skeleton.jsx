import './Skeleton.css';

/**
 * Skeleton component for loading states
 * @param {string} variant - 'text' | 'circular' | 'rectangular' | 'card' | 'input' | 'button' | 'progress'
 * @param {number} width - Width of the skeleton
 * @param {number} height - Height of the skeleton
 * @param {number} borderRadius - Custom border radius
 * @param {string} className - Additional CSS classes
 */
export default function Skeleton({
  variant = 'text',
  width,
  height,
  borderRadius,
  className = '',
}) {
  const baseClass = 'skeleton';

  const variantClasses = {
    text: 'skeleton-text',
    circular: 'skeleton-circular',
    rectangular: 'skeleton-rectangular',
    card: 'skeleton-card',
    input: 'skeleton-input',
    button: 'skeleton-button',
    progress: 'skeleton-progress',
  };

  const classes = [
    baseClass,
    variantClasses[variant] || '',
    className,
  ].filter(Boolean).join(' ');

  const style = {
    width: width || undefined,
    height: height || undefined,
    borderRadius: borderRadius !== undefined ? `${borderRadius}px` : undefined,
  };

  return <div className={classes} style={style} aria-hidden="true" />;
}

/**
 * Skeleton text line
 */
export function SkeletonText({ lines = 1, width = '100%', className = '' }) {
  return (
    <div className={`skeleton-text-container ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          width={i === lines - 1 && lines > 1 ? '60%' : width}
        />
      ))}
    </div>
  );
}

/**
 * Skeleton avatar (circular)
 */
export function SkeletonAvatar({ size = 40, className = '' }) {
  return (
    <Skeleton
      variant="circular"
      width={size}
      height={size}
      className={className}
    />
  );
}

/**
 * Skeleton card for content loading
 */
export function SkeletonCard({ className = '' }) {
  return (
    <div className={`skeleton-card ${className}`}>
      <div className="skeleton-card-header">
        <SkeletonAvatar size={48} />
        <div className="skeleton-card-body">
          <Skeleton variant="text" width="40%" />
          <Skeleton variant="text" width="60%" />
        </div>
      </div>
      <div className="skeleton-card-content">
        <SkeletonText lines={3} />
      </div>
    </div>
  );
}

/**
 * Skeleton button
 */
export function SkeletonButton({ width = 120, className = '' }) {
  return (
    <Skeleton
      variant="button"
      width={width}
      className={className}
    />
  );
}

/**
 * Skeleton progress bar
 */
export function SkeletonProgress({ width = '100%', className = '' }) {
  return (
    <Skeleton
      variant="progress"
      width={width}
      className={className}
    />
  );
}

/**
 * Skeleton input field
 */
export function SkeletonInput({ width = '100%', className = '' }) {
  return (
    <Skeleton
      variant="input"
      width={width}
      className={className}
    />
  );
}
