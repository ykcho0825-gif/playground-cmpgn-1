import { useEffect, useMemo, useState, type FormEvent } from "react";
import { apiGet, apiPost } from "../api/client";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

interface CampaignSearchResult {
  cmpgnId: string;
  cmpgnNm: string;
  owner: string;
  channel: string;
  product: string;
}

interface CampaignApplication {
  applicationId: string;
  cmpgnId: string;
  cmpgnNm: string;
  owner: string;
  channel: string;
  product: string;
  startDate: string;
  endDate: string;
  expectedVolume: number;
  budget: number;
  memo: string;
}

interface FormState {
  cmpgnId: string;
  cmpgnNm: string;
  owner: string;
  channel: string;
  product: string;
  startDate: string;
  endDate: string;
  expectedVolume: string;
  budget: string;
  memo: string;
}

const initialForm: FormState = {
  cmpgnId: "",
  cmpgnNm: "",
  owner: "",
  channel: "",
  product: "",
  startDate: "2026-08-29",
  endDate: "2026-08-29",
  expectedVolume: "",
  budget: "",
  memo: "",
};

export function CalendarMockup() {
  const [ownerKeyword, setOwnerKeyword] = useState("");
  const [campaignKeyword, setCampaignKeyword] = useState("");
  const [searchResults, setSearchResults] = useState<CampaignSearchResult[]>([]);
  const [applications, setApplications] = useState<CampaignApplication[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [form, setForm] = useState<FormState>(initialForm);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadApplications();
  }, []);

  useEffect(() => {
    const selected = searchResults.find((item) => item.cmpgnId === selectedCampaignId);
    if (!selected) return;
    setForm((prev) => ({
      ...prev,
      cmpgnId: selected.cmpgnId,
      cmpgnNm: selected.cmpgnNm,
      owner: selected.owner,
      channel: selected.channel,
      product: selected.product,
    }));
  }, [searchResults, selectedCampaignId]);

  async function loadApplications() {
    try {
      const data = await apiGet<CampaignApplication[]>("/applications");
      setApplications(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "신청 목록을 불러오지 못했습니다.");
    }
  }

  async function handleSearch() {
    setSearching(true);
    setError(null);
    setFeedback(null);
    try {
      const data = await apiGet<CampaignSearchResult[]>("/applications/search", {
        owner: ownerKeyword,
        campaignName: campaignKeyword,
      });
      setSearchResults(data);
      setSelectedCampaignId(data[0]?.cmpgnId ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "캠페인 검색에 실패했습니다.");
    } finally {
      setSearching(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFeedback(null);
    try {
      const created = await apiPost<CampaignApplication, Omit<CampaignApplication, "applicationId">>(
        "/applications",
        {
          cmpgnId: form.cmpgnId,
          cmpgnNm: form.cmpgnNm,
          owner: form.owner,
          channel: form.channel,
          product: form.product,
          startDate: form.startDate,
          endDate: form.endDate,
          expectedVolume: Number(form.expectedVolume || 0),
          budget: Number(form.budget || 0),
          memo: form.memo,
        }
      );
      setApplications((prev) => [created, ...prev]);
      setFeedback(`신청이 등록되었습니다: ${created.cmpgnNm}`);
      setForm((prev) => ({
        ...initialForm,
        startDate: prev.startDate,
        endDate: prev.endDate,
      }));
      setSelectedCampaignId("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "신청 저장에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  const calendarDays = useMemo(() => buildCalendarDays(applications), [applications]);

  return (
    <div>
      <div className="page-title">캠페인 신청 및 캘린더</div>

      <div className="panel application-hero">
        <div>
          <div className="panel-title">새 캠페인 신청</div>
          <div className="application-hero-copy">
            실행한 캠페인을 검색해서 불러오고, 캘린더에 반영할 운영 기간과 주요 값을 바로 등록할 수 있습니다.
          </div>
        </div>
        <div className="application-hero-badges">
          <span className="badge">검색 기반 불러오기</span>
          <span className="badge">캘린더 즉시 반영</span>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">새 캠페인 신청 1. 실행한 캠페인 검색</div>
        <div className="controls-row">
          <input
            className="text-input"
            placeholder="담당자명"
            value={ownerKeyword}
            onChange={(event) => setOwnerKeyword(event.target.value)}
          />
          <input
            className="text-input"
            placeholder="캠페인명"
            value={campaignKeyword}
            onChange={(event) => setCampaignKeyword(event.target.value)}
          />
          <button className="action-btn" type="button" onClick={handleSearch} disabled={searching}>
            {searching ? "검색 중..." : "검색"}
          </button>
        </div>
        <div className="application-search-results">
          {searchResults.length === 0 ? (
            <div className="state-msg compact">검색 결과가 없습니다. 담당자나 캠페인명을 입력해 찾아보세요.</div>
          ) : (
            searchResults.map((result) => (
              <button
                key={result.cmpgnId}
                type="button"
                className={selectedCampaignId === result.cmpgnId ? "search-card active" : "search-card"}
                onClick={() => setSelectedCampaignId(result.cmpgnId)}
              >
                <strong>{result.cmpgnNm}</strong>
                <span>{result.owner}</span>
                <span>{result.product}</span>
                <span>{result.channel}</span>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="application-grid">
        <div className="panel">
          <div className="panel-title">새 캠페인 신청 2. 캘린더 반영값 입력</div>
          <form className="application-form" onSubmit={handleSubmit}>
            <input className="text-input" value={form.owner} placeholder="담당자" readOnly />
            <input className="text-input" value={form.cmpgnNm} placeholder="캠페인명" readOnly />
            <div className="form-split">
              <input className="text-input" value={form.channel} placeholder="채널" readOnly />
              <input className="text-input" value={form.product} placeholder="상품" readOnly />
            </div>
            <div className="form-split">
              <label className="field-label">
                시작일
                <input
                  className="text-input"
                  type="date"
                  value={form.startDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
                />
              </label>
              <label className="field-label">
                종료일
                <input
                  className="text-input"
                  type="date"
                  value={form.endDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
                />
              </label>
            </div>
            <div className="form-split">
              <label className="field-label">
                예상 모수
                <input
                  className="text-input"
                  type="number"
                  value={form.expectedVolume}
                  onChange={(event) => setForm((prev) => ({ ...prev, expectedVolume: event.target.value }))}
                  placeholder="예: 3000"
                />
              </label>
              <label className="field-label">
                집행 예산
                <input
                  className="text-input"
                  type="number"
                  value={form.budget}
                  onChange={(event) => setForm((prev) => ({ ...prev, budget: event.target.value }))}
                  placeholder="예: 1200000"
                />
              </label>
            </div>
            <label className="field-label">
              메모
              <textarea
                className="text-area"
                value={form.memo}
                onChange={(event) => setForm((prev) => ({ ...prev, memo: event.target.value }))}
                placeholder="캠페인 운영 메모"
              />
            </label>
            <button className="action-btn" type="submit" disabled={submitting || !form.cmpgnId}>
              {submitting ? "저장 중..." : "캠페인 신청 저장"}
            </button>
          </form>
          {feedback ? <div className="feedback success">{feedback}</div> : null}
          {error ? <div className="feedback error">{error}</div> : null}
        </div>

        <div className="panel">
          <div className="panel-title">캠페인 캘린더</div>
          <div className="calendar-mockup application-calendar">
            {DAYS.map((day) => (
              <div key={day} className="calendar-cell calendar-head">
                {day}
              </div>
            ))}
            {calendarDays.map((cell) => (
              <div key={cell.key} className="calendar-cell filled">
                <div className="calendar-date">{cell.label}</div>
                <div className="calendar-items">
                  {cell.items.map((item) => (
                    <div key={item.applicationId} className="calendar-chip">
                      <strong>{item.cmpgnNm}</strong>
                      <span>{item.owner}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">최근 신청 내역</div>
        <div className="application-list">
          {applications.map((item) => (
            <div key={item.applicationId} className="application-row">
              <div>
                <strong>{item.cmpgnNm}</strong>
                <span>{item.owner}</span>
              </div>
              <div>
                <strong>{item.startDate}</strong>
                <span>{item.endDate}</span>
              </div>
              <div>
                <strong>{item.expectedVolume.toLocaleString()}</strong>
                <span>예상 모수</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function buildCalendarDays(applications: CampaignApplication[]) {
  const year = 2026;
  const month = 7;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const dateNumber = index - firstDay + 1;
    if (dateNumber < 1 || dateNumber > daysInMonth) {
      return { key: `blank-${index}`, label: "", items: [] as CampaignApplication[] };
    }

    const isoDate = `2026-08-${String(dateNumber).padStart(2, "0")}`;
    const items = applications.filter((item) => isoDate >= item.startDate && isoDate <= item.endDate);
    return {
      key: isoDate,
      label: String(dateNumber),
      items,
    };
  });
}
