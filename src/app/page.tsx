import Link from "next/link";

import styles from "./page.module.css";

export default function HomePage() {
      return (
            <main className={styles.page}>
                  <section className={styles.screen} aria-label="모나크모나크 III">
                        <nav className={styles.menu} aria-label="메인 메뉴">
                              <Link href="/world" className={styles.menuItem}>
                                    새로운 게임
                              </Link>

                              <button
                                    type="button"
                                    className={styles.menuItem}
                                    disabled
                                    title="이어 하기는 아직 준비 중입니다."
                              >
                                    이어서 하기
                              </button>

                              <a href="about:blank" className={styles.menuItem}>
                                    종료
                              </a>
                        </nav>

                        <div className={styles.logo}>
                              <svg
                                    className={styles.crown}
                                    viewBox="0 0 100 70"
                                    fill="none"
                                    aria-hidden="true"
                              >
                                    <path
                                          d="M12 43L29 46L24 23L42 35L51 9L62 35L79 24L73 49L89 59M29 46Q50 39 73 49"
                                          stroke="currentColor"
                                          strokeWidth="4"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                    />
                              </svg>

                              <h1 className={styles.title}>
                                    MONA
                                    <sup>3</sup>
                              </h1>

                              <p className={styles.subtitle}>
                                    Monarch Monarch
                              </p>

                              <p className={styles.genre}>
                                    FANTASY REALTIME SLG
                              </p>
                        </div>
                  </section>
            </main>
      );
}