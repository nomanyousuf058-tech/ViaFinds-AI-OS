# 04 PHASE 1 UI

## Location
`app/dashboard/brain/page.tsx`

## Design Alignment
The UI perfectly matches the existing ViaFinds aesthetic (e.g. from `automation/page.tsx`), utilizing:
- `bg-obsidian-deep` for cards.
- `bg-surface-container` for secondary blocks.
- `font-headline-lg` and `font-mono-data` typography.

## Capabilities
1. **Wake Brain**: Primary action button to trigger the analysis cycle.
2. **Status Display**: Shows read-only mode, connected sources, and limitations.
3. **Current Understanding**: Renders the context the Brain gathered (article counts, jobs).
4. **Key Observations**: Lists the generated facts, inferences, and evidence with confidence color-coding.
5. **Opportunities & Recommendations**: Highlights actionable next steps (though the UI does not allow clicking to execute them yet).
