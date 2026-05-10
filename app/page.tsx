"use client";

import { FormEvent, useMemo, useState } from "react";
import type { GeneratedContent, Platform, Purpose, PromotionRequest } from "@/lib/types";

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

const purposeOptions: Array<{ value: Purpose; label: string }> = [
  { value: "new-menu", label: "신메뉴" },
  { value: "event", label: "이벤트" },
  { value: "daily", label: "일상 홍보" }
];

const platformOptions: Array<{ value: Platform; label: string }> = [
  { value: "instagram", label: "인스타그램" },
  { value: "naver", label: "네이버" },
  { value: "baemin", label: "배달의민족" }
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
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">17</div>
          <div>
            <h1>소상공인 홍보물 AI</h1>
            <p>SOMA 17기 AI 기술교육 메인 프로젝트</p>
          </div>
        </div>
        <p className="status-pill">Text: Solar API / Image: Mock provider / Deploy: Vercel</p>
      </header>

      <section className="workspace">
        <form className="panel form" onSubmit={submitPromotion}>
          <div>
            <h2 className="panel-title">가게 정보</h2>
            <p className="panel-subtitle">필수 입력값을 바꾸면 오른쪽 결과가 새로 생성됩니다.</p>
          </div>

          <div className="field">
            <label htmlFor="storeName">상호명</label>
            <input
              id="storeName"
              value={form.store.storeName}
              onChange={(event) => setForm({ ...form, store: { ...form.store, storeName: event.target.value } })}
            />
          </div>

          <div className="two-col">
            <div className="field">
              <label htmlFor="category">업종</label>
              <input
                id="category"
                value={form.store.category}
                onChange={(event) => setForm({ ...form, store: { ...form.store, category: event.target.value } })}
              />
            </div>
            <div className="field">
              <label htmlFor="vibe">분위기</label>
              <input
                id="vibe"
                value={form.store.vibe}
                onChange={(event) => setForm({ ...form, store: { ...form.store, vibe: event.target.value } })}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="description">가게 소개</label>
            <textarea
              id="description"
              value={form.store.description ?? ""}
              onChange={(event) => setForm({ ...form, store: { ...form.store, description: event.target.value } })}
            />
          </div>

          <div className="two-col">
            <div className="field">
              <label htmlFor="purpose">홍보 목적</label>
              <select
                id="purpose"
                value={form.purpose}
                onChange={(event) => setForm({ ...form, purpose: event.target.value as Purpose })}
              >
                {purposeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="platform">출력 포맷</label>
              <select
                id="platform"
                value={form.platform}
                onChange={(event) => setForm({ ...form, platform: event.target.value as Platform })}
              >
                {platformOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="detail">상세 내용</label>
            <textarea id="detail" value={form.detail} onChange={(event) => setForm({ ...form, detail: event.target.value })} />
          </div>

          {error ? <div className="error">{error}</div> : null}

          <div className="actions">
            <button className="btn primary" type="submit" disabled={loading}>
              {loading ? "생성 중" : "홍보물 생성"}
            </button>
            <button className="btn secondary" type="button" onClick={() => setForm(initialForm)} disabled={loading}>
              예시 복원
            </button>
          </div>
        </form>

        <section className="panel preview">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">미리보기</h2>
              <p className="panel-subtitle">문구, 해시태그, mock 이미지, agent trace를 함께 확인합니다.</p>
            </div>
          </div>

          {!generated ? (
            <div className="empty-state">
              <div>
                <strong>입력값을 확인하고 생성하세요.</strong>
                <span>Solar API 키가 없으면 fallback 문구로 데모가 계속 동작합니다.</span>
              </div>
            </div>
          ) : (
            <div className="preview-grid">
              <div className="mock-visual">
                <img src={generated.mockImage.dataUrl} alt={`${generated.mockImage.title} mock image`} />
              </div>

              <div className="copy-card">
                <div className="meta-line">
                  <span>{generated.source === "solar" ? "Solar" : "Fallback"}</span>
                  <span>{generatedAt}</span>
                  <span>{generated.request.platform}</span>
                </div>

                <p className="copy-text">{generated.copyText}</p>

                <div className="chip-row">
                  {generated.hashtags.map((tag) => (
                    <span className="chip" key={tag}>
                      #{tag.replace(/^#/, "")}
                    </span>
                  ))}
                </div>

                <dl className="trace">
                  {generated.agentTrace.map((item) => (
                    <div key={item.step}>
                      <dt>{item.step}</dt>
                      <dd>{item.summary}</dd>
                    </div>
                  ))}
                </dl>

                <div className="retry-box field">
                  <label htmlFor="feedback">수정 요청</label>
                  <textarea
                    id="feedback"
                    value={feedback}
                    onChange={(event) => setFeedback(event.target.value)}
                    placeholder="예: 조금 더 밝고 짧게 만들어줘"
                  />
                  <div className="actions">
                    <button className="btn secondary" type="button" onClick={retryPromotion} disabled={loading}>
                      재생성
                    </button>
                    <button className="btn secondary" type="button" onClick={downloadMockImage}>
                      이미지 다운로드
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
