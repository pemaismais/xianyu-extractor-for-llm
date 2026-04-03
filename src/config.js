export const MARGIN         = 12;
export const SNAP_THRESHOLD = 60;

export const SIZES = {
    small:  { padding: '6px 10px',  fontSize: '11px', iconSize: '14px', gap: '5px',  minWidth: '120px' },
    medium: { padding: '10px 16px', fontSize: '13px', iconSize: '18px', gap: '8px',  minWidth: '170px' },
    large:  { padding: '14px 22px', fontSize: '15px', iconSize: '22px', gap: '10px', minWidth: '200px' },
};
export const SIZE_ORDER = ['small', 'medium', 'large'];

export const ICON = {
    copy:   'https://api.iconify.design/mdi:content-copy.svg?color=%23e0e0e0',
    check:  'https://api.iconify.design/mdi:check.svg?color=%2322c55e',
    alert:  'https://api.iconify.design/mdi:alert-circle.svg?color=%23ef4444',
    resize: 'https://api.iconify.design/mdi:resize.svg?color=%23e0e0e0',
    filter: 'https://api.iconify.design/mdi:filter-outline.svg?color=%23e0e0e0',
};

export const SELECTORS = {
    listContainer: '.feeds-list-container--UkIMBPNk',
    // item page
    sellerName:    '.item-user-info-nick--rtpDhkmQ',
    sellerInfo:    '.item-user-info-intro--ZN1A0_8Y',
    sellerLabel:   '.item-user-info-label--NLTMHARN',
    price:         '.price--OEWLbcxC',
    mainContainer: '.main--Nu33bWl6',
    desc:          '.desc--GaIUKUQY',
    labels:        '.labels--ndhPFgp8',
    labelItem:     '.item--qI9ENIfp',
    labelKey:      '.label--ejJeaTRV',
    labelValue:    '.value--EyQBSInp',
    want:          '.want--ecByv3Sr',
    // search cards
    cardTitle:     '.main-title--sMrtWSJa',
    cardRow2:      '.row2-wrap-cpv--_dKW4c6D',
    cardPrice:     '.number--NKh1vXWM',
    cardPromo:     '.price-desc--hxYyq3i3',
    cardSeller:    '.seller-text--Rr2Y3EbB',
    cardSellerTag: '.credit-container--w3dcSvoi span',
};
