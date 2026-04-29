/**
 * API Versioning Middleware
 * Adds version information to response headers and handles version routing
 */

import { Request, Response, NextFunction } from 'express';
import { extractApiVersion, isVersionDeprecated, getLatestVersion, getDeprecationWarning, ApiVersion } from '../utils/versioning';

// Extend Express Request to include API version
declare global {
  namespace Express {
    interface Request {
      apiVersion?: ApiVersion;
    }
  }
}

/**
 * Middleware to extract and attach API version to request
 */
export function versioningMiddleware(req: Request, res: Response, next: NextFunction) {
  const version = extractApiVersion(req.path, req.get('Accept-Version'));
  req.apiVersion = version;

  // Add version header to response
  res.setHeader('API-Version', version);
  res.setHeader('X-API-Version', version);

  // Add deprecation warning if version is deprecated
  if (isVersionDeprecated(version)) {
    const latestVersion = getLatestVersion();
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toUTCString()); // 90 days
    res.setHeader('Warning', `299 - "${getDeprecationWarning(version, latestVersion)}"`);
  }

  // Add support information header
  res.setHeader('X-API-Supported-Versions', 'v1, v2');

  next();
}

/**
 * Middleware to handle version routing for unversioned endpoints
 * Falls back to v1 behavior for backward compatibility
 */
export function versionedRouter(req: Request, res: Response, next: NextFunction) {
  // If the route doesn't have a version prefix, treat it as v1
  if (!req.path.match(/\/api\/v\d+\//)) {
    req.apiVersion = ApiVersion.V1;
  }
  next();
}
