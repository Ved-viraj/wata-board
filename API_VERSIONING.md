# API Versioning Implementation

## Overview
This document describes the API versioning strategy implemented for the Wata-Board backend to prevent breaking changes and ensure backward compatibility for existing integrations.

## Problem Statement
API changes can break existing integrations. Without proper versioning, clients have no way to maintain functionality when the API is updated. This issue #170 addresses the need for a robust API versioning system.

## Solution Architecture

### Versioning Strategy
We implement **URI-based versioning** using path prefixes (e.g., `/api/v1/`, `/api/v2/`), which is:
- **Explicit**: Version is clearly visible in the URL
- **RESTful**: Follows REST conventions
- **Client-friendly**: Easy for clients to adopt specific versions
- **Cache-friendly**: Different versions can have different cache strategies

### Current Implementation

#### Versions Supported
- **V1** (Default): Legacy endpoints, maintained for backward compatibility
- **V2**: Enhanced version with potential improvements and new features

#### API Version Configuration
Located in `src/utils/versioning.ts`:
- Default version: V1
- Supported versions: [V1, V2]
- Deprecated versions: [] (currently none)

### Route Structure

#### Before Versioning
```
/api/payment
/api/monitoring
/api/currency
/api/analytics
/api/user/kyc
... etc
```

#### After Versioning
```
# Versioned routes (recommended)
/api/v1/payment
/api/v2/payment
/api/v1/monitoring
/api/v2/monitoring
/api/v1/currency
/api/v2/currency
/api/v1/analytics
/api/v2/analytics
/api/v1/user/kyc
/api/v2/user/kyc
... etc

# Legacy routes (backward compatibility)
/api/payment           → routes to v1
/api/monitoring        → routes to v1
/api/currency          → routes to v1
/api/analytics         → routes to v1
/api/user/kyc          → routes to v1
... etc
```

### Version Detection (Priority Order)
1. **URL Path**: `/api/v1/` or `/api/v2/` prefix
2. **Accept-Version Header**: `Accept-Version: v1`
3. **Default**: Falls back to V1

### Response Headers
All responses include version information:
```
API-Version: v1
X-API-Version: v1
X-API-Supported-Versions: v1, v2
```

### Deprecation Warnings
When using a deprecated version (future-proofing), responses include:
```
Deprecation: true
Sunset: <Date 90 days in future>
Warning: 299 - "API version vX is deprecated. Please upgrade to vY."
```

## Implementation Details

### Files Created

#### 1. `src/utils/versioning.ts`
Core versioning utilities:
- `ApiVersion` enum: Defines available versions (V1, V2)
- `VersionConfig`: Configuration for versioning behavior
- `extractApiVersion()`: Extracts version from request
- `isVersionDeprecated()`: Checks if version is deprecated
- `getLatestVersion()`: Gets the latest supported version
- `getVersionedPath()`: Formats versioned paths
- `getDeprecationWarning()`: Generates deprecation messages

#### 2. `src/middleware/versioning.ts`
Versioning middleware:
- `versioningMiddleware()`: Main middleware that:
  - Extracts API version from request
  - Attaches version to response headers
  - Adds deprecation warnings if applicable
  - Adds supported versions header
- `versionedRouter()`: Fallback middleware for unversioned endpoints

### Files Modified

#### `src/server.ts`
Updated to:
1. Import versioning middleware and utilities
2. Apply versioning middleware to all requests
3. Register versioned endpoints (V1 and V2) for all API routes
4. Maintain legacy unversioned endpoints for backward compatibility
5. Ensure all endpoints have proper version prefixes

**Endpoints Updated:**
- Payment endpoints: `/api/v1/payment`, `/api/v2/payment`
- Multi-provider payment: `/api/v1/payment/multi-provider`, `/api/v2/payment/multi-provider`
- Rate limiting: `/api/v1/rate-limit/:userId`, `/api/v2/rate-limit/:userId`
- Analytics: `/api/v1/analytics/:userId`, `/api/v2/analytics/:userId`
- Transaction status: `/api/v1/transaction-status/:transactionId`, `/api/v2/transaction-status/:transactionId`
- KYC endpoints: `/api/v1/user/kyc/*`, `/api/v2/user/kyc/*`
- User data: `/api/v1/user/export-data/:userId`, `/api/v2/user/export-data/:userId`
- Data deletion: `/api/v1/user/delete-data/:userId`, `/api/v2/user/delete-data/:userId`
- Mounted routes: `/api/v1/monitoring`, `/api/v1/currency`, etc.

## Usage Examples

### Using V1 API (Default, via URL)
```bash
curl https://api.wata-board.com/api/v1/payment \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "meter_id": "METER001",
    "amount": 100,
    "userId": "USER123"
  }'
```

### Using V2 API (via URL)
```bash
curl https://api.wata-board.com/api/v2/payment \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "meter_id": "METER001",
    "amount": 100,
    "userId": "USER123"
  }'
```

### Using Accept-Version Header
```bash
curl https://api.wata-board.com/api/payment \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Accept-Version: v2" \
  -d '{
    "meter_id": "METER001",
    "amount": 100,
    "userId": "USER123"
  }'
```

### Response Headers
```
HTTP/1.1 200 OK
API-Version: v1
X-API-Version: v1
X-API-Supported-Versions: v1, v2
Content-Type: application/json

{
  "success": true,
  "transactionId": "...",
  "rateLimitInfo": {...}
}
```

## Backward Compatibility

### Legacy Routes
All existing unversioned routes (`/api/payment`, `/api/monitoring`, etc.) are maintained and automatically routed to V1, ensuring:
- Existing clients continue to work without modifications
- Gradual migration path for clients
- No breaking changes for current integrations

### Migration Path
1. **Current State**: Clients can use either `/api/payment` or `/api/v1/payment`
2. **Future**: When a new major version is released, clients can migrate to `/api/v2/payment`
3. **Deprecation**: Old versions will include deprecation warnings in headers and documentation
4. **Sunset**: After a reasonable period (announced in advance), deprecated versions may be removed

## Rate Limiting with Versioning
Rate limiting middleware is applied to all API versions:
```typescript
app.use('/api/v1/payment', tieredRateLimiter.middleware());
app.use('/api/v2/payment', tieredRateLimiter.middleware());
```

## Future Enhancements

### Phase 2: Version-Specific Features
- Implement V2-specific endpoints with enhanced functionality
- Add response schema versioning
- Implement content negotiation

### Phase 3: Deprecation Management
- Add deprecation tracking in monitoring
- Generate migration guides for each version
- Implement automated deprecation notifications

### Phase 4: Advanced Versioning
- Implement request/response transformation layers
- Add API versioning analytics
- Support for extended version semantics (v1.1, v1.2, etc.)

## Testing

### Manual Testing Checklist
- [ ] V1 endpoints respond with `API-Version: v1` header
- [ ] V2 endpoints respond with `API-Version: v2` header
- [ ] Legacy routes respond with version headers
- [ ] Accept-Version header overrides default version
- [ ] URL path version has priority over Accept-Version header
- [ ] Rate limiting works for all versions
- [ ] Error responses include version headers
- [ ] All endpoints return supported versions in headers

### Integration Testing
```bash
# Test V1
npm test -- --testNamePattern="API v1"

# Test V2
npm test -- --testNamePattern="API v2"

# Test backward compatibility
npm test -- --testNamePattern="backward compatibility"
```

## Monitoring & Metrics

Track the following metrics:
- API version usage distribution (v1 vs v2)
- Deprecation warning frequency
- Migration progress from legacy to versioned endpoints

## Reference Documentation

- [REST API Versioning Best Practices](https://www.restapitutorial.com/versioning.html)
- [Semantic Versioning](https://semver.org/)
- [HTTP Header Status Code 226](https://tools.ietf.org/html/rfc6585#section-5)

## Support & Questions

For questions about API versioning or migration, please refer to:
1. This documentation
2. MULTI_PROVIDER_GUIDE.md for provider-specific versioning
3. CONFIGURATION.md for version configuration

---
**Issue**: #170 - Missing REST API Versioning
**Implemented**: April 2026
**Status**: Ready for testing and deployment
