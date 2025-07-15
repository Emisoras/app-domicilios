import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
        {/* Protective Arc */}
        <path d="M12,2.5c-5.25,0-9.5,4.25-9.5,9.5h2c0-4.14,3.36-7.5,7.5-7.5s7.5,3.36,7.5,7.5h2C21.5,6.75,17.25,2.5,12,2.5z" />

        {/* Central Figure */}
        <circle cx="12" cy="9.5" r="2.5" />
        <path d="M15,21.5h-6c0-4.5,1-7,3-7S15,17,15,21.5z" />

        {/* Left Figure */}
        <circle cx="6.5" cy="13.5" r="1.8" />
        <path d="M8.7,21.5H4.3c0-3.38,0.75-5.25,2.2-5.25S8.7,18.12,8.7,21.5z" />

        {/* Right Figure */}
        <circle cx="17.5" cy="13.5" r="1.8" />
        <path d="M19.7,21.5h-4.4c0-3.38,0.75-5.25,2.2-5.25S19.7,18.12,19.7,21.5z" />
    </svg>
  );
}
