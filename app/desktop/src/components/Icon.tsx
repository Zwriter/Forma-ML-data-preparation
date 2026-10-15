import type { ReactNode } from 'react';

export type IconName =
  | 'brand'
  | 'open'
  | 'grid'
  | 'columns'
  | 'filter'
  | 'profile'
  | 'clean'
  | 'export'
  | 'home'
  | 'save'
  | 'reload'
  | 'sort'
  | 'datatype'
  | 'replace'
  | 'fill'
  | 'split'
  | 'merge'
  | 'group'
  | 'pivot'
  | 'pipeline'
  | 'settings'
  | 'unpivot';

const DATA_TYPE_PATH = `
M978.578286 900.461714l-108.617143-108.617143c30.134857-39.570286 48.274286-88.795429 48.274286-142.189714a235.739429 235.739429 0 0 0-235.52-235.373714 235.739429 235.739429 0 0 0-235.373715 235.373714 235.739429 235.739429 0 0 0 235.446857 235.52c53.467429 0 102.692571-18.139429 142.189715-48.274286l108.617143 108.544a31.524571 31.524571 0 0 0 44.836571 0 31.744 31.744 0 0 0 0.146286-44.982857z
M510.902857 649.654857a172.105143 172.105143 0 0 1 171.885714-171.885714 171.885714 171.885714 0 0 1 0 343.771428 172.178286 172.178286 0 0 1-171.885714-171.885714z
m270.262857-378.514286c0 17.554286-14.262857 31.744-31.817143 31.744H431.396571a31.744 31.744 0 0 1 0-63.488h317.952c17.554286 0 31.817143 14.189714 31.817143 31.744z
m-609.426285 620.032h211.968a31.890286 31.890286 0 0 1 0 63.634286H171.739429c-58.368 0-106.057143-47.542857-106.057143-106.057143V283.062857c0-14.262857 5.12-28.086857 14.262857-39.058286L240.420571 53.101714a57.417143 57.417143 0 0 1 43.885715-20.48h517.997714c58.441143 0 106.057143 47.542857 106.057143 106.057143V366.445714a31.744 31.744 0 0 1-63.634286 0V138.605714a42.422857 42.422857 0 0 0-42.276571-42.349714H336.018286V280.137143a50.688 50.688 0 0 1-50.980572 50.176H129.389714v518.509714c0 23.332571 19.017143 42.349715 42.349715 42.349714z
m102.641142-727.802285-128.512 152.868571h128.512v-152.868571z
m79.506286 476.16a31.744 31.744 0 0 0 0-63.634286H240.64a31.744 31.744 0 0 0 0 63.634286h111.323429z
m0 146.066285a31.744 31.744 0 0 0 0-63.561142H240.64a31.744 31.744 0 0 0 0 63.561142h111.323429z
m31.744-353.206857H240.64a31.744 31.744 0 0 0 0 63.561143h143.067429a31.744 31.744 0 0 0 0-63.561143z`;

export function Icon({ name }: { name: IconName }) {
  if (name === 'brand') {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true" className="icon icon-brand">
        <path d="M16 2 23 9 16 16 9 9Z" fill="currentColor" />
        <path d="m24 10 7 6-7 7-7-7Z" fill="currentColor" opacity=".8" />
        <path d="m8 10 7 6-7 7-7-7Z" fill="currentColor" opacity=".65" />
        <path d="m16 18 7 6-7 7-7-7Z" fill="currentColor" opacity=".5" />
      </svg>
    );
  }

  if (name === 'datatype') {
    return (
      <svg viewBox="0 0 1024 1024" aria-hidden="true" className="icon">
        <path d={DATA_TYPE_PATH} fill="currentColor" stroke="none" />
      </svg>
    );
  }

  const shapes: Record<Exclude<IconName, 'brand' | 'datatype'>, ReactNode> = {
    open: <path d="M3 8V5h10l3 4h13v17H3zM3 12h26" />,
    grid: (
      <>
        <rect x="3" y="3" width="26" height="26" rx="2" />
        <path d="M3 12h26M3 20h26M12 3v26M20 3v26" />
      </>
    ),
    columns: (
      <>
        <rect x="3" y="3" width="26" height="26" rx="1" />
        <path d="M3 11h26M3 20h26M11 3v26M20 3v26" />
      </>
    ),
    filter: <path d="M3 5h26L19 17v9l-6 3V17z" />,
    profile: (
      <>
        <path d="M4 28V16M13 28V6M22 28V11M30 28H2" />
        <circle cx="13" cy="6" r="2" />
      </>
    ),
    clean: (
      <>
        <path d="m16 3 2.2 7.8L26 13l-7.8 2.2L16 23l-2.2-7.8L6 13l7.8-2.2z" />
        <path d="m26 21 1.2 3.8L31 26l-3.8 1.2L26 31l-1.2-3.8L21 26l3.8-1.2z" />
      </>
    ),
    export: (
      <>
        <path d="M16 20V3M9 10l7-7 7 7" />
        <path d="M4 17v11h24V17" />
      </>
    ),
    home: (
      <>
        <path d="m3 14 13-11 13 11v14H18v-9h-4v9H3z" />
      </>
    ),
    save: (
      <>
        <path d="M4 3h21l4 4v22H3V3z" />
        <path d="M9 3v9h13V3M9 29V18h14v11" />
      </>
    ),
    reload: <path d="M27 11a12 12 0 0 0-21-4L3 10m0-7v7h7M5 21a12 12 0 0 0 21 4l3-3m0 7v-7h-7" />,
    sort: (
      <>
        <path d="M5 13 9 4l4 9M6.5 10h5M7 19h5l-5 8h5M22 5v21m-4-4 4 4 4-4" />
      </>
    ),
    replace: (
      <>
        <path d="M3 10h25m-5-5 5 5-5 5M29 22H4m5-5-5 5 5 5" />
      </>
    ),
    fill: (
      <>
        <circle cx="5" cy="5" r="1" />
        <circle cx="16" cy="5" r="1" />
        <circle cx="27" cy="5" r="1" />
        <circle cx="5" cy="16" r="1" />
        <circle cx="27" cy="16" r="1" />
        <circle cx="5" cy="27" r="1" />
        <circle cx="16" cy="27" r="1" />
        <circle cx="27" cy="27" r="1" />
        <path d="M16 10v12m-6-6h12m-9-4 6 8m0-8-6 8" />
      </>
    ),
    split: (
      <>
        <path d="M15 4v24m4-24v24M3 10l6 6-6 6m26-12-6 6 6 6" />
        <path d="M9 16h4m6 0h4" />
      </>
    ),
    merge: (
      <>
        <circle cx="6" cy="6" r="2" />
        <circle cx="6" cy="16" r="2" />
        <circle cx="6" cy="26" r="2" />
        <circle cx="26" cy="16" r="2" />
        <path d="M8 6h6v10m-6 0h16M8 26h6V16" />
      </>
    ),
    group: (
      <>
        <circle cx="16" cy="7" r="3" />
        <circle cx="7" cy="24" r="3" />
        <circle cx="25" cy="24" r="3" />
        <path d="M16 10v6M7 21v-5h18v5" />
      </>
    ),
    pivot: (
      <>
        <rect x="4" y="4" width="24" height="24" rx="1" />
        <path d="M4 12h24M4 20h24M12 4v24M20 4v24" />
        <path d="M7 7h2m6 0h2m6 0h2" />
      </>
    ),
    unpivot: (
      <>
        <rect x="3" y="4" width="24" height="24" rx="1" />
        <path d="M3 12h24M3 20h24M11 4v24M19 4v24M15 16h14m-5-5 5 5-5 5" />
      </>
    ),
    pipeline: (
      <>
        <rect x="3" y="4" width="8" height="6" rx="1" />
        <rect x="21" y="22" width="8" height="6" rx="1" />
        <circle cx="16" cy="16" r="3" />
        <path d="M11 7h5v6M19 16h6v6" />
      </>
    ),
    settings: (
      <>
        <circle cx="16" cy="16" r="4" />
        <path d="m13 3-1 3-3 1-3-1-3 5 2 2v4l-2 2 3 5 3-1 3 1 1 3h6l1-3 3-1 3 1 3-5-2-2v-4l2-2-3-5-3 1-3-1-1-3z" />
      </>
    ),
  };

  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className="icon">
      {shapes[name]}
    </svg>
  );
}
