/**
 * 全局环境光效（唯一的装饰层，tech 主题允许）：
 * 极光色斑缓慢漂移 + 顶部渐隐网格。纯 CSS 动画，pointer-events 关闭，
 * prefers-reduced-motion 时静止。
 */
export default function Aurora() {
  return (
    <div className="bg-aurora" aria-hidden>
      <div className="bg-grid" />
      <div className="blob blob-cyan" />
      <div className="blob blob-pink" />
      <div className="blob blob-indigo" />
    </div>
  );
}
