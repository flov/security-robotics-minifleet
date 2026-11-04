'use client'

import type { Robot } from '@/lib/types/robot'
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '@/lib/map/constants'
import Feature from 'ol/Feature'
import Map from 'ol/Map'
import View from 'ol/View'
import Point from 'ol/geom/Point'
import LineString from 'ol/geom/LineString'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import { fromLonLat, toLonLat } from 'ol/proj'
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

const trailStyle = new Style({
  stroke: new Stroke({
    color: 'rgba(37, 99, 235, 0.75)',
    width: 2,
  }),
})

export type RobotTrailPoint = { lat: number; lon: number }

type RobotMapProps = {
  robots: Robot[]
  trails?: Record<number, RobotTrailPoint[]>
  onPick?: (position: { lat: number; lon: number }) => void
}

export function RobotMap({ robots, trails, onPick }: RobotMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const vectorSourceRef = useRef<VectorSource | null>(null)
  const didFitRef = useRef(false)
  const onPickRef = useRef(onPick)
  onPickRef.current = onPick

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

    const onSingleClick = (event: { coordinate: number[] }) => {
      const [lon, lat] = toLonLat(event.coordinate)
      onPickRef.current?.({ lat, lon })
    }
    map.on('singleclick', onSingleClick)

    return () => {
      map.un('singleclick', onSingleClick)
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
    for (const [robotId, points] of Object.entries(trails ?? {})) {
      if (points.length < 2) continue
      const coordinates = points.map((point) =>
        fromLonLat([point.lon, point.lat]),
      )
      const line = new Feature({
        geometry: new LineString(coordinates),
        robotId: Number(robotId),
        kind: 'trail',
      })
      line.setStyle(trailStyle)
      vectorSource.addFeature(line)
    }

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
  }, [robots, trails])

  return (
    <div
      ref={containerRef}
      className="h-full min-h-[20rem] w-full cursor-crosshair rounded-lg border border-neutral-200 dark:border-neutral-800"
      aria-label="Robot positions map"
    />
  )
}
