# Deployment Guide

## Pre-Deployment Checklist

- [ ] Test all authentication flows
- [ ] Verify policy upload works
- [ ] Test quiz creation and taking
- [ ] Check compliance report generation
- [ ] Review admin dashboard functionality
- [ ] Test on iOS simulator
- [ ] Test on Android emulator

## Deployment Steps

### 1. Configure Environment

Add to `.a0/general.yaml`:
```yaml
name: "Policy Training System"
description: "Corporate compliance and training platform"
```

### 2. Deploy to Production

1. Click **Deploy** button in top-right
2. Wait for Convex backend to sync
3. Mobile app auto-deploys to managed runtime

### 3. Post-Deployment

1. Test in production environment
2. Set up test accounts
3. Run through complete workflows
4. Monitor logs in `.a0/logs/`

## Scaling Considerations

### Database
- Convex automatically scales
- Monitor request usage
- Implement pagination for large datasets

### AI Requests
- Rate limit LLM API calls
- Cache policy chunks to reduce calls
- Batch quiz generation during off-hours

### Users
- Current schema supports 1000+ employees
- For 10k+ users, consider denormalization
- Archive old quiz attempts regularly

## Monitoring

Check logs in `.a0/logs/`:
- `convex/` - Backend function errors
- `runtime/` - App runtime issues

## Backups

- Convex automatically backs up data
- Export compliance reports regularly
- Archive policy versions

## Support

Contact a0 support for:
- Scaling recommendations
- Performance optimization
- Custom integrations
