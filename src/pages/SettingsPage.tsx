import { Bell, BellOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { changeCurrentPassword, deleteCurrentAccount, loginWithStudentAccount } from '../services/auth';
import { getMatchPreferences, updateMatchPreferences } from '../services/matching';
import { useAuthStore } from '../store/authStore';
import { pushToast } from '../store/uiStore';
import type { MatchPreferences } from '../types/domain';
import { isValidPassword, maskStudentId } from '../utils/validators';

const gradeRangeOptions: Array<{ label: string; value: string }> = [
  { label: '仅同年级', value: '0' },
  { label: '前后 1 级（默认）', value: '1' },
  { label: '前后 2 级', value: '2' },
  { label: '前后 3 级', value: '3' },
  { label: '不限年级', value: 'all' },
];

const reminderOptions: Array<{ label: string; value: string; hour: number; minute: number }> = [
  { label: '20:30 提醒', value: '20:30', hour: 20, minute: 30 },
  { label: '20:45 提醒', value: '20:45', hour: 20, minute: 45 },
  { label: '20:55 提醒', value: '20:55', hour: 20, minute: 55 },
  { label: '21:00 准点提醒', value: '21:00', hour: 21, minute: 0 },
];

function toGradeRangeValue(maxGradeDiff: number | null) {
  return maxGradeDiff === null ? 'all' : String(maxGradeDiff);
}

function toPreferences(gradeRange: string, reminderEnabled: boolean, reminderTime: string): MatchPreferences {
  const option = reminderOptions.find((item) => item.value === reminderTime) ?? reminderOptions[2];
  return {
    maxGradeDiff: gradeRange === 'all' ? null : Number(gradeRange),
    reminderEnabled,
    reminderHour: option.hour,
    reminderMinute: option.minute,
  };
}

export function SettingsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deleteToken, setDeleteToken] = useState('');
  const [gradeRange, setGradeRange] = useState('1');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderTime, setReminderTime] = useState('20:55');
  const [isBusy, setIsBusy] = useState(false);
  const [isPreferenceSaving, setIsPreferenceSaving] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<'default' | 'denied' | 'granted'>(() => (
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  ));

  useEffect(() => {
    if (!user) return;
    void getMatchPreferences(user.id)
      .then((preferences) => {
        setGradeRange(toGradeRangeValue(preferences.maxGradeDiff));
        setReminderEnabled(preferences.reminderEnabled);
        setReminderTime(`${String(preferences.reminderHour).padStart(2, '0')}:${String(preferences.reminderMinute).padStart(2, '0')}`);
      })
      .catch((error) => {
        console.error(error);
        pushToast('error', '匹配设置加载失败', '先用默认值也能正常参与每日配对。');
      });
  }, [user]);

  if (!user) return null;
  const currentUser = user;
  const notificationSupported = typeof window !== 'undefined' && 'Notification' in window;
  const notificationLabel = !notificationSupported
    ? '当前浏览器不支持系统通知'
    : notificationPermission === 'granted'
      ? '浏览器通知已开启'
      : '浏览器通知未开启';

  async function handlePreferenceSave() {
    setIsPreferenceSaving(true);
    try {
      const preferences = toPreferences(gradeRange, reminderEnabled, reminderTime);
      await updateMatchPreferences(currentUser.id, preferences);
      pushToast('success', '每日配对设置已保存', '新的年级范围和提醒时间会用于下一轮 21:00 配对。');
    } catch (error) {
      console.error(error);
      pushToast('error', '保存失败', error instanceof Error ? error.message : '请稍后重试。');
    } finally {
      setIsPreferenceSaving(false);
    }
  }

  async function handleNotificationPermission() {
    if (!notificationSupported) {
      pushToast('info', '当前浏览器不支持通知');
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      pushToast('success', '浏览器通知已开启', '在你打开网页时，我们会按设置时间提醒今晚 21:00 的配对。');
      return;
    }

    pushToast('info', '通知未开启', '你仍然可以在首页看到站内倒计时提醒。');
  }

  async function handlePasswordChange() {
    if (!currentUser.studentId) {
      pushToast('error', '缺少学号信息');
      return;
    }
    if (!isValidPassword(newPassword)) {
      pushToast('error', '新密码不符合规则');
      return;
    }
    if (newPassword !== confirmPassword) {
      pushToast('error', '两次新密码不一致');
      return;
    }

    setIsBusy(true);
    try {
      const { error } = await loginWithStudentAccount(currentUser.studentId, oldPassword);
      if (error) throw error;
      await changeCurrentPassword(newPassword);
      pushToast('success', '密码已更新');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error(error);
      pushToast('error', '修改密码失败', error instanceof Error ? error.message : '请检查旧密码后重试。');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDelete() {
    if (deleteToken !== '确认注销') {
      pushToast('error', '请输入“确认注销”后再继续。');
      return;
    }

    setIsBusy(true);
    try {
      await deleteCurrentAccount();
      pushToast('success', '账号已注销');
      navigate('/', { replace: true });
    } catch (error) {
      console.error(error);
      pushToast('error', '注销失败', error instanceof Error ? error.message : '请稍后再试。');
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <main className="app-page">
      <section className="page-shell stack-lg">
        <header className="section-heading section-heading--left">
          <span className="eyebrow">设置</span>
        </header>

        <section className="info-card stack-md">
          <div className="stack-xs">
            <h2>每日配对偏好</h2>
            <p>系统会在每天 21:00 发放 1 位当前最契合的人。默认只匹配前后 1 个年级，你可以在这里改范围。</p>
          </div>

          <label className="field">
            <span>可匹配年级范围</span>
            <select value={gradeRange} onChange={(event) => setGradeRange(event.target.value)}>
              {gradeRangeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="toggle-field">
            <div>
              <strong>开启每日提醒</strong>
              <p>提醒只影响站内倒计时和浏览器提醒，不会改变 21:00 的配对时间。</p>
            </div>
            <button
              type="button"
              className={`toggle-chip${reminderEnabled ? ' is-active' : ''}`}
              onClick={() => setReminderEnabled((value) => !value)}
            >
              {reminderEnabled ? <Bell size={16} /> : <BellOff size={16} />}
              {reminderEnabled ? '已开启' : '已关闭'}
            </button>
          </label>

          <label className="field">
            <span>提醒时间</span>
            <select value={reminderTime} onChange={(event) => setReminderTime(event.target.value)} disabled={!reminderEnabled}>
              {reminderOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <div className="info-card info-card--subtle stack-sm">
            <strong>{notificationLabel}</strong>
            <p>如果你允许浏览器通知，打开网页时会按设置时间提醒你今晚的配对即将揭晓。</p>
            <button type="button" className="button button--ghost" onClick={() => void handleNotificationPermission()}>
              请求浏览器通知权限
            </button>
          </div>

          <button type="button" className="button button--primary" disabled={isPreferenceSaving} onClick={() => void handlePreferenceSave()}>
            {isPreferenceSaving ? '保存中...' : '保存每日配对设置'}
          </button>
        </section>

        <section className="info-card stack-md">
          <h2>账号安全</h2>
          <p>学号：{currentUser.studentId ? maskStudentId(currentUser.studentId) : '未读取到'}</p>
          <label className="field">
            <span>旧密码</span>
            <input type="password" value={oldPassword} onChange={(event) => setOldPassword(event.target.value)} />
          </label>
          <label className="field">
            <span>新密码</span>
            <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
          </label>
          <label className="field">
            <span>确认新密码</span>
            <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
          </label>
          <button type="button" className="button button--primary" disabled={isBusy} onClick={() => void handlePasswordChange()}>
            更新密码
          </button>
        </section>

        <section className="info-card stack-sm">
          <h2>隐私与说明</h2>
          <Link className="list-card list-card--action" to="/me/blocklist">黑名单管理</Link>
          <Link className="list-card list-card--action" to="/legal/privacy">隐私政策</Link>
          <Link className="list-card list-card--action" to="/legal/disclaimer">免责声明</Link>
        </section>

        <section className="danger-zone stack-md">
          <h2>危险操作</h2>
          <button
            type="button"
            className="button button--ghost button--block"
            onClick={async () => {
              await signOut();
              navigate('/', { replace: true });
            }}
          >
            退出登录
          </button>
          <label className="field">
            <span>输入“确认注销”以删除账号</span>
            <input value={deleteToken} onChange={(event) => setDeleteToken(event.target.value)} placeholder="确认注销" />
          </label>
          <button type="button" className="button button--danger button--block" disabled={isBusy} onClick={() => void handleDelete()}>
            注销账号
          </button>
        </section>
      </section>
    </main>
  );
}
