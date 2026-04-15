import { ArrowRight, HeartHandshake, LockKeyhole, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const features = [
  { icon: LockKeyhole, title: '隐私优先', description: '只有双向喜欢且双方都点头后，才会互相看到联系方式。' },
  { icon: Sparkles, title: '问卷匹配', description: '用约 40 道价值观与生活方式问题，帮你筛出更聊得来的校园同学。' },
  { icon: HeartHandshake, title: '轻松开始', description: '没有压力，不强迫社交，按自己的节奏认识新的人。' },
] as const;

export function LandingPage() {
  return (
    <main className="landing-page">
      <section className="landing-hero">
        <div className="landing-hero__glow landing-hero__glow--one" />
        <div className="landing-hero__glow landing-hero__glow--two" />
        <div className="landing-hero__glow landing-hero__glow--three" />
        <div className="landing-hero__content">
          <div className="landing-brand" aria-label="西大校园匹配">
            <span className="landing-brand__mark" aria-hidden="true">
              <HeartHandshake size={22} />
            </span>
            <span className="landing-brand__label">西大校园匹配</span>
          </div>
          <h1 className="landing-title">SWU Date</h1>
          <p className="landing-tagline">在西大，遇见对的人</p>
          <p className="landing-hero__support">
            面向西南大学在校生的低压力校园匹配网站。先轻轻认识，再各自决定要不要交换联系方式。
          </p>
          <div className="hero-actions">
            <Link className="button button--primary landing-button landing-button--primary" to="/register">
              立即加入
              <ArrowRight size={18} />
            </Link>
            <Link className="button button--ghost landing-button landing-button--ghost" to="/login">
              已有账号，去登录
            </Link>
          </div>
          <span className="hero-footnote">仅面向西南大学在校生，首版采用学号 + 密码登录。</span>
        </div>
      </section>

      <section className="landing-section">
        <div className="section-heading">
          <span className="eyebrow">为什么是 SWU Date</span>
          <h2>少一点社交焦虑，多一点舒服的靠近。</h2>
        </div>
        <div className="feature-list">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article key={feature.title} className="feature-item">
                <span className="feature-item__icon">
                  <Icon size={20} />
                </span>
                <div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
