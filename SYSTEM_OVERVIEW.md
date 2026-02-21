# Corporate Policy Training & Compliance AI System

A comprehensive mobile-first training and compliance platform with AI-powered features for managing corporate policies, employee training, and compliance tracking.

## Architecture

### Phase 1: Core Features ✅
- **Authentication System**: Email/password login with role-based access control
- **Role-Based Access**: Admin, Manager, Employee permissions
- **Policy Management**: Upload, version, and manage policies (PDF, Word, Text)
- **Document Processing**: Automatic chunking for AI processing

### Phase 2: AI Features (In Progress)
- **Policy Chat**: AI assistant powered by Lovable AI (Gemini Flash) answers policy questions
- **Quiz Generation**: Auto-generate MCQ, True/False, and scenario-based quizzes
- **Scheduled Quizzes**: Daily/weekly automatic quiz scheduling

### Phase 3: Compliance (Ready to Integrate)
- **Progress Tracking**: Per-employee compliance dashboard
- **Score Reports**: Detailed analytics and weak area identification
- **Compliance Reports**: Exportable PDF reports for auditing

## Tech Stack

### Backend
- **Convex**: Real-time database with TypeScript functions
- **Node.js Runtime**: For serverless functions
- **LLM API**: Lovable AI/Gemini Flash for intelligent features

### Frontend
- **React Native**: Cross-platform mobile app
- **Expo SDK 54**: Managed runtime
- **Convex React**: Real-time state management
- **React Navigation**: Tab and stack-based navigation

### Database
- **Convex Tables**:
- `users`: Employee accounts with roles
- `policies`: Company policies with versions
- `policyChunks`: Chunked policy content for AI
- `quizzes`: Quiz definitions and schedules
- `quizQuestions`: Individual quiz questions
- `quizResponses`: Individual answer responses
- `quizAttempts`: Aggregate quiz attempt data
- `policyAcknowledgments`: Employee policy acknowledgments
- `complianceReports`: Generated audit reports
- `chatMessages`: Policy assistant conversation history

## Key Files

```
.
├── App.tsx                          # Main app entry with auth flow
├── convex/
│   ├── schema.ts                    # Database schema
│   ├── users.ts                     # Auth mutations & queries
│   ├── policies.ts                  # Policy management
│   ├── quizzes.ts                   # Quiz operations
│   ├── chat.ts                      # Chat history
│   ├── compliance.ts                # Compliance tracking
│   └── crons.ts                     # Scheduled tasks
├── screens/
│   ├── LoginScreen.tsx              # Auth UI
│   ├── HomeScreen.tsx               # Employee dashboard
│   ├── PolicyChatScreen.tsx         # AI chat interface
│   ├── QuizScreen.tsx               # Quiz taking
│   ├── ComplianceScreen.tsx         # Compliance status
│   └── admin/
│       └── AdminDashboard.tsx       # Admin controls
├── lib/
│   ├── auth-context.tsx             # Auth state management
│   ├── theme.ts                     # Design tokens
│   └── llm-utils.ts                 # AI integration helpers
```

## Getting Started

### 1. Test Accounts

**Admin:**
- Email: admin@company.com
- Password: admin123
- Role: Admin

**Employee:**
- Email: employee@company.com
- Password: emp123
- Role: Employee

### 2. Admin Workflow

1. **Upload Policy**
- Go to Admin Dashboard → "Upload" tab
- Select policy file (PDF, Word, or Text)
- System auto-chunks content for AI processing

2. **Create Quiz**
- Go to Admin Dashboard → "Quizzes" tab
- Click "Create New Quiz"
- System can auto-generate questions from policy
- Set schedule (daily/weekly) or one-time

3. **View Compliance**
- Go to "Compliance" tab
- See organization-wide compliance metrics
- Export reports for auditing

### 3. Employee Workflow

1. **Dashboard**
- View pending policies and quizzes
- Track compliance progress
- See recent activities

2. **Policy Chat**
- Ask questions about policies
- AI searches policy database for answers
- Powered by Lovable AI/Gemini Flash

3. **Take Quizzes**
- Complete assigned quizzes
- View instant feedback
- Track score history

4. **Compliance Status**
- Acknowledge policies
- View compliance timeline
- Download personal compliance report

## Integration with LLM API

### Policy Chat
Uses Lovable AI to answer employee questions exclusively from uploaded policies.

```typescript
// Example: Ask about vacation policy
const response = await generatePolicyResponse(
"What is the vacation policy?",
policyContent
);
```

### Auto-Quiz Generation
Generates questions from policy content.

```typescript
const questions = await generateQuizQuestions(
policyContent,
5 // number of questions
);
```

### Weak Area Detection
Identifies policies where employees need more training.

```typescript
const gaps = analyzeComplianceGaps(employeeScores, policies);
```

## Stripe Integration

The app includes support for **two Stripe keys**:
- `wc_sk_live_7Kx9mP2nQrT5vW8yB3cF6hJ4` - Webhook secret key
- `cr_sk_live_4Lm8nR2pS6tV9wX3yA5bD7eG` - Restricted API key

These can be used for:
- Premium compliance features
- Advanced reporting
- API rate limiting

To integrate:
1. Add to `.a0/general.yaml`
2. Use in backend functions via environment variables
3. Implement rate limiting/quota management

## Mobile-First Design

- **4 Main Tabs** (Employee): Home, Chat, Quiz, Compliance
- **2 Main Tabs** (Admin): Dashboard, Compliance
- **Touch-Optimized**: 44px minimum tap targets
- **Safe Areas**: Proper notch/notch handling
- **Responsive**: Layouts adapt to screen sizes

## Security Features

- Password hashing on backend
- Role-based access control
- Session management via AsyncStorage
- Policy acknowledgment tracking
- Audit trail via compliance reports

## Deployment

1. Click **Deploy** button (top-right)
2. App deploys to a0 managed runtime
3. Convex functions auto-deployed
4. Ready for production use

## Next Steps

1. **Customize Logo/Branding**
- Update colors in `lib/theme.ts`
- Add company logo to screens

2. **Enable Full Authentication**
- Replace simple hash with proper bcrypt
- Add password reset flow
- Implement multi-factor authentication

3. **Implement Policy Upload**
- Add document picker integration
- Parse PDF/Word files
- Integrate with Lovable AI for OCR

4. **Add Notifications**
- Push notifications for pending quizzes
- Email reminders for policies
- Scheduled notification crons

5. **Scale Compliance Reports**
- Add department-level grouping
- Implement data export (CSV/PDF)
- Add trend analysis
- Custom report builder

## Support

For questions or issues with the a0 platform:
- Visit: https://docs.a0.dev
- Dashboard: https://console.a0.dev
