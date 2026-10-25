import { Landscape } from '@/components/landscape';

/** Editorial illustrations, not photographs or evidence of available experiences. */
export function DestinationArt({
  country,
  slug,
  label,
}: {
  country: string;
  slug?: string;
  label: string;
}) {
  if (slug === 'puerto-iguazu') return <Landscape />;
  return (
    <svg
      className="destination-art"
      viewBox="0 0 700 540"
      role="img"
      aria-label={label}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill={
          country === 'PT'
            ? '#dde9e8'
            : country === 'BR'
              ? '#d4e8e4'
              : country === 'CR'
                ? '#dce9d8'
                : '#deebec'
        }
        d="M0 0h700v540H0z"
      />
      <circle cx="540" cy="105" r="48" fill="#efd17d" />
      {slug === 'porto' ? (
        <>
          <path d="M0 280q180-60 360 10t340-34v284H0" fill="#9bb5a1" />
          <path d="M0 360q230-60 700 12v168H0" fill="#5d98a4" />
          <g fill="#eedeb8">
            <path d="M0 244h90v151H0zM98 218h80v168H98zM187 257h78v122h-78zM493 250h80v135h-80zM585 218h115v178H585z" />
          </g>
          <g fill="#b9795d">
            <path d="m-8 244 54-37 54 37zm97-26 49-38 50 38zm89 39 49-34 48 34zm306-7 49-34 50 34zm92-32 68-42 68 42z" />
          </g>
          <g fill="#416c75">
            <path d="M20 280h17v31H20zm37 0h17v31H57zM116 250h17v30h-17zm32 0h17v30h-17zM207 285h17v29h-17zm31 0h17v29h-17zM609 253h18v29h-18zm37 0h18v29h-18z" />
          </g>
          <path
            d="M28 346h646M28 346Q350 79 674 346M28 363h646"
            stroke="#3f656b"
            strokeWidth="16"
            fill="none"
          />
          <path
            d="M92 299v58m64-100v100m64-127v127m64-145v145m64-151v151m64-145v145m64-127v127m64-100v100m64-58v58"
            stroke="#3f656b"
            strokeWidth="5"
          />
          <path d="M0 371h55v169H0zM645 371h55v169h-55z" fill="#cfbd94" />
          <path d="m285 460 120-5-23 24h-68z" fill="#264d4c" />
          <path d="m329 401 53 50h-53z" fill="#f4e9cc" />
        </>
      ) : slug === 'sao-paulo' ? (
        <>
          <g fill="#a9bdaf">
            <path d="M0 218h72v242H0zM85 151h64v310H85zM164 208h70v251h-70zM474 142h80v318h-80zM568 199h60v261h-60zM642 115h58v345h-58z" />
          </g>
          <g stroke="#dce3d5" strokeWidth="5">
            <path d="M101 181h32m-32 30h32m-32 30h32m-32 30h32m357-97h46m-46 32h46m-46 32h46m-46 32h46" />
          </g>
          <path d="M0 436q220-38 700 0v104H0" fill="#82a17c" />
          <path d="M81 307h539v113H81z" fill="#6a8d87" />
          <path d="M81 305h539v21H81zM81 305h22v192H81zM598 305h22v192h-22z" fill="#b86253" />
          <path
            d="M106 352h489m-489 37h489m-440-63v94m56-94v94m56-94v94m56-94v94m56-94v94m56-94v94m56-94v94m56-94v94"
            stroke="#bdd2c7"
            strokeWidth="3"
          />
          <path d="M119 501h462" stroke="#d7ddc3" strokeWidth="10" />
          <g fill="#2e6450">
            <circle cx="31" cy="419" r="53" />
            <circle cx="668" cy="423" r="62" />
          </g>
        </>
      ) : slug === 'san-jose' ? (
        <>
          <path d="M0 291q110-139 235-60t250-25 215 55v279H0" fill="#9ab08b" />
          <path d="M0 361q185-94 380-17t320-25v221H0" fill="#638d6a" />
          <path d="M88 288h524v189H88z" fill="#e9dcba" />
          <path d="m64 288 286-105 286 105z" fill="#b87d62" />
          <path d="M286 188q63-106 128 0" fill="#72978b" />
          <path d="M350 103V78m-13 14h26" stroke="#506f5b" strokeWidth="5" />
          <path d="M113 306h474v14H113zM73 477h554v16H73zM53 497h594v14H53z" fill="#f6ecd2" />
          <g fill="#496d68">
            <path d="M131 443v-67a24 24 0 0 1 48 0v67zM226 443v-67a24 24 0 0 1 48 0v67zM326 443v-67a24 24 0 0 1 48 0v67zM426 443v-67a24 24 0 0 1 48 0v67zM521 443v-67a24 24 0 0 1 48 0v67z" />
          </g>
          <path
            d="M200 330v125m100-125v125m100-125v125m100-125v125"
            stroke="#f9efd5"
            strokeWidth="15"
          />
          <g fill="#2c634b">
            <circle cx="23" cy="361" r="65" />
            <circle cx="670" cy="376" r="68" />
          </g>
          <path d="M0 514h700v26H0" fill="#c1caa5" />
        </>
      ) : country === 'PT' ? (
        <>
          <path d="M0 310Q160 230 350 300T700 255V540H0" fill="#8ebbb9" />
          <path d="M0 370Q270 305 700 355V540H0" fill="#387d8a" />
          <g fill="#f6f0d9" stroke="#d4c9aa" strokeWidth="2">
            <path d="M35 208h100v184H35zM142 246h108v157H142zM260 196h92v204h-92zM370 259h104v158H370zM479 222h104v185H479z" />
          </g>
          <g fill="#b76d51">
            <path d="m22 208 63-46 63 46zm108 38 66-39 67 39zm118-50 58-47 59 47zm109 63 65-40 65 40zm109-37 64-46 65 46z" />
          </g>
          <g fill="#346b73">
            <path d="M61 241h17v29H61zm37 0h17v29H98zM167 280h19v30h-19zm39 0h19v30h-19zM282 227h17v30h-17zm32 0h17v30h-17zM394 292h18v29h-18zm35 0h18v29h-18zM505 255h18v29h-18zm34 0h18v29h-18z" />
          </g>
          <path d="M0 397q220-80 700 0v45Q250 359 0 445" fill="#e3d4ad" />
          <g fill="#346b73">
            <path d="M0 414q180-70 700-1v6Q200 351 0 421z" />
          </g>
          <path d="m514 476 83-9-25 23h-37z" fill="#163e35" />
          <path d="M556 389v76h-48z" fill="#f5f3dd" />
        </>
      ) : country === 'BR' ? (
        <>
          <path
            d="M0 340Q120 220 240 330q60 30 115-159 53-142 99 65 25 100 104 54t142-37v287H0"
            fill="#79a58b"
          />
          <path d="M0 398q150-120 260-24t440-41v207H0" fill="#2c6959" />
          <path d="M0 444q176-95 336-19t364-22v137H0" fill="#e9d7a4" />
          <path d="M0 481q190-104 360-20t340-27v106H0" fill="#659fa9" />
          <g fill="#eff0da">
            <path d="M38 306h40v88H38zm49 30h30v49H87zm40-47h45v96h-45zm55 35h33v74h-33zM479 325h40v69h-40zm52-33h32v92h-32zm45 30h40v62h-40z" />
          </g>
          <path d="M73 496q110-64 235-15" fill="none" stroke="#f4f3df" strokeWidth="3" />
          <path
            d="M625 444v-142m0 20q-44-64-78-25 49-5 78 25 32-65 67-36-43 9-67 36"
            fill="#174e3a"
          />
        </>
      ) : country === 'CR' ? (
        <>
          <path d="M0 342Q130 176 248 303L402 98l177 221Q639 253 700 290v250H0" fill="#8fac86" />
          <path d="m353 163 49-65 53 64-42-12-19 12-20-8z" fill="#d6dfc9" />
          <path d="M0 360q119-103 277 4t423-37v213H0" fill="#4d8065" />
          <path d="M0 440q140-120 304-24t396-25v149H0" fill="#245c46" />
          <path d="M319 382q-65 70 20 91t-35 67h138q70-60-35-84t-26-74z" fill="#8bbeb6" />
          <g fill="#163e35">
            <path d="M0 201q77 37 45 113 95-9 86 84 79 0 81 142H0zM700 198q-93 45-58 124-81-5-76 80-68 0-74 138h208z" />
          </g>
          <g stroke="#80a77e" strokeWidth="3" fill="none">
            <path d="m32 515 23-180m-16 120 80-47m-75 14 48-48m550 151-20-177m15 125-72-53m67 16-37-58" />
          </g>
        </>
      ) : (
        <>
          <path d="M0 332q240-32 700 0v208H0" fill="#81b3bd" />
          <path d="M0 355q240-44 700 0v185H0" fill="#e1d9b8" />
          <g fill="#d1c9ae">
            <path d="M0 223h75v170H0zm87 40h72v130H87zm88-73h65v203h-65zm81 62h70v141h-70zm148-30h73v171h-73zm88 29h90v142h-90zm106-59h102v201H598z" />
          </g>
          <g fill="#f4f0df">
            <path d="M20 254h35v94H20zm174-31h28v137h-28zm225 34h39v96h-39zm198-28h59v132h-59z" />
          </g>
          <path d="m346 342 10-208h17l11 208z" fill="#f7f4e5" />
          <path d="m356 134 8-28 9 28z" fill="#93a7a2" />
          <path d="M0 421q233-42 700 0v119H0" fill="#7b9e7a" />
          <path d="M255 540q50-83 103-135h39q-34 73-23 135" fill="#f0e8ce" />
          <g fill="#275c47">
            <circle cx="83" cy="367" r="49" />
            <circle cx="140" cy="391" r="35" />
            <circle cx="570" cy="379" r="50" />
            <circle cx="635" cy="401" r="38" />
          </g>
        </>
      )}
      <g fill="none" stroke="#163e35" strokeWidth="3">
        <path d="m180 107 12-6 12 6m24 17 12-6 12 6" />
      </g>
      <g fill="none" stroke="#fff" strokeOpacity=".32" strokeWidth="2">
        <path d="M460 510h64m16 0h35M457 496h29m-370 13h53" />
      </g>
    </svg>
  );
}
