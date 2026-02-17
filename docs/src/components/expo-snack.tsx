interface ExpoSnackProps {
  id?: string;
  platform?: string;
  title?: string;
  code?: string;
}

export function ExpoSnack({ title, code }: ExpoSnackProps) {
  return (
    <div className="rounded-lg border border-fd-border bg-fd-muted/50 p-6 text-center">
      <p className="text-sm font-medium text-fd-muted-foreground mb-2">
        {title ?? 'Interactive Snack'}
      </p>
      <p className="text-xs text-fd-muted-foreground/70">
        Interactive Snack coming soon — install from npm to try it live.
      </p>
      {code && (
        <pre className="mt-4 rounded-md bg-fd-background p-3 text-left text-xs overflow-x-auto">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}
