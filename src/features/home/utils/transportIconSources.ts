import type { ImageSourcePropType } from 'react-native';

/**
 * Maps `assetKey` values from `assets/transport-icons-manifest.json`
 * (`transportAndServiceIcons`) to bundled image sources. Keys must stay in sync with that JSON.
 */
export const TRANSPORT_ICON_SOURCES: Record<string, ImageSourcePropType> = {
  riderCar: require('../../../../assets/images/rider-car.png'),
  delivery: require('../../../../assets/images/delivery.png'),
  taxiIcon: require('../../../../assets/images/taxi_icon.png'),
  courier: require('../../../../assets/images/courier.png'),
  busImg: require('../../../../assets/images/busImg.png'),
  scootyImg: require('../../../../assets/images/scooty.png'),
  riderBike: require('../../../../assets/images/rider-bike.png'),
  riderSmVan: require('../../../../assets/images/rider-sm-van.png'),
  riderMwb: require('../../../../assets/images/rider-mwb.png'),
  riderLWb: require('../../../../assets/images/rider-lwb.png'),
  riderXlWb: require('../../../../assets/images/rider-xlwb.png'),
  riderLuton: require('../../../../assets/images/rider-luton.png'),
  riderSevenFive: require('../../../../assets/images/rider-7.5t.png'),
};

export function transportIconSource(assetKey: string): ImageSourcePropType | undefined {
  return TRANSPORT_ICON_SOURCES[assetKey];
}
