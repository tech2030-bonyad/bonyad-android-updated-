/**
 * TourSpot — drop-in wrapper for tour-target elements.
 *
 * Usage:
 *   <TourSpot id="search" style={styles.searchWrap}>
 *     <SearchBar />
 *   </TourSpot>
 *
 * Replaces an existing <View collapsable={false}> wrapper.
 * Forwards all View props so it doesn't break layout.
 */

import React from 'react';
import { View, type ViewProps } from 'react-native';
import { useTour } from './TourProvider';

interface TourSpotProps extends ViewProps {
  /** Unique id matching the spotId in tour step definitions. */
  id: string;
  children: React.ReactNode;
}

export function TourSpot({ id, children, ...viewProps }: TourSpotProps) {
  const { tourRef } = useTour();
  return (
    <View ref={tourRef(id)} collapsable={false} {...viewProps}>
      {children}
    </View>
  );
}
