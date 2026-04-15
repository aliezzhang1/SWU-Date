import { Link } from 'react-router-dom';

export function PrivacyPage() {
  return (
    <main className="app-page legal-page">
      <section className="page-shell stack-lg">
        <header className="section-heading section-heading--left">
          <span className="eyebrow">隐私政策</span>
          <h1>你留下的信息，只为帮你更安心地认识人</h1>
        </header>
        <section className="info-card stack-md">
          <p>我们会收集学号、昵称、问卷答案、头像，以及你在匹配后选择展示的联系方式，用于账号认证、推荐匹配和联系方式授权功能。</p>
          <p>学号只作为认证用途，不会展示给其他用户。资料页默认只展示你主动公开的内容，比如昵称、学院、年级、简介和问卷标签。</p>
          <p>联系方式不会在匹配成功后立即展示。只有双方都单独点击同意展示联系方式后，彼此才会看到对方公开的联系信息。</p>
          <p>当前默认使用 Supabase 进行云端存储和访问控制。平台不会向第三方出售你的个人数据。</p>
          <p>你可以随时修改资料、更新问卷、撤回联系方式授权、拉黑他人，也可以在设置页申请注销账号并删除相关数据。</p>
        </section>
        <Link className="button button--ghost" to="/me/settings">返回设置</Link>
      </section>
    </main>
  );
}

