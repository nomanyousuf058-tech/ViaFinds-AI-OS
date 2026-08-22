# Admin Authentication & Safe Publishing Security

## Architecture Overview
The ViaFinds AI OS publishing mechanism relies heavily on a strictly protected server-side administrative verification framework. The system guarantees that even if a workflow successfully navigates the entire product intelligence, SEO, and image generation pipeline, it is *impossible* for content to go live autonomously without explicit authorization if the pipeline mode demands human review.

## Draft Status Isolation
Inside `PublisherWorkflow.ts`, all incoming content objects are deliberately flagged as drafts before pushing to the CMS:
```typescript
uco.metadata.publishing = {
  status: Status.DRAFT,
  approvalStatus: 'pending',
  published: false,
}
```

## Dashboard Guard Rails
Access to the Dashboard, Draft Review page, and Approval triggers are gated via `lib/auth.ts`.
- **`adminOnly()` Enforcement**: Used across all `/dashboard` route layouts and actions. This checks the encrypted JWT `auth_token` cookie. If missing or invalid, the request is violently bounced to `/login`.
- **Mutation Protection**: The Server Actions that execute `Approve & Publish` (`app/dashboard/draft-review/[id]/actions.ts`) explicitly invoke `verifyAdminToken()` before attempting to mutate the Sanity Database to toggle the state from `DRAFT` to `PUBLISHED`. 

## Best Practices Established
- **No Client-Side Secrets**: All database and publishing API calls are executed strictly within Node.js Server Actions or API routes, preventing client exposure of the `SANITY_TOKEN`.
- **Idempotent Saves**: Approving a draft that is already live does not duplicate the document in Sanity; it safely overwrites the existing state using `createOrReplace`.
