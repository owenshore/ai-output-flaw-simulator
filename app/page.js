"use client";

import { useMemo, useState } from "react";

const scenarios = ["HR招聘建议", "市场方案", "项目计划", "客户沟通邮件", "数据分析报告"];

const difficulties = [
  { label: "初级：事实错误", value: "初级：事实错误" },
  { label: "中级：推断跳跃", value: "中级：推断跳跃" },
  { label: "高级：隐藏假设", value: "高级：隐藏假设" },
  { label: "综合挑战", value: "综合挑战" }
];

const emptyAnswer = {
  issues: "",
  riskLevel: "中",
  verification: "",
  usability: "需要验证后再使用"
};

function apiUrl(path) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
  return baseUrl ? `${baseUrl}${path}` : path;
}

export default function Home() {
  const [scenario, setScenario] = useState(scenarios[0]);
  const [difficulty, setDifficulty] = useState(difficulties[0].value);
  const [caseData, setCaseData] = useState(null);
  const [answer, setAnswer] = useState(emptyAnswer);
  const [score, setScore] = useState(null);
  const [loadingCase, setLoadingCase] = useState(false);
  const [loadingScore, setLoadingScore] = useState(false);
  const [error, setError] = useState("");

  const canScore = useMemo(() => {
    return caseData?.ai_output && answer.issues.trim() && answer.verification.trim();
  }, [caseData, answer.issues, answer.verification]);

  async function generateCase() {
    setError("");
    setScore(null);
    setCaseData(null);
    setAnswer(emptyAnswer);
    setLoadingCase(true);

    try {
      const response = await fetch(apiUrl("/api/generate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario, difficulty })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "生成失败");
      }

      setCaseData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingCase(false);
    }
  }

  async function submitScore() {
    if (!canScore) return;

    setError("");
    setScore(null);
    setLoadingScore(true);

    try {
      const response = await fetch(apiUrl("/api/score"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiOutput: caseData.ai_output,
          hiddenFlaws: caseData.hidden_flaws,
          userAnswer: answer
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "评分失败");
      }

      setScore(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingScore(false);
    }
  }

  return (
    <main className="shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">RED Model Training</p>
          <h1>AI 输出漏洞模拟器</h1>
        </div>
        <div className="badge">课堂演示 MVP</div>
      </section>

      <section className="controlPanel">
        <div className="fieldGroup">
          <label htmlFor="scenario">场景</label>
          <select id="scenario" value={scenario} onChange={(event) => setScenario(event.target.value)}>
            {scenarios.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="fieldGroup">
          <label htmlFor="difficulty">难度</label>
          <select id="difficulty" value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
            {difficulties.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <button className="primaryButton" onClick={generateCase} disabled={loadingCase || loadingScore}>
          {loadingCase ? "生成中..." : "生成案例"}
        </button>
      </section>

      {error ? <div className="errorBox">{error}</div> : null}

      <section className="workspace">
        <article className="casePanel">
          <div className="sectionTitle">
            <span>AI 输出</span>
            {caseData?.difficulty_note ? <small>{caseData.difficulty_note}</small> : null}
          </div>

          <div className="outputBox">
            {caseData?.ai_output ? (
              <p>{caseData.ai_output}</p>
            ) : (
              <p className="placeholder">选择场景和难度后生成一段带有隐藏漏洞的 AI 输出。</p>
            )}
          </div>
        </article>

        <article className="answerPanel">
          <div className="sectionTitle">
            <span>学员作答</span>
            <small>按 RED 思路拆解</small>
          </div>

          <label className="inputBlock">
            <span>发现的问题</span>
            <textarea
              value={answer.issues}
              onChange={(event) => setAnswer({ ...answer, issues: event.target.value })}
              placeholder="写下你认为不可靠、不充分或可能误导的地方"
            />
          </label>

          <div className="twoColumns">
            <label className="inputBlock">
              <span>风险等级</span>
              <select
                value={answer.riskLevel}
                onChange={(event) => setAnswer({ ...answer, riskLevel: event.target.value })}
              >
                <option value="低">低</option>
                <option value="中">中</option>
                <option value="高">高</option>
              </select>
            </label>

            <label className="inputBlock">
              <span>能否使用</span>
              <select
                value={answer.usability}
                onChange={(event) => setAnswer({ ...answer, usability: event.target.value })}
              >
                <option value="可以直接使用">可以直接使用</option>
                <option value="需要验证后再使用">需要验证后再使用</option>
                <option value="不建议使用">不建议使用</option>
              </select>
            </label>
          </div>

          <label className="inputBlock">
            <span>验证方式</span>
            <textarea
              className="shortTextarea"
              value={answer.verification}
              onChange={(event) => setAnswer({ ...answer, verification: event.target.value })}
              placeholder="说明你会查哪些数据、问谁、用什么证据验证"
            />
          </label>

          <button className="secondaryButton" onClick={submitScore} disabled={!canScore || loadingScore || loadingCase}>
            {loadingScore ? "评分中..." : "提交评分"}
          </button>
        </article>
      </section>

      {score ? (
        <section className="scorePanel">
          <div className="scoreHeader">
            <div>
              <p className="eyebrow">评分结果</p>
              <h2>{score.total_score} 分</h2>
            </div>
            <div className="scoreGrid">
              <ScoreItem label="Recognize Assumptions" value={score.recognize_assumptions_score} />
              <ScoreItem label="Evaluate Arguments" value={score.evaluate_arguments_score} />
              <ScoreItem label="Draw Conclusions" value={score.draw_conclusions_score} />
            </div>
          </div>

          <div className="feedbackGrid">
            <FeedbackBlock title="漏洞识别反馈" text={score.flaw_feedback} />
            <FeedbackBlock title="遗漏问题" items={score.missed_issues} />
            <FeedbackBlock title="改进建议" items={score.improvement_suggestions} />
          </div>
        </section>
      ) : null}
    </main>
  );
}

function ScoreItem({ label, value }) {
  return (
    <div className="scoreItem">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FeedbackBlock({ title, text, items }) {
  return (
    <div className="feedbackBlock">
      <h3>{title}</h3>
      {text ? <p>{text}</p> : null}
      {items?.length ? (
        <ul>
          {items.map((item, index) => (
            <li key={`${title}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
