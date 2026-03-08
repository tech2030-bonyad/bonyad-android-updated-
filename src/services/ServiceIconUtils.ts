/**
 * Service Icon Utilities
 * Helper functions for resolving service images/icons
 */

import { getServerBaseUrl } from '../config/api';
import type { ServiceCategoryOrSub } from './ServiceService';

/**
 * Resolve category image with fallback support
 * Handles both SVG URLs and icon names from different APIs
 */
export function resolveServiceImage(service: ServiceCategoryOrSub): any {
  try {
    const baseUrl = getServerBaseUrl();

    // Try to get SVG URL first (for services API)
    if (service.useSvg && service.svgUrl) {
      const svgUrl = service.svgUrl.startsWith('http') 
        ? service.svgUrl 
        : `${baseUrl}${service.svgUrl}`;
      console.log('📦 Service SVG icon:', { serviceId: service.id, svgUrl });
      return { uri: svgUrl };
    }

    // Try regular image URL
    if (service.imageUrl) {
      const imageUrl = service.imageUrl.startsWith('http') 
        ? service.imageUrl 
        : `${baseUrl}${service.imageUrl}`;
      console.log('📷 Service image icon:', { serviceId: service.id, imageUrl });
      return { uri: imageUrl };
    }

    // Try iconUrl (for support categories API)
    if (service.iconUrl) {
      const iconUrl = service.iconUrl.startsWith('http') 
        ? service.iconUrl 
        : `${baseUrl}${service.iconUrl}`;
      console.log('🔷 Service icon URL:', { serviceId: service.id, iconUrl });
      return { uri: iconUrl };
    }

    // If just icon name (like "credit-card"), no URL
    if (service.icon && !service.iconUrl && !service.svgUrl && !service.imageUrl) {
      console.log('⚠️ Service has icon name only:', { serviceId: service.id, iconName: service.icon });
      // Return null so default icon is shown
      return null;
    }

    console.log('❌ No image/icon URL for service:', { serviceId: service.id });
    return null;
  } catch (error) {
    console.warn('Error resolving service image:', error);
    return null;
  }
}

export function resolveServiceImageWithLogging(service: ServiceCategoryOrSub): string | null {
  const result = resolveServiceImage(service);
  return result;
}

/**
 * Check if service should render as SVG
 */
export function shouldRenderSvg(service: ServiceCategoryOrSub): boolean {
  return service.useSvg === true && !!service.svgUrl;
}

