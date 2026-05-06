'use client'

import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api'

export default function Mapa() {

  const center = {
    lat: -21.17,
    lng: -47.81
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Mapa das Rotas</h1>

      <LoadScript googleMapsApiKey="SUA_API_KEY">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '500px' }}
          center={center}
          zoom={12}
        >
          <Marker position={center} />
        </GoogleMap>
      </LoadScript>
    </div>
  )
}