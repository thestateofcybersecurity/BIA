import { notFound } from 'next/navigation';
import { StackHandler } from '@stackframe/stack';
import { authEnabled, getStackServerApp } from '@/lib/stack';

export default function Handler(props: unknown) {
  if (!authEnabled()) notFound();
  return <StackHandler fullPage app={getStackServerApp()} routeProps={props} />;
}
