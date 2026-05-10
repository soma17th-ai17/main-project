"use client";

import { FormEvent, useMemo, useState } from "react";
import type { GeneratedContent, Platform, PromotionRequest, Purpose } from "@/lib/types";

const initialForm: PromotionRequest = {
  store: {
    storeName: "소마분식",
    category: "한식당",
    vibe: "따뜻하고 정갈한",
    description: "동네 직장인과 학생이 편하게 들르는 작은 한식 가게"
  },
  purpose: "new-menu",
  detail: "된장찌개 한상 신메뉴 출시",
  platform: "instagram"
};

const purposeOptions: Array<{ value: Purpose; label: string; hint: string }> = [
  { value: "new-menu", label: "신메뉴", hint: "첫 주문을 끌어내는 메뉴 소개" },
  { value: "event", label: "이벤트", hint: "기간, 혜택, 조건이 보이는 행사" },
  { value: "daily", label: "일상 홍보", hint: "가게 분위기와 재방문 이유" }
];

const platformOptions: Array<{ value: Platform; label: string; hint: string }> = [
  { value: "instagram", label: "인스타그램", hint: "짧은 문장과 해시태그 중심" },
  { value: "naver", label: "네이버", hint: "검색 노출용 설명형 문구" },
  { value: "baemin", label: "배달의민족", hint: "메뉴 매력과 주문 유도" }
];

const sampleBriefs: Array<{ title: string; badge: string; request: PromotionRequest }> = [
  {
    title: "브런치 카페",
    badge: "오픈 이벤트",
    request: {
      store: {
        storeName: "해든브런치",
        category: "브런치 카페",
        vibe: "햇살이 잘 드는 차분한",
        description: "혼자 와도 편한 동네 브런치 카페, 직접 만든 수프와 샌드위치가 강점"
      },
      purpose: "event",
      detail: "평일 오전 세트 메뉴 주문 시 아메리카노 1잔 제공",
      platform: "instagram"
    }
  },
  {
    title: "동네 공방",
    badge: "주말 클래스",
    request: {
      store: {
        storeName: "모아도예",
        category: "도예 공방",
        vibe: "조용하고 손맛이 느껴지는",
        description: "초보자도 90분 안에 컵 하나를 완성하는 예약제 공방"
      },
      purpose: "daily",
      detail: "토요일 커플 원데이 클래스 예약 가능",
      platform: "naver"
    }
  },
  {
    title: "반찬 가게",
    badge: "신메뉴",
    request: {
      store: {
        storeName: "오늘찬",
        category: "반찬 가게",
        vibe: "깔끔하고 믿을 수 있는",
        description: "매일 아침 만드는 집밥 반찬, 1인 가구와 맞벌이 부부가 자주 찾는 매장"
      },
      purpose: "new-menu",
      detail: "제철 봄나물 4종 세트 출시",
      platform: "baemin"
    }
  }
];

const qualityChecks = [
  "상호명과 업종이 문구 첫 화면에서 보입니다.",
  "혜택 또는 핵심 메뉴가 한 문장 안에 들어갑니다.",
  "플랫폼별 길이와 해시태그 밀도를 다르게 잡습니다.",
  "이미지는 실제 생성 대신 안전한 mock 시안으로 표시합니다."
];

export default function Home() {
  const [form, setForm] = useState<PromotionRequest>(initialForm);
  const [generated, setGenerated] = useState<GeneratedContent | null>(null);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generatedAt = useMemo(() => {
    if (!generated) {
      return "";
    }

    return new Intl.DateTimeFormat("ko-KR", {
      dateStyle: "short",
      timeStyle: "short"
    }).format(new Date(generated.createdAt));
  }, [generated]);

  const selectedPlatform = platformOptions.find((option) => option.value === form.platform) ?? platformOptions[0];
  const selectedPurpose = purposeOptions.find((option) => option.value === form.purpose) ?? purposeOptions[0];
  const copyLength = generated?.copyText.length ?? 0;

  function updateStore(field: keyof PromotionRequest["store"], value: string) {
    setForm((current) => ({
      ...current,
      store: {
        ...current.store,
        [field]: value
      }
    }));
  }

  function applySample(request: PromotionRequest) {
    setForm({
      ...request,
      store: {
        ...request.store
      }
    });
    setGenerated(null);
    setFeedback("");
    setError("");
  }

  async function submitPromotion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/promotion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = (await response.json()) as GeneratedContent | { error: string };
      if (!response.ok) {
        throw new Error("error" in data ? data.error : "생성에 실패했습니다.");
      }
      setGenerated(data as GeneratedContent);
      setFeedback("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function retryPromotion() {
    if (!generated) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/promotion/${generated.id}/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback })
      });
      const data = (await response.json()) as GeneratedContent | { error: string };
      if (!response.ok) {
        throw new Error("error" in data ? data.error : "재생성에 실패했습니다.");
      }
      setGenerated(data as GeneratedContent);
      setFeedback("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "재생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function downloadMockImage() {
    if (!generated) {
      return;
    }

    const anchor = document.createElement("a");
    anchor.href = generated.mockImage.dataUrl;
    anchor.download = `${generated.request.store.storeName || "promotion"}-mock.svg`;
    anchor.click();
  }

  return (
    <main className="site-shell">
      <header className="app-nav">
        <div className="brand-lockup">
          <span className="brand-mark">17</span>
          <div>
            <strong>SOMA AI Promo Desk</strong>
            <span>Solar text + Mock visual</span>
          </div>
        </div>

        <nav className="nav-links" aria-label="페이지 주요 영역">
          <a href="#brief">브리프</a>
          <a href="#preview">미리보기</a>
          <a href="#samples">샘플</a>
        </nav>

        <div className="system-pill" aria-label="서비스 상태">
          <span className="live-dot" />
          Vercel ready
        </div>
      </header>

      <section className="workspace-grid" aria-label="홍보물 생성 작업대">
        <section className="intro-panel" aria-labelledby="intro-title">
          <p className="eyebrow">Small Business Campaign Builder</p>
          <h1 id="intro-title">사장님이 바로 검토할 수 있는 홍보 시안을 만듭니다.</h1>
          <p className="intro-copy">
            업종, 분위기, 목적만 정리하면 문구와 해시태그, mock 이미지를 한 화면에서 확인하고 바로 수정 요청까지 이어집니다.
          </p>

          <div className="metric-row" aria-label="서비스 구성">
            <div>
              <strong>3</strong>
              <span>홍보 목적</span>
            </div>
            <div>
              <strong>3</strong>
              <span>플랫폼 포맷</span>
            </div>
            <div>
              <strong>0</strong>
              <span>실이미지 비용</span>
            </div>
          </div>

          <div className="route-card">
            <span>현재 설정</span>
            <strong>
              {selectedPurpose.label} · {selectedPlatform.label}
            </strong>
            <p>{selectedPlatform.hint}</p>
          </div>
        </section>

        <form id="brief" className="brief-panel" onSubmit={submitPromotion}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Brief</p>
              <h2>가게 정보 입력</h2>
            </div>
            <button className="ghost-button" type="button" onClick={() => applySample(initialForm)} disabled={loading}>
              기본값
            </button>
          </div>

          <div className="field-group">
            <label htmlFor="storeName">상호명</label>
            <input
              id="storeName"
              value={form.store.storeName}
              onChange={(event) => updateStore("storeName", event.target.value)}
              placeholder="예: 소마분식"
            />
          </div>

          <div className="split-fields">
            <div className="field-group">
              <label htmlFor="category">업종</label>
              <input
                id="category"
                value={form.store.category}
                onChange={(event) => updateStore("category", event.target.value)}
                placeholder="예: 한식당"
              />
            </div>
            <div className="field-group">
              <label htmlFor="vibe">브랜드 분위기</label>
              <input
                id="vibe"
                value={form.store.vibe}
                onChange={(event) => updateStore("vibe", event.target.value)}
                placeholder="예: 따뜻하고 정갈한"
              />
            </div>
          </div>

          <div className="field-group">
            <label htmlFor="description">가게 소개</label>
            <textarea
              id="description"
              value={form.store.description ?? ""}
              onChange={(event) => updateStore("description", event.target.value)}
              placeholder="누가 자주 찾고, 무엇이 강점인지 적어주세요."
            />
          </div>

          <div className="option-grid" role="group" aria-label="홍보 목적 선택">
            {purposeOptions.map((option) => (
              <label className="option-tile" data-active={form.purpose === option.value} key={option.value}>
                <input
                  type="radio"
                  name="purpose"
                  value={option.value}
                  checked={form.purpose === option.value}
                  onChange={() => setForm((current) => ({ ...current, purpose: option.value }))}
                />
                <strong>{option.label}</strong>
                <span>{option.hint}</span>
              </label>
            ))}
          </div>

          <div className="split-fields">
            <div className="field-group">
              <label htmlFor="platform">출력 포맷</label>
              <select
                id="platform"
                value={form.platform}
                onChange={(event) => setForm((current) => ({ ...current, platform: event.target.value as Platform }))}
              >
                {platformOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="detail">홍보 상세</label>
              <input
                id="detail"
                value={form.detail}
                onChange={(event) => setForm((current) => ({ ...current, detail: event.target.value }))}
                placeholder="예: 된장찌개 한상 신메뉴 출시"
              />
            </div>
          </div>

          {error ? <div className="error-banner">{error}</div> : null}

          <div className="action-row">
            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? "생성 중" : "홍보물 생성"}
            </button>
            <span>{selectedPurpose.hint}</span>
          </div>
        </form>

        <section id="preview" className="preview-panel" aria-live="polite">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Preview</p>
              <h2>생성 결과</h2>
            </div>
            <span className={`source-badge ${generated?.source ?? "ready"}`}>
              {generated ? (generated.source === "solar" ? "Solar 생성" : "Fallback 데모") : "대기 중"}
            </span>
          </div>

          {!generated ? (
            <div className="preview-empty">
              <div className="empty-visual" aria-hidden="true">
                <span />
                <strong>{form.store.storeName || "상호명"}</strong>
                <p>{form.detail || "홍보 상세"}</p>
              </div>
              <div>
                <strong>브리프를 입력하고 첫 시안을 생성하세요.</strong>
                <p>Solar API 키가 없거나 호출에 실패하면 fallback 문구로 데모 흐름을 유지합니다.</p>
              </div>
            </div>
          ) : (
            <div className="result-stack">
              <div className="visual-frame">
                <img src={generated.mockImage.dataUrl} alt={`${generated.mockImage.title} mock image`} />
              </div>

              <article className="copy-area">
                <div className="meta-line">
                  <span>{generatedAt}</span>
                  <span>{selectedPlatform.label}</span>
                  <span>{copyLength}자</span>
                </div>

                <p className="copy-text">{generated.copyText}</p>

                <div className="chip-row" aria-label="해시태그">
                  {generated.hashtags.map((tag) => (
                    <span className="chip" key={tag}>
                      #{tag.replace(/^#/, "")}
                    </span>
                  ))}
                </div>

                <div className="trace-list">
                  {generated.agentTrace.map((item) => (
                    <div key={item.step}>
                      <strong>{item.step}</strong>
                      <span>{item.summary}</span>
                    </div>
                  ))}
                </div>

                <div className="feedback-box">
                  <label htmlFor="feedback">수정 요청</label>
                  <textarea
                    id="feedback"
                    value={feedback}
                    onChange={(event) => setFeedback(event.target.value)}
                    placeholder="예: 조금 더 밝고 짧게 만들어주세요."
                  />
                  <div className="action-row compact">
                    <button className="secondary-button" type="button" onClick={retryPromotion} disabled={loading}>
                      재생성
                    </button>
                    <button className="secondary-button" type="button" onClick={downloadMockImage}>
                      이미지 다운로드
                    </button>
                  </div>
                </div>
              </article>
            </div>
          )}
        </section>
      </section>

      <section id="samples" className="sample-section" aria-labelledby="sample-title">
        <div>
          <p className="eyebrow">Starter Briefs</p>
          <h2 id="sample-title">업종별 샘플로 바로 시작</h2>
        </div>
        <div className="sample-grid">
          {sampleBriefs.map((sample) => (
            <button className="sample-button" type="button" key={sample.title} onClick={() => applySample(sample.request)}>
              <span>{sample.badge}</span>
              <strong>{sample.title}</strong>
              <small>{sample.request.detail}</small>
            </button>
          ))}
        </div>
      </section>

      <section id="quality" className="quality-section" aria-labelledby="quality-title">
        <div>
          <p className="eyebrow">Acceptance</p>
          <h2 id="quality-title">검토 기준</h2>
        </div>
        <ul>
          {qualityChecks.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
