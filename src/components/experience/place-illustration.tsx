/** Original editorial landscapes. Decorative, not geographic maps. */
export function PlaceIllustration({ variant }: { variant: number }) {
  return (
    <svg viewBox="0 0 400 240" aria-hidden="true" className="place-illustration">
      <rect width="400" height="240" fill={['#c9ded6', '#d7e6de', '#dbe1cb'][variant]} />
      <circle cx={variant === 1 ? 85 : 320} cy="52" r="28" fill="#e8d38f" />
      <path d="M0 125Q60 50 160 107T400 80V240H0Z" fill="#7a9c7d" />
      <path d="M0 155Q90 105 160 147T400 115V240H0Z" fill="#3e755c" />
      {variant === 0 ? (
        <>
          <path d="M90 132Q180 170 300 113L284 224H119Z" fill="#d7ece5" />
          <path
            d="m122 148 11 74m20-67 8 64m27-59 2 62m25-68-2 67m31-79-7 79m28-94-7 89"
            stroke="#8bc0bd"
            strokeWidth="7"
          />
          <ellipse cx="202" cy="224" rx="126" ry="19" fill="#8ebfbb" />
        </>
      ) : variant === 1 ? (
        <>
          <path d="M0 212 400 115" stroke="#baac7c" strokeWidth="16" />
          <path
            d="m0 193 400-97m-365 79 0 34m46-44 0 34m47-45 0 34m47-45 0 34m47-45 0 34m47-45 0 34m47-45 0 34m47-45 0 34"
            stroke="#e4dfb9"
            strokeWidth="3"
          />
          <path d="M210 141v99h100V117Z" fill="#aed7cf" opacity=".75" />
        </>
      ) : (
        <>
          <path d="M163 133q47 4 84-11l-14 96h-77Z" fill="#d8ebe0" />
          <path d="M0 240q220-89 400-13" stroke="#8dbcb6" strokeWidth="40" fill="none" />
          <path d="m198 147-7 64m24-66-5 61" stroke="#86b8b2" strokeWidth="6" />
        </>
      )}
      <path d="M0 120q36-45 54 7t19 113H0Zm400-5q-39-35-51 14t-31 111h82Z" fill="#245640" />
      <path
        d="m28 226 7-76m-3 35 22-18m-24 39-18-16m363 42-9-79m4 39-23-13"
        stroke="#84a16b"
        strokeWidth="3"
        fill="none"
      />
    </svg>
  );
}
