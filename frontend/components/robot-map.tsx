'use client'

import type { Robot } from '@/lib/types/robot'
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '@/lib/map/constants'
import Feature from 'ol/Feature'
import Map from 'ol/Map'
import View from 'ol/View'
import Point from 'ol/geom/Point'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import { fromLonLat } from 'ol/proj'
import OSM from 'ol/source/OSM'
import VectorSource from 'ol/source/Vector'
import CircleStyle from 'ol/style/Circle'
import Fill from 'ol/style/Fill'
import Stroke from 'ol/style/Stroke'
import Style from 'ol/style/Style'
import { useEffect, useRef } from 'react'
import 'ol/ol.css'

const markerStyle = new Style({
  image: new CircleStyle({
    radius: 8,
    fill: new Fill({ color: 'rgba(23, 23, 23, 0.9)' }),
    stroke: new Stroke({ color: '#ffffff', width: 2 }),
  }),
})

type RobotMapProps = {
  robots: Robot[]
}

export function RobotMap({ robots }: RobotMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const vectorSourceRef = useRef<VectorSource | null>(null)
  const didFitRef = useRef(false)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const vectorSource = new VectorSource()
    vectorSourceRef.current = vectorSource

    const map = new Map({
      target: containerRef.current,
      layers: [
        new TileLayer({ source: new OSM() }),
        new VectorLayer({ source: vectorSource }),
      ],
      view: new View({
        center: fromLonLat([DEFAULT_MAP_CENTER.lon, DEFAULT_MAP_CENTER.lat]),
        zoom: DEFAULT_MAP_ZOOM,
      }),
    })

    mapRef.current = map

    return () => {
      map.setTarget(undefined)
      mapRef.current = null
      vectorSourceRef.current = null
      didFitRef.current = false
    }
  }, [])

  useEffect(() => {
    const vectorSource = vectorSourceRef.current
    const map = mapRef.current
    if (!vectorSource || !map) return

    vectorSource.clear()
    for (const robot of robots) {
      const feature = new Feature({
        geometry: new Point(fromLonLat([robot.lon, robot.lat])),
        name: robot.name,
        robotId: robot.id,
      })
      feature.setId(robot.id)
      feature.setStyle(markerStyle)
      vectorSource.addFeature(feature)
    }

    if (robots.length > 0 && !didFitRef.current) {
      const extent = vectorSource.getExtent()
      if (extent && extent.every(Number.isFinite)) {
        map
          .getView()
          .fit(extent, { padding: [48, 48, 48, 48], maxZoom: 14, duration: 0 })
        didFitRef.current = true
      }
    }
  }, [robots])

  return (
    <div
      ref={containerRef}
      className="h-full min-h-[20rem] w-full rounded-lg border border-neutral-200 dark:border-neutral-800"
      aria-label="Robot positions map"
    />
  )
}
