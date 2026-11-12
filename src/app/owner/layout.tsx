export default function OwnerLayout({ children }: LayoutProps<"/owner">) {
  return <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col">{children}</div>;
}
