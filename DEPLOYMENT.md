# PLDG Dashboard - Production Deployment Guide

This guide covers the production-grade security, logging, and deployment configurations for the PLDG Dashboard.

## 🔐 Security Implementation

### Features Added
- **API Security**: Helmet, CORS, and Rate Limiting middleware
- **Authentication**: JWT token validation and session management
- **Input Validation**: Request sanitization and validation
- **Security Headers**: Comprehensive security headers for all responses

### Configuration Files
- `src/lib/security.ts` - Core security middleware
- `src/lib/middleware.ts` - HTTP request middleware with logging
- `middleware.ts` - Global Next.js middleware

### Environment Variables
```bash
# Security Configuration
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
TRUSTED_PROXIES=1

# Error Tracking
SENTRY_DSN=your_sentry_dsn
SENTRY_ENVIRONMENT=production
```

## 📊 Logging & Monitoring

### Logging System
- **Winston**: Structured logging with file and console outputs
- **Request Logging**: All HTTP requests logged with context
- **Performance Monitoring**: Response times and resource usage tracking
- **Error Tracking**: Comprehensive error logging with stack traces

### Monitoring Endpoints
- `/api/health` - Health check with service status
- `/api/metrics` - Prometheus-compatible metrics
- **Logs Location**: `./logs/` (configurable via `LOG_DIRECTORY`)

### Configuration Files
- `src/lib/logger.ts` - Winston logging configuration
- `src/lib/monitoring.ts` - Metrics collection and Prometheus integration
- `sentry.client.config.ts` - Client-side error tracking
- `sentry.server.config.ts` - Server-side error tracking

### Environment Variables
```bash
# Logging Configuration
LOG_LEVEL=info
ENABLE_CONSOLE_LOGS=false
ENABLE_FILE_LOGS=true
LOG_DIRECTORY=./logs
LOG_MAX_FILE_SIZE=20m
LOG_MAX_FILES=14d
```

## 🚀 EC2 Deployment

### Deployment Script
The `scripts/deploy-ec2.sh` script provides automated deployment with:
- **PM2 Process Manager**: Zero-downtime deployments
- **Nginx Reverse Proxy**: Load balancing and SSL termination
- **SSL/TLS**: Automatic Let's Encrypt certificate management
- **Monitoring**: Log rotation and system monitoring

### Usage
```bash
# Basic deployment
./scripts/deploy-ec2.sh

# With custom configuration
./scripts/deploy-ec2.sh --env production --port 3000

# Environment variables
export REPO_URL="https://github.com/your-org/pldg-dashboard.git"
export SERVER_NAME="your-domain.com"
export SSL_EMAIL="admin@your-domain.com"
export MONGODB_URI="your_mongodb_connection_string"
./scripts/deploy-ec2.sh
```

### Prerequisites
- Ubuntu 18.04+ server
- Node.js 18+
- PM2 installed globally
- Nginx installed and configured
- SSL certificate (Let's Encrypt recommended)

## ☸️ Kubernetes Deployment

### Manifests Included
- `k8s/deployment.yaml` - Application deployment with HPA and resource limits
- `k8s/service.yaml` - Service configurations (ClusterIP, NodePort)
- `k8s/ingress.yaml` - Ingress with SSL/TLS and rate limiting

### Features
- **Horizontal Pod Autoscaling**: CPU and memory-based scaling
- **Resource Limits**: Memory and CPU constraints
- **Health Checks**: Liveness, readiness, and startup probes
- **Security Context**: Non-root user and read-only filesystem
- **Network Policies**: Traffic isolation and security

### Deployment Commands
```bash
# Create namespace
kubectl create namespace production

# Apply configurations
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml

# Check status
kubectl get pods -n production
kubectl get services -n production
kubectl get ingress -n production
```

### Configuration
Update the following in the YAML files:
- Domain names in `ingress.yaml`
- SSL certificate ARNs
- Secrets for database connections and API keys
- Resource limits based on your requirements

## 🔧 API Integration Logging

### Updated Routes
The following API routes now include comprehensive logging:
- `/api/ai/*` - AI service interactions with token usage tracking
- `/api/github` - GitHub API calls with rate limit monitoring
- `/api/airtable` - Airtable API with request/response logging

### Logging Features
- **Request Tracking**: Unique request IDs for tracing
- **Performance Metrics**: Response times and resource usage
- **Error Handling**: Detailed error logging with context
- **External API Monitoring**: Rate limits and API health tracking

## 📈 Metrics & Observability

### Prometheus Integration
- Metrics endpoint at `/api/metrics`
- Custom metrics for HTTP requests, errors, and performance
- Memory and process metrics
- Request duration histograms

### Grafana Dashboard
Create dashboards using these metrics:
- Request rate and latency
- Error rates by endpoint
- Memory and CPU usage
- External API health

### Sample Queries
```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(application_errors_total[5m])

# Response time percentiles
histogram_quantile(0.95, http_request_duration_seconds_bucket)
```

## 🧪 Environment Configuration

### Development
```bash
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_CONSOLE_LOGS=true
ENABLE_FILE_LOGS=false
USE_LOCAL_DATA=true
```

### Production
```bash
NODE_ENV=production
LOG_LEVEL=info
ENABLE_CONSOLE_LOGS=false
ENABLE_FILE_LOGS=true
CORS_ORIGINS=https://your-domain.com
RATE_LIMIT_MAX_REQUESTS=100
```

### Staging
```bash
NODE_ENV=staging
LOG_LEVEL=debug
ENABLE_CONSOLE_LOGS=true
ENABLE_FILE_LOGS=true
CORS_ORIGINS=https://staging.your-domain.com
RATE_LIMIT_MAX_REQUESTS=200
```

## 🔍 Troubleshooting

### Common Issues
1. **Rate Limiting**: Check logs for 429 responses
2. **CORS Errors**: Verify `CORS_ORIGINS` configuration
3. **Memory Issues**: Monitor `/api/metrics` for memory usage
4. **SSL Issues**: Check certificate renewal in EC2 deployment

### Log Analysis
```bash
# View application logs
pm2 logs pldg-dashboard

# Check error logs
tail -f logs/error.log

# Monitor access logs
tail -f logs/access.log

# View system metrics
curl http://localhost:3000/api/health
```

### Performance Optimization
- Monitor response times in logs
- Use `/api/metrics` for performance insights
- Scale horizontally in Kubernetes based on HPA metrics
- Optimize database queries based on logged durations

## 🚨 Security Checklist

- [ ] SSL/TLS certificates configured
- [ ] Rate limiting enabled and tested
- [ ] CORS origins properly configured
- [ ] Security headers implemented
- [ ] Sensitive data not logged
- [ ] API keys stored as secrets
- [ ] Network policies configured (K8s)
- [ ] Resource limits set appropriately
- [ ] Error tracking configured
- [ ] Log retention policies in place

This implementation provides enterprise-grade security, comprehensive logging, and flexible deployment options suitable for production environments.