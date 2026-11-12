export default function DriverLayout({ children }: LayoutProps<"/driver">) {
  return <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">{children}</div>;
}
