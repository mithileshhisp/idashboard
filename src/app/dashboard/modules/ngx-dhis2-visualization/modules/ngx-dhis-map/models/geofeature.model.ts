import { GeoJSONOptions, FeatureGroup, LeafletEvent, LayerGroup } from 'leaflet';
import { GeoJsonObject } from 'geojson';
export interface Geofeature {
  id: string;
  code: string;
  na: string;
  hcd: boolean;
  hcu: boolean;
  le: number;
  pg: string;
  pi: string;
  pn: string;
  ty: number;
  co: string;
}

export interface LayerGeofeature {
  id: string;
  geofeatures: Array<Geofeature>;
}

export interface GeofeatureEntities {
  [id: string]: LayerGeofeature;
}

export interface Dhis2GeoJsonObject extends GeoJsonObject {
  properties: any;
}

export interface Dhis2LayerGroup extends FeatureGroup {
  options: any;
  feature: any;
}

export interface GeoJSONOptionsExtended extends GeoJSONOptions {
  features: Dhis2GeoJsonObject;
  label?: string;
  hoverlabel?: string;
  labelPane?: string;
  _labels: LayerGroup;
}

export enum GeometryTypes {
  POINT = 'Point',
  POLYGON = 'Polygon',
  MULTIPOLYGON = 'MultiPolygon'
}

export interface LayerGroupEvent extends LeafletEvent {
  layer: Dhis2LayerGroup;
}
