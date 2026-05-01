import type { MouseEvent } from "react";

const PencilIcon = () => (
  <svg viewBox="0 0 16 16" fill="none">
    <path
      d="M2 12.5V14h1.5L12 5.5l-1.5-1.5zM10.5 4l1.5 1.5"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

interface EditPencilButtonProps {
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  ariaLabel: string;
  className?: string;
}

export default function EditPencilButton({
  onClick,
  ariaLabel,
  className,
}: EditPencilButtonProps) {
  return (
    <button
      type="button"
      className={`icon-btn edit-pencil-btn${className ? ` ${className}` : ""}`}
      onClick={onClick}
      title={ariaLabel}
      aria-label={ariaLabel}
    >
      <PencilIcon />
    </button>
  );
}
