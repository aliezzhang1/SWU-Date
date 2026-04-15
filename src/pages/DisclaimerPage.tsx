import { Link } from 'react-router-dom';

export function DisclaimerPage() {
  return (
    <main className="app-page legal-page">
      <section className="page-shell stack-lg">
        <header className="section-heading section-heading--left">
          <span className="eyebrow">免责声明</span>
          <h1>请把这当成一次更安全的相遇入口</h1>
        </header>
        <section className="info-card stack-md">
          <p>SWU Date 仅提供匹配推荐和站内交流入口，不保证一定匹配成功，也不代替你对线下见面的判断。</p>
          <p>所有用户都应对自己的线上、线下行为负责。如果你遇到骚扰、冒充、诈骗或任何不舒服的情况，请第一时间举报并停止接触。</p>
          <p>如果你决定线下见面，建议优先选择公共场所，并提前告诉朋友你的行程。</p>
          <p>继续使用 SWU Date 即表示你理解：平台会尽力做好基础风控，但无法替代你对自身安全的判断。</p>
        </section>
        <Link className="button button--ghost" to="/register">返回注册</Link>
      </section>
    </main>
  );
}
