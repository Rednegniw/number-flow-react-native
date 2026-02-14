import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col justify-center text-center flex-1">
      <h1 className="text-2xl font-bold mb-4">number-flow-react-native</h1>
      <p className="text-fd-muted-foreground mb-4">
        Animated number transitions for React Native.
      </p>
      <p>
        <Link href="/docs" className="font-medium underline">
          Read the docs
        </Link>
      </p>
    </div>
  );
}
