export function Landscape() {
  return (
    <svg
      className="landscape"
      viewBox="0 0 700 540"
      role="img"
      aria-label="Iguazú"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="water" width="24" height="18" patternUnits="userSpaceOnUse">
          <path d="M0 9q6-5 12 0t12 0" fill="none" stroke="#fff" strokeOpacity=".25" />
        </pattern>
      </defs>
      <path fill="#c5ded7" d="M0 0h700v540H0z" />
      <circle cx="558" cy="98" r="54" fill="#f3d778" />
      <path d="M0 210Q120 75 250 185T480 148 700 182V540H0" fill="#739e83" />
      <path d="M0 270Q120 200 220 265T420 200 700 230V540H0" fill="#386b55" />
      <path d="M135 216q103-45 239 0t220-12l-15 245-420 10z" fill="#317a83" />
      <path
        d="M157 250q85 7 149-10t147-3 132-10l-16 197-55 30-40-31-35 31-42-16-35 19-54-19-37 26-60-12-48 30z"
        fill="#e5f1e9"
      />
      <g stroke="#99c9c6" strokeWidth="7" fill="none">
        <path d="m189 267 7 173m36-179 7 163m39-159 3 180m48-184-2 159m45-165 1 190m42-198 4 182m39-179 8 179m40-174-5 172m43-179-5 143" />
      </g>
      <path d="M0 406q75-44 154 18t175 7 154-1 217-40v150H0" fill="#7db9b6" />
      <path d="M0 410q140 70 285 42t415-18v106H0" fill="url(#water)" />
      <g fill="#174e3a">
        <path d="M0 182q52 28 37 83 78-21 82 49 79-1 67 70 50 31 16 90L0 540z" />
        <path d="M700 177q-77 15-65 80-85-4-68 77-76 0-51 72-67 17-44 81L700 540z" />
      </g>
      <g fill="none" stroke="#69966a" strokeWidth="3">
        <path d="m17 520 26-239m-15 84 62-35m-55-30 41-34m-48 133 84-49m-80 96 86-37m-77 86 106-55M679 534l-36-245m13 85-58-49m68 111-83-57m75 16 22-43m-8 144-108-44" />
      </g>
      <g fill="#e6efe6" opacity=".8">
        <ellipse cx="288" cy="444" rx="79" ry="10" />
        <ellipse cx="465" cy="425" rx="78" ry="9" />
      </g>
      <path d="m403 108 12-6 10 6m-60 26 11-6 10 6" fill="none" stroke="#174e3a" strokeWidth="3" />
    </svg>
  );
}
