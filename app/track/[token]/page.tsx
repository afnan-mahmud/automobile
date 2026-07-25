export default async function TrackingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-lg font-semibold">Tracking your vehicle</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Live tracking for token &quot;{token}&quot; will be built in Phase
          8.
        </p>
      </div>
    </div>
  );
}
