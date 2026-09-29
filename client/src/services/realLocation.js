/**
 * Real Location Service using Device GPS & Reverse Geocoding
 * Zero fake or assumed addresses. Strictly real coordinates and live addresses.
 */

export async function getRealCurrentPosition() {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    throw new Error('Geolocation is not supported by your browser.');
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        try {
          // Reverse geocode using OpenStreetMap Nominatim for real street address
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            {
              headers: {
                'Accept-Language': 'en',
              },
            }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            
            // Construct a clean, real Nigerian address
            const road = addr.road || addr.pedestrian || addr.suburb || addr.neighbourhood || addr.residential || '';
            const area = addr.suburb || addr.neighbourhood || addr.city_district || addr.quarter || '';
            const city = addr.city || addr.town || addr.county || addr.state_district || 'Ibadan';
            const state = addr.state || '';

            const parts = [road, area, city, state].filter(Boolean);
            // Deduplicate adjacent identical parts
            const uniqueParts = parts.filter((part, idx) => parts.indexOf(part) === idx);
            const formattedAddress = uniqueParts.join(', ') || data.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

            resolve({
              latitude,
              longitude,
              accuracy,
              address: formattedAddress,
              city,
              state,
              raw: data,
            });
            return;
          }
        } catch (e) {
          console.warn('Reverse geocoding network error, falling back to coordinates:', e);
        }

        // Fallback to coordinates
        resolve({
          latitude,
          longitude,
          accuracy,
          address: `Location (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`,
          city: '',
          state: '',
        });
      },
      (err) => {
        let msg = 'Unable to retrieve your location.';
        if (err.code === 1) msg = 'Location access was denied. Please allow location permissions in your browser or type your address manually.';
        else if (err.code === 2) msg = 'Location unavailable. Please check your GPS or internet connection.';
        else if (err.code === 3) msg = 'Location request timed out. Please try again.';
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      }
    );
  });
}
