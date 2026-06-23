/**
 * 홈 페이지 (준비 중)
 * 권한별 초기 화면이 아직 구현되지 않아 임시 플레이스홀더를 표시한다.
 * 추후 SUPER_ADMIN → 관리 대시보드, SALES_MANAGER / SALES_STAFF → 영업 대시보드로 분기 예정.
 */
import { useAuth } from '../../hooks/useAuth';
import styles from './HomePage.module.css';

export function HomePage() {
  const { user, logout } = useAuth();

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>QuoteGuard</h1>
        <p className={styles.desc}>대시보드 준비 중입니다.</p>
        <p className={styles.userInfo}>
          <strong>{user?.email}</strong> ({user?.role}) 로 로그인됨
        </p>
        <button type="button" className={styles.logoutBtn} onClick={logout}>
          로그아웃
        </button>
      </div>
    </div>
  );
}
