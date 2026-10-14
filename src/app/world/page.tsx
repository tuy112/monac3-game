"use client";

import Link from "next/link";
import { useState } from "react";

import styles from "./page.module.css";

const FORESTS = [
      [175, 240], [195, 258], [215, 242], [235, 264],
      [157, 275], [182, 291], [209, 289],
      [140, 355], [161, 373], [183, 354], [204, 379],
      [236, 412], [260, 428], [284, 418],
      [550, 211], [574, 226], [598, 211], [620, 232],
      [649, 258], [674, 274], [695, 259],
      [643, 385], [668, 402], [690, 383], [713, 404],
      [546, 482], [570, 498], [595, 479], [619, 499],
      [426, 514], [450, 529], [473, 514],
];

export default function WorldPage() {
      const [showStage, setShowStage] = useState(false);

      return (
            <main className={styles.page}>
                  <section className={styles.frame} aria-label="월드 선택">
                        <div className={styles.map}>
                              <svg
                                    className={styles.world}
                                    viewBox="0 0 900 680"
                                    role="img"
                                    aria-label="설산과 숲, 강과 화산으로 이루어진 월드 지도"
                              >
                                    <defs>
                                          <linearGradient id="world-paper" x2="0" y2="1">
                                                <stop stopColor="#aaa78a" />
                                                <stop offset="1" stopColor="#777b62" />
                                          </linearGradient>

                                          <linearGradient id="world-land" x2="0.8" y2="1">
                                                <stop stopColor="#c9bd8b" />
                                                <stop offset="1" stopColor="#8f9360" />
                                          </linearGradient>

                                          <linearGradient id="world-cliff" x2="0" y2="1">
                                                <stop stopColor="#87704e" />
                                                <stop offset="1" stopColor="#302e25" />
                                          </linearGradient>

                                          <linearGradient id="world-water" x2="1" y2="1">
                                                <stop stopColor="#c2d4d0" />
                                                <stop offset="0.5" stopColor="#7faaa9" />
                                                <stop offset="1" stopColor="#557d80" />
                                          </linearGradient>

                                          <pattern
                                                id="world-lines"
                                                width="6"
                                                height="6"
                                                patternUnits="userSpaceOnUse"
                                          >
                                                <path
                                                      d="M0 1H6M0 4H6"
                                                      stroke="#302c21"
                                                      strokeOpacity=".12"
                                                />
                                          </pattern>

                                          <g id="world-tree">
                                                <path
                                                      d="M-3 2H3V15H-3Z"
                                                      fill="#625030"
                                                />
                                                <path
                                                      d="M0-29L-13-5H-8L-17 6H17L8-5H13Z"
                                                      fill="#354731"
                                                      stroke="#303c29"
                                                      strokeWidth="2"
                                                />
                                                <path
                                                      d="M0-26L-11-6H-6L-13 3H0Z"
                                                      fill="#697447"
                                                />
                                          </g>

                                          <g id="world-mountain">
                                                <path
                                                      d="M-49 27L-23-17L-11-9L8-69L25-27L38-18L58 27Z"
                                                      fill="#858176"
                                                      stroke="#59594c"
                                                      strokeWidth="3"
                                                />
                                                <path
                                                      d="M8-69L3-12L22 6L25-27Z"
                                                      fill="#c0c3b6"
                                                />
                                                <path
                                                      d="M-11-9L8-69L25-27L15-33L10-19L0-30Z"
                                                      fill="#eef0e5"
                                                />
                                                <path
                                                      d="M-49 27L-23-17L-11-9L-24 1L-29 21Z"
                                                      fill="#b5b09b"
                                                />
                                          </g>

                                          <g id="world-castle">
                                                <path
                                                      d="M-21 5L0-6L22 5L0 17Z"
                                                      fill="#777c67"
                                                      stroke="#373e32"
                                                      strokeWidth="2"
                                                />
                                                <path
                                                      d="M-21 5V22L0 34V17ZM0 17V34L22 22V5Z"
                                                      fill="#a4a58a"
                                                      stroke="#535c4b"
                                                      strokeWidth="2"
                                                />
                                                <path
                                                      d="M-10 9V-15H11V9"
                                                      fill="#c0bea1"
                                                      stroke="#535c4b"
                                                      strokeWidth="2"
                                                />
                                                <path
                                                      d="M-15-15L0-30L16-15Z"
                                                      fill="#516e91"
                                                      stroke="#35455b"
                                                      strokeWidth="2"
                                                />
                                                <path
                                                      d="M-4 24V14Q0 7 5 14V29"
                                                      fill="#414a3c"
                                                />
                                          </g>
                                    </defs>

                                    <rect
                                          width="900"
                                          height="680"
                                          fill="url(#world-paper)"
                                    />

                                    <g
                                          fill="none"
                                          stroke="#555944"
                                          strokeWidth="2"
                                          opacity=".55"
                                    >
                                          <path d="M0 132L54 117L70 88L129 103L157 67L205 86L228 57L278 94L310 70L354 91" />
                                          <path d="M556 54L580 91L618 82L650 105L692 83L715 108L779 98L800 133L900 144" />
                                          <path d="M13 425L44 411L69 438L49 469L76 496L56 525L92 548L69 578L112 605" />
                                          <path d="M782 415L835 394L876 417L856 451L880 480L845 505L870 549L832 588L900 616" />
                                          <path d="M16 641Q210 603 339 635T634 631T900 645" />
                                    </g>

                                    <ellipse
                                          cx="464"
                                          cy="567"
                                          rx="314"
                                          ry="70"
                                          fill="#282b22"
                                          opacity=".35"
                                    />

                                    <path
                                          d="M112 344L166 203L296 160L378 121L512 121L611 170L716 205L789 312L765 456L683 563L551 609L397 635L255 599L158 518Z"
                                          fill="url(#world-cliff)"
                                          stroke="#39392c"
                                          strokeWidth="5"
                                    />

                                    <g
                                          fill="none"
                                          stroke="#b49a67"
                                          strokeWidth="5"
                                          opacity=".35"
                                    >
                                          <path d="M171 437L185 527L226 569" />
                                          <path d="M260 480L280 579" />
                                          <path d="M365 502L392 623" />
                                          <path d="M525 516L549 596" />
                                          <path d="M666 469L673 558" />
                                          <path d="M741 395L724 490" />
                                    </g>

                                    <path
                                          d="M104 312L157 188L291 144L375 99L508 101L611 146L718 180L793 287L757 421L676 519L546 563L396 586L255 551L151 470Z"
                                          fill="url(#world-water)"
                                          stroke="#ddd6b2"
                                          strokeWidth="4"
                                    />

                                    <g
                                          fill="url(#world-land)"
                                          stroke="#5d6044"
                                          strokeWidth="4"
                                          strokeLinejoin="round"
                                    >
                                          <path d="M115 304L162 198L258 161L321 172L287 229L304 273L265 310L213 299L176 345L135 357Z" />
                                          <path d="M139 375L188 329L222 345L251 323L292 340L279 381L319 412L290 455L239 467L198 443L164 447Z" />
                                          <path d="M304 192L343 136L400 104L489 105L546 141L533 190L497 216L444 207L406 232L358 211Z" />
                                          <path d="M324 260L364 229L413 244L447 224L491 248L517 292L489 326L435 332L404 310L358 319L317 293Z" />
                                          <path d="M552 204L576 166L640 176L701 198L749 248L736 292L696 307L661 282L625 298L592 264L552 257Z" />
                                          <path d="M529 323L571 281L613 306L645 329L692 319L748 337L721 401L674 439L629 424L601 450L551 430L521 390Z" />
                                          <path d="M325 353L379 338L418 358L467 346L498 379L479 427L515 455L480 489L421 480L386 509L334 484L310 434L337 401Z" />
                                          <path d="M232 491L291 474L317 505L366 517L395 548L367 567L307 552L273 532L230 531Z" />
                                          <path d="M491 515L525 479L577 466L627 472L658 507L617 533L551 550Z" />
                                    </g>

                                    <path
                                          d="M337 151L389 112L478 110L529 147L506 185L467 194L443 177L414 208L387 180L358 192Z"
                                          fill="#e6e7d7"
                                          stroke="#b4b9a5"
                                          strokeWidth="3"
                                    />

                                    <use href="#world-mountain" transform="translate(401 151) scale(.85)" />
                                    <use href="#world-mountain" transform="translate(453 126) scale(1.2)" />
                                    <use href="#world-mountain" transform="translate(493 170) scale(.75)" />

                                    <path
                                          d="M333 286L356 248L385 260L409 218L447 246L475 246L497 292L462 316L425 298L386 310Z"
                                          fill="#79543b"
                                          stroke="#4a4131"
                                          strokeWidth="4"
                                    />

                                    <path
                                          d="M367 273L389 252L414 267L431 242L457 263L462 291L431 287L410 299L386 282Z"
                                          fill="#a24e32"
                                          stroke="#613e2c"
                                          strokeWidth="3"
                                    />

                                    <path
                                          d="M397 270L419 260L439 267L427 283L409 282Z"
                                          fill="#352f27"
                                    />

                                    <use href="#world-mountain" transform="translate(625 241) scale(.7)" />
                                    <use href="#world-mountain" transform="translate(697 342) scale(.7)" />
                                    <use href="#world-mountain" transform="translate(366 419) scale(.65)" />

                                    <g
                                          fill="none"
                                          stroke="#e3e7ce"
                                          strokeWidth="3"
                                          opacity=".55"
                                    >
                                          <path d="M314 202Q321 249 302 289T308 340" />
                                          <path d="M537 206Q520 258 542 294" />
                                          <path d="M303 464Q351 516 400 523T487 510" />
                                          <path d="M643 445L677 451L695 436" />
                                    </g>

                                    <g
                                          stroke="#d4c49b"
                                          strokeWidth="10"
                                    >
                                          <path d="M284 359L323 369" />
                                          <path d="M482 396L529 376" />
                                          <path d="M552 263L523 285" />
                                    </g>

                                    <g
                                          stroke="#665338"
                                          strokeWidth="2"
                                    >
                                          <path d="M290 352L290 366M297 354L297 368M304 356L304 370M311 357L311 371" />
                                          <path d="M490 386L495 399M499 382L504 395M508 378L513 391M517 374L522 387" />
                                    </g>

                                    {FORESTS.map(([x, y], index) => (
                                          <use
                                                key={index}
                                                href="#world-tree"
                                                transform={`translate(${x} ${y})`}
                                          />
                                    ))}

                                    <use href="#world-castle" transform="translate(244 361) scale(.85)" />
                                    <use href="#world-castle" transform="translate(570 389) scale(.7)" />

                                    <rect
                                          width="900"
                                          height="680"
                                          fill="url(#world-lines)"
                                          pointerEvents="none"
                                    />
                              </svg>

                              <button
                                    type="button"
                                    className={styles.stageMarker}
                                    onClick={() => setShowStage(true)}
                                    aria-label="스테이지 1, 네 왕국의 교차로 선택"
                                    aria-expanded={showStage}
                              >
                                    <span className={styles.flag}>⚑</span>
                                    <span className={styles.markerNumber}>1</span>
                              </button>

                              <div className={styles.record}>
                                    <span>원정 기록</span>
                                    <strong>첫 번째 전장</strong>
                              </div>

                              {/* 스테이지 팝업창 */}
                              {showStage && (
                                    <section className={styles.stagePanel}>
                                          <header className={styles.panelHeader}>
                                                <span>STAGE : 1</span>
                                                <strong>네 왕국의 교차로</strong>

                                                <button
                                                      type="button"
                                                      onClick={() => setShowStage(false)}
                                                      aria-label="스테이지 선택창 닫기"
                                                >
                                                      ×
                                                </button>
                                          </header>

                                          <div className={styles.panelBody}>
                                                <svg
                                                      className={styles.preview}
                                                      viewBox="0 0 180 125"
                                                      aria-hidden="true"
                                                >
                                                      <path
                                                            d="M90 9L171 56L90 111L9 62Z"
                                                            fill="#557c83"
                                                            stroke="#c8b780"
                                                            strokeWidth="3"
                                                      />

                                                      <g
                                                            fill="#849355"
                                                            stroke="#48563a"
                                                            strokeWidth="2"
                                                      >
                                                            <path d="M49 31L76 46L48 64L21 49Z" />
                                                            <path d="M124 32L151 47L125 65L98 49Z" />
                                                            <path d="M50 72L76 86L51 102L24 86Z" />
                                                            <path d="M125 72L151 87L125 103L99 87Z" />
                                                            <path d="M87 52L103 62L88 74L72 63Z" />
                                                      </g>

                                                      <path
                                                            d="M55 51L119 88M120 51L57 88"
                                                            stroke="#baa373"
                                                            strokeWidth="5"
                                                      />

                                                      <g stroke="#ded7bd" strokeWidth="2">
                                                            <path d="M48 38V55" />
                                                            <path d="M125 39V56" />
                                                            <path d="M50 77V94" />
                                                            <path d="M125 78V95" />
                                                      </g>

                                                      <path d="M48 37H61L48 45Z" fill="#71a9d8" />
                                                      <path d="M125 38H138L125 46Z" fill="#d57f68" />
                                                      <path d="M50 76H63L50 84Z" fill="#dfc070" />
                                                      <path d="M125 77H138L125 85Z" fill="#87b372" />
                                                </svg>

                                                <div className={styles.stageInfo}>
                                                      <dl>
                                                            <div>
                                                                  <dt>참가 왕국</dt>
                                                                  <dd>4</dd>
                                                            </div>
                                                            <div>
                                                                  <dt>내 왕국</dt>
                                                                  <dd>청람</dd>
                                                            </div>
                                                            <div>
                                                                  <dt>승리 조건</dt>
                                                                  <dd>적 성 함락</dd>
                                                            </div>
                                                      </dl>

                                                      <Link
                                                            href="/game"
                                                            className={styles.start}
                                                      >
                                                            출전 ▶
                                                      </Link>
                                                </div>
                                          </div>
                                    </section>
                              )}

                              <Link href="/" className={styles.back}>
                                    ◀ 돌아가기
                              </Link>
                        </div>
                  </section>
            </main>
      );
}