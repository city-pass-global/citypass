/** Original travel-journal vignettes. Symbolic illustrations, not site photographs. */
export const placeArtKinds = [
  'street',
  'garden',
  'theatre',
  'books',
  'monastery',
  'viewpoint',
  'fado',
  'aquarium',
  'museum',
  'jade',
  'gold',
  'volcano',
  'waterfall',
  'springs',
  'lake',
  'bridge',
  'cave',
  'coast',
  'forest',
  'steps',
  'port',
  'masp',
  'market',
  'station',
  'tower',
] as const;
export type PlaceArtKind = (typeof placeArtKinds)[number];

function Trees({ x = 0 }: { x?: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <path d="M31 210v-83m39 88v-67m-18 65v-92" stroke="#56765b" strokeWidth="5" />
      <g fill="#366f58">
        <ellipse cx="31" cy="113" rx="28" ry="43" />
        <ellipse cx="72" cy="131" rx="25" ry="36" />
        <ellipse cx="50" cy="99" rx="28" ry="42" />
      </g>
    </g>
  );
}
function Windows({ x = 0, y = 0, count = 5 }: { x?: number; y?: number; count?: number }) {
  return (
    <g fill="#356773">
      {Array.from({ length: count }, (_, i) => (
        <path key={i} d={`M${x + i * 28} ${y}h12v24h-12z`} />
      ))}
    </g>
  );
}
function Arches() {
  return (
    <g fill="#486b6b">
      {[80, 130, 180, 230, 280].map((x) => (
        <path key={x} d={`M${x} 198v-39a15 15 0 0 1 30 0v39z`} />
      ))}
    </g>
  );
}
export function DestinationPlaceArt({ kind, country }: { kind: PlaceArtKind; country: string }) {
  const sky =
    country === 'PT'
      ? '#dce8eb'
      : country === 'CR'
        ? '#dce7d5'
        : country === 'BR'
          ? '#d8e8de'
          : '#deeaeb';
  let scene;
  switch (kind) {
    case 'street':
      scene = (
        <>
          <path d="M0 118h98v111H0z" fill="#d79765" />
          <path d="M90 71h83v158H90z" fill="#f1d68e" />
          <path d="M246 90h91v139h-91z" fill="#7eaaa5" />
          <path d="M330 128h70v101h-70z" fill="#c7735e" />
          <Windows x={14} y={142} count={3} />
          <Windows x={108} y={99} count={2} />
          <Windows x={265} y={118} count={2} />
          <path d="m165 240 42-118 48 118" fill="#e9d6ad" />
          <path d="M0 110h98m-8-48h84m72 18h91" stroke="#627e76" strokeWidth="5" />
          <path d="m190 40 18 77 27-62" stroke="#587465" strokeWidth="2" fill="none" />
        </>
      );
      break;
    case 'garden':
    case 'forest':
      scene = (
        <>
          <path d="M0 142q100-75 215-9t185-18v125H0" fill="#8fac83" />
          <path d="M0 192q120-72 238-14t162-10v72H0" fill="#47795c" />
          <path d="M145 240q16-55 95-95l26 3q-65 48-54 92" fill="#e9d6a5" />
          <Trees />
          <Trees x={290} />
          {kind === 'garden' ? (
            <g fill="#cb8176">
              {[95, 116, 278, 300, 67].map((x, i) => (
                <circle key={x} cx={x} cy={185 + (i % 2) * 17} r="7" />
              ))}
            </g>
          ) : (
            <path
              d="m196 91 18-9 18 9m-64-20 12-6 12 6"
              fill="none"
              stroke="#406554"
              strokeWidth="3"
            />
          )}
        </>
      );
      break;
    case 'theatre':
    case 'museum':
    case 'monastery':
    case 'station':
      scene = (
        <>
          <path d="M51 118h298v88H51z" fill="#e9dfbd" />
          <path d="m38 118 162-65 162 65z" fill="#b47c61" />
          <path d="M68 128h264v9H68zM40 204h320v12H40z" fill="#f7f0d8" />
          <Arches />
          <Windows x={78} y={101} count={9} />
          {kind === 'monastery' ? (
            <>
              <path d="M50 74h45v132H50z" fill="#eddfb7" />
              <path d="m47 74 26-44 25 44z" fill="#d8c69e" />
            </>
          ) : kind === 'station' ? (
            <>
              <circle cx="200" cy="89" r="18" fill="#f8f2df" />
              <path d="M200 78v12l8 4" stroke="#426a73" strokeWidth="3" fill="none" />
              <path d="M56 225h286m-256 10h230" stroke="#8d9a89" strokeWidth="2" />
            </>
          ) : kind === 'theatre' ? (
            <>
              <path d="M156 69q44-60 88 0" fill="#769a8d" />
              <path d="M116 143v53m50-53v53m50-53v53m50-53v53" stroke="#f8f0d9" strokeWidth="8" />
            </>
          ) : (
            <path d="M154 63h92v22h-92z" fill="#d2bd91" />
          )}
        </>
      );
      break;
    case 'books':
      scene = (
        <>
          <path d="M35 31h330v209H35z" fill="#d1b58e" />
          <path d="M116 210V113a84 84 0 0 1 168 0v97" fill="#eddfbf" />
          <path d="M145 203v-75a55 55 0 0 1 110 0v75" fill="#8e5652" />
          <path d="M153 203v-72q45 24 94 0v72" fill="#e1c695" />
          {[60, 295].map((x) => (
            <g key={x}>
              <path d={`M${x} 65h45v138h-45z`} fill="#557368" />
              {[83, 115, 147, 179].map((y) => (
                <path key={y} d={`M${x} ${y}h45`} stroke="#edcf9c" strokeWidth="5" />
              ))}
              <path d={`M${x + 9} 66v134m15-134v134m13-134v134`} stroke="#bba985" strokeWidth="4" />
            </g>
          ))}
          <path d="M129 223q36-28 71-10 36-18 71 10l-71 11z" fill="#faf2d8" />
          <path d="M200 213v21" stroke="#b49b78" strokeWidth="2" />
        </>
      );
      break;
    case 'viewpoint':
      scene = (
        <>
          <path d="M0 131q150-15 400 7v102H0" fill="#79abb2" />
          <path d="M0 146q160-8 400 16" stroke="#bcd5d0" strokeWidth="3" />
          <g fill="#eaddb8">
            <path d="M45 99h58v61H45zM112 120h66v48h-66zM206 94h58v77h-58zM277 114h77v62h-77z" />
          </g>
          <g fill="#b97d5e">
            <path d="m38 99 36-28 36 28zm160-5 37-27 37 27zm72 20 45-28 48 28z" />
          </g>
          <path d="M0 199h400v41H0" fill="#e9e0c8" />
          <path
            d="M0 195h400m-380 1v44m40-44v44m40-44v44m40-44v44m40-44v44m40-44v44m40-44v44m40-44v44m40-44v44m40-44v44"
            stroke="#54818a"
            strokeWidth="5"
          />
        </>
      );
      break;
    case 'fado':
      scene = (
        <>
          <path d="M62 217V98a138 138 0 0 1 276 0v119" fill="#63828a" />
          <path d="M88 217V103a112 112 0 0 1 224 0v114" fill="#284f56" />
          <path d="M116 204q-38-46 4-66 39-11 57 32 7 51-33 55z" fill="#cb9c61" />
          <path d="m150 171 73-112 11 8-70 114z" fill="#d8b982" />
          <circle cx="143" cy="177" r="14" fill="#4d655b" />
          <path d="m139 191 90-129" stroke="#f1d49d" strokeWidth="2" />
          <path
            d="M265 121v62q-30-6-29 9 13 12 30-1v-57l25-8"
            stroke="#edcf8f"
            strokeWidth="5"
            fill="none"
          />
        </>
      );
      break;
    case 'aquarium':
      scene = (
        <>
          <path d="M0 69q100-20 205 0t195-3v174H0" fill="#659da7" />
          <path d="M0 118q110-30 210-1t190-8v131H0" fill="#367482" />
          <path d="M0 191q75-18 170 10t230-4v43H0" fill="#245967" />
          <g fill="#cfdfc9">
            <path d="M110 126q35-32 80 0-40 32-80 0l-24 18v-36zM275 83q25-20 52 0-25 21-52 0l-17 12V71z" />
          </g>
          <path
            d="M110 240q-24-59-2-98m-53 98q21-59-4-85m275 85q-22-75 7-111"
            stroke="#92b595"
            strokeWidth="8"
            fill="none"
          />
          <g fill="#c9e1d7">
            <circle cx="228" cy="115" r="4" />
            <circle cx="233" cy="94" r="6" />
            <circle cx="229" cy="68" r="3" />
          </g>
        </>
      );
      break;
    case 'jade':
    case 'gold':
      scene = (
        <>
          <path d="M66 40h268v159H66z" fill="#52756e" />
          <path d="M80 54h240v131H80z" fill="#dce4d3" />
          <path d="M108 208h184v12H108zM132 189h136v19H132z" fill="#d4c9a6" />
          <path
            d="M145 120q2-53 55-59 53 8 55 59l-20 50h-70z"
            fill={kind === 'jade' ? '#579d86' : '#d5af5b'}
          />
          <path
            d="M173 95h54m-59 22h64m-49 24h34m-17-40v39"
            stroke={kind === 'jade' ? '#c3d9b1' : '#f6db94'}
            strokeWidth="6"
          />
          <path d="M184 158h32" stroke="#356a65" strokeWidth="4" />
        </>
      );
      break;
    case 'volcano':
    case 'lake':
      scene = (
        <>
          <path d="M0 158q60-82 120-32L234 39l107 111 59-18v108H0" fill="#88a180" />
          <path d="m202 70 32-31 32 34-31-8z" fill="#d8ddc4" />
          <path d="M0 186q96-73 200-18t200-23v95H0" fill="#49785c" />
          <path d="M0 213q140-40 400-3v30H0" fill="#8cb8b5" />
          {kind === 'lake' ? (
            <>
              <path d="M0 185q100-10 210 5t190-4v54H0" fill="#79aeb5" />
              <path d="m197 212 56-4-12 13h-32z" fill="#dbba72" />
              <path d="m220 185 10 24" stroke="#3b665c" strokeWidth="3" />
              <path d="M40 216h55m202 12h66" stroke="#c8dbcf" strokeWidth="2" />
            </>
          ) : (
            <>
              <Trees x={-20} />
              <Trees x={310} />
            </>
          )}
        </>
      );
      break;
    case 'waterfall':
      scene = (
        <>
          <path d="M0 95q120-65 201 8t199-16v153H0" fill="#719271" />
          <path d="M0 141q124-50 210-9t190-18v126H0" fill="#38664f" />
          <path d="M175 102q25 12 52 0l-8 108h-45z" fill="#dbece0" />
          <ellipse cx="199" cy="218" rx="105" ry="24" fill="#86b8af" />
          <path d="m191 112-4 90m24-88-4 90" stroke="#98c7c3" strokeWidth="6" />
          <Trees x={-10} />
          <Trees x={315} />
        </>
      );
      break;
    case 'springs':
      scene = (
        <>
          <path d="M0 146q140-100 400-27v121H0" fill="#6e9375" />
          <path d="M0 196q150-92 400-31v75H0" fill="#376d55" />
          <ellipse cx="201" cy="202" rx="128" ry="32" fill="#9bc4b5" />
          <ellipse cx="201" cy="200" rx="91" ry="19" fill="#6fa2a0" />
          <path
            d="M148 165q-18-24 0-43t0-38m48 70q-18-24 0-43t0-38m48 86q-18-24 0-43t0-38"
            stroke="#eff0d7"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          <Trees x={-25} />
          <Trees x={320} />
        </>
      );
      break;
    case 'bridge':
      scene = (
        <>
          <path d="M0 173q107-70 207-13t193-12v92H0" fill="#639181" />
          <path d="M0 209q120-58 213-16t187-5v52H0" fill="#6eaaa9" />
          <path
            d="M30 153h340M30 153q170-165 340 0M30 163h340"
            stroke="#466b68"
            strokeWidth="8"
            fill="none"
          />
          <path
            d="M68 116v43m44-80v80m44-96v96m44-105v105m44-96v96m44-80v80m44-43v43"
            stroke="#466b68"
            strokeWidth="3"
          />
          <path d="M0 179h42v61H0zM358 179h42v61h-42z" fill="#e5d9b8" />
        </>
      );
      break;
    case 'cave':
      scene = (
        <>
          <path d="M0 82q90-55 180-20t220-6v184H0" fill="#8da188" />
          <path d="M49 240q10-167 142-179 139-16 169 179" fill="#365d52" />
          <path d="M94 240q19-115 101-133 93 14 123 133" fill="#183f3b" />
          <path d="m107 91 20 64 20-78 29 30 20-45 22 64 19-44 24 60 20-49" fill="#8da188" />
          <path d="m170 240 27-60 20 60m38 0 12-38 10 38" fill="#76957f" />
        </>
      );
      break;
    case 'coast':
      scene = (
        <>
          <path d="M0 132q85-59 170-3L255 55l63 74 82-15v126H0" fill="#92b4a5" />
          <path d="M0 148q170 10 400-14v106H0" fill="#8fbabc" />
          <path d="M0 202q170-83 400 25v13H0" fill="#efdbaf" />
          <path d="M0 213q154-66 400 26" stroke="#f6eee0" strokeWidth="6" fill="none" />
          <path d="M58 185V89m0 24q-35-49-58-17 35-2 58 17 27-49 54-19-37-1-54 19" fill="#2f6952" />
        </>
      );
      break;
    case 'steps':
      scene = (
        <>
          <path d="M0 87h113v153H0zM287 62h113v178H287z" fill="#bd8c70" />
          <path d="M114 240 171 77h57l58 163" fill="#e9cf9a" />
          {[104, 126, 151, 179, 211, 236].map((y, i) => (
            <path
              key={y}
              d={`M${164 - i * 9} ${y}h${71 + i * 18}`}
              stroke={['#82a9b0', '#be7759', '#d8b96e'][i % 3]}
              strokeWidth="15"
            />
          ))}
          <Windows x={20} y={115} count={3} />
          <Windows x={305} y={88} count={3} />
          <path d="m110 221 53-156m128 156-57-156" stroke="#526d63" strokeWidth="4" />
        </>
      );
      break;
    case 'port':
      scene = (
        <>
          <path d="M0 180q150-20 400 0v60H0" fill="#8ab7b7" />
          <path d="M40 95h136v93H40z" fill="#e6c47f" />
          <g fill="#9e6f5e">
            <path d="m40 95 32 29 32-29 34 29 38-29v21l-38 29-34-29-32 29-32-29z" />
          </g>
          <path d="m225 135 30-68h83l26 68zM233 146h124v35H233z" fill="#f0ebd9" />
          <path d="M255 136v45m78-45v45" stroke="#557c80" strokeWidth="5" />
          <path d="M205 219h137m-318-11h95" stroke="#d6e3d2" strokeWidth="3" />
        </>
      );
      break;
    case 'masp':
      scene = (
        <>
          <g fill="#aec1af">
            <path d="M32 68h47v138H32zM91 96h40v110H91zM285 47h50v159h-50zM343 81h41v125h-41z" />
          </g>
          <path d="M62 114h276v57H62z" fill="#7d9995" />
          <path d="M62 111h276v12H62zM62 111h13v105H62zM325 111h13v105h-13z" fill="#b85d50" />
          <path
            d="M79 136h242m-242 17h242m-220-30v48m31-48v48m31-48v48m31-48v48m31-48v48m31-48v48m31-48v48"
            stroke="#c9d9d0"
            strokeWidth="2"
          />
          <path d="M38 218h324" stroke="#778d77" strokeWidth="3" />
        </>
      );
      break;
    case 'market':
      scene = (
        <>
          <path d="M50 85h300v128H50z" fill="#e7d4a4" />
          <path d="m42 85 158-43 158 43" fill="#a8745f" />
          <path d="M47 111h306v25H47" fill="#7c9c7e" />
          <path
            d="M75 111h25v25H75zm50 0h25v25h-25zm50 0h25v25h-25zm50 0h25v25h-25zm50 0h25v25h-25"
            fill="#f3e7c5"
          />
          <path d="M75 154h250v52H75z" fill="#57796b" />
          <g fill="#d9b76a">
            {[100, 127, 154, 181, 208, 235, 262, 289].map((x, i) => (
              <circle key={x} cx={x} cy={i % 2 ? 178 : 189} r="10" />
            ))}
          </g>
        </>
      );
      break;
    case 'tower':
      scene = (
        <>
          <path d="M0 173q160-25 400 5v62H0" fill="#9eb4a0" />
          <path d="M165 207V82h71v125" fill="#e8dcb6" />
          <path d="M179 82V48h43v34m-32-34V26h21v22" fill="#d9c799" />
          <path d="M152 83h97m-90 46h82m-82 42h82" stroke="#f4ecd2" strokeWidth="7" />
          <path
            d="M190 113V97a10 10 0 0 1 20 0v16zM190 156v-10a10 10 0 0 1 20 0v10zM187 207v-17a13 13 0 0 1 26 0v17z"
            fill="#4b7372"
          />
          <Trees x={-15} />
          <Trees x={320} />
        </>
      );
  }
  return (
    <svg
      viewBox="0 0 400 240"
      className="place-illustration"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <path d="M0 0h400v240H0z" fill={sky} />
      <circle cx="330" cy="47" r="25" fill="#e9ce83" />
      <path d="M0 218h400v22H0" fill="#d5dcc2" />
      {scene}
    </svg>
  );
}
