/** Cada página entra subindo de leve (o template é montado de novo a cada navegação). */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
