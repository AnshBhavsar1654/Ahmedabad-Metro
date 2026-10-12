import React from 'react';
import { TileLayer } from 'react-leaflet';
import { useTheme } from '../lib/theme';

// Quiet grey basemap so the coloured line and markers are the only saturated things on the map (design.md §6).
// Esri's Gray Canvas needs no API key. Native tiles stop at zoom 16.
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas';

const BaseTiles = () => {
  const { theme } = useTheme();
  const variant = theme === 'dark' ? 'Dark' : 'Light';

  return (
    <>
      <TileLayer
        key={`base-${variant}`}
        url={`${ESRI}/World_${variant}_Gray_Base/MapServer/tile/{z}/{y}/{x}`}
        attribution="Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ"
        maxNativeZoom={16}
        maxZoom={18}
      />
      <TileLayer
        key={`ref-${variant}`}
        url={`${ESRI}/World_${variant}_Gray_Reference/MapServer/tile/{z}/{y}/{x}`}
        maxNativeZoom={16}
        maxZoom={18}
      />
    </>
  );
};

export default BaseTiles;
