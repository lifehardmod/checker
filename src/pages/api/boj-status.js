import { chromium } from "playwright";
import * as cheerio from "cheerio";

// 제출 시간 문자열 (예: "2025년 3월 14일 00:46:55")를 Date 객체로 파싱하는 함수
function parseKoreanDate(dateStr) {
  const match = dateStr.match(
    /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*(\d{1,2}):(\d{2}):(\d{2})/
  );
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match;
  return new Date(year, month - 1, day, hour, minute, second);
}

// 페이지 자동 스크롤 함수 (필요시 사용)
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

export default async function handler(req, res) {
  try {
    const userIds = [
      "tjwndnjs7",
      "smooo2",
      "kunzatt2501",
      "codena_1025",
      "hanahyun1",
      "bsh7931",
      "jump6746",
      "rkdwldms42",
      "sktndid1203",
      "t0mat0",
      "zyu22",
    ];
    // Playwright 브라우저 실행
    const browser = await chromium.launch({ headless: true });

    const results = await Promise.all(
      userIds.map(async (user) => {
        // 브라우저 컨텍스트 생성 시, 일반 브라우저처럼 보이도록 추가 헤더 설정
        const context = await browser.newContext({
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
          extraHTTPHeaders: {
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
            Referer: "https://www.acmicpc.net/",
          },
        });
        const page = await context.newPage();
        try {
          const url = `https://www.acmicpc.net/status?user_id=${user}&result_id=4`;
          console.log(`[${user}] Navigating to: ${url}`);
          // 페이지 로딩: 'load' 이벤트 기준으로 기다림
          await page.goto(url, { waitUntil: "load", timeout: 15000 });
          // 추가로 자동 스크롤 (필요시)
          await autoScroll(page);
          await page.waitForTimeout(1000);

          const html = await page.content();
          const $ = cheerio.load(html);
          const table = $("#status-table");
          if (!table.length) {
            console.warn(
              `[${user}] 상태표 없음, HTML snippet: ${html.slice(0, 500)}`
            );
            return {
              user,
              solved: false,
              submissionTime: "",
              problemName: "",
              error: "상태표 없음",
            };
          }
          const rows = table.find("tbody tr");
          if (!rows.length) {
            console.warn(
              `[${user}] 제출 내역 없음, HTML snippet: ${html.slice(0, 500)}`
            );
            return {
              user,
              solved: false,
              submissionTime: "",
              problemName: "",
              error: "제출 내역 없음",
            };
          }
          // 첫 번째 제출 행
          const topRow = rows.first();
          // 제출 시간 (9번째 열의 a 태그)
          const submissionTimeStr =
            topRow.find("td:nth-child(9) a").attr("data-original-title") || "";
          console.log(`[${user}] Submission Time String: ${submissionTimeStr}`);

          // 문제 이름 (3번째 열의 a 태그)
          const problemName =
            topRow.find("td:nth-child(3) a").attr("data-original-title") || "";
          console.log(`[${user}] Problem Name: ${problemName}`);

          // 제출 시간 파싱
          const submissionTime = parseKoreanDate(submissionTimeStr);
          if (!submissionTime) {
            console.warn(`[${user}] 제출 시간 파싱 실패`);
            return {
              user,
              solved: false,
              submissionTime: submissionTimeStr,
              problemName,
              error: "제출 시간 파싱 실패",
            };
          }

          // 오늘 자정(00:00) 시간 생성
          const now = new Date();
          const todayMidnight = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            0,
            0,
            0
          );

          // 제출 시간이 오늘 자정 이후이면 solved로 간주
          const solved = submissionTime >= todayMidnight;

          console.log(`[${user}] Parsed Submission Time: ${submissionTime}`);
          console.log(`[${user}] Today Midnight: ${todayMidnight}`);
          console.log(`[${user}] Solved: ${solved}`);

          return {
            user,
            solved,
            submissionTime: submissionTimeStr,
            problemName,
          };
        } catch (err) {
          console.error(`[${user}] Error: ${err.message}`);
          return {
            user,
            solved: false,
            submissionTime: "",
            problemName: "",
            error: err.message,
          };
        } finally {
          await page.close();
          await context.close();
        }
      })
    );

    await browser.close();

    const resultObj = {};
    results.forEach(({ user, solved, submissionTime, problemName, error }) => {
      resultObj[user] = { solved, submissionTime, problemName, error };
    });
    return res.status(200).json(resultObj);
  } catch (error) {
    console.error("전체 에러:", error.message);
    return res.status(500).json({ error: "서버 에러 발생" });
  }
}
