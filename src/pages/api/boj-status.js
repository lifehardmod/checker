import chromium from 'chrome-aws-lambda';
import puppeteer from 'puppeteer-core';
import * as cheerio from 'cheerio';

// 제출 시간 문자열 (예: "2025년 3월 14일 00:46:55")를 Date 객체로 파싱하는 함수
function parseKoreanDate(dateStr) {
  const match = dateStr.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*(\d{1,2}):(\d{2}):(\d{2})/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match;
  return new Date(year, month - 1, day, hour, minute, second);
}

// 페이지 자동 스크롤 함수 (동적 콘텐츠가 있다면 사용)
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

  let browser = null;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });
    
    const results = await Promise.all(
      userIds.map(async (user) => {
        let page = null;
        try {
          const context = await browser.newContext({
            userAgent:
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
            extraHTTPHeaders: {
              Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
              "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
              Referer: "https://www.acmicpc.net/",
            },
          });
          page = await context.newPage();
          const url = `https://www.acmicpc.net/status?user_id=${user}&result_id=4`;
          console.log(`[${user}] Navigating to: ${url}`);
          await page.goto(url, { waitUntil: "load", timeout: 15000 });
          await autoScroll(page);
          await page.waitForTimeout(1000);
          
          const html = await page.content();
          const $ = cheerio.load(html);
          const table = $("#status-table");
          if (!table.length) {
            console.warn(`[${user}] 상태표 없음`);
            return { user, solved: false, submissionTime: "", problemName: "", error: "상태표 없음" };
          }
          const rows = table.find("tbody tr");
          if (!rows.length) {
            console.warn(`[${user}] 제출 내역 없음`);
            return { user, solved: false, submissionTime: "", problemName: "", error: "제출 내역 없음" };
          }
          const topRow = rows.first();
          // 문제 이름: 3번째 열의 a 태그의 data-original-title
          const problemName = topRow.find("td:nth-child(3) a").attr("data-original-title") || "";
          // 제출 시간: 9번째 열의 a 태그의 data-original-title
          const submissionTimeStr = topRow.find("td:nth-child(9) a").attr("data-original-title") || "";
          console.log(`[${user}] Submission Time String: ${submissionTimeStr}`);
          console.log(`[${user}] Problem Name: ${problemName}`);
          
          const submissionTime = parseKoreanDate(submissionTimeStr);
          if (!submissionTime) {
            console.warn(`[${user}] 제출 시간 파싱 실패`);
            return { user, solved: false, submissionTime: submissionTimeStr, problemName, error: "제출 시간 파싱 실패" };
          }
          
          const now = new Date();
          const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
          const solved = submissionTime >= todayMidnight;
          return { user, solved, submissionTime: submissionTimeStr, problemName };
        } catch (err) {
          console.error(`[${user}] Error: ${err.message}`);
          return { user, solved: false, submissionTime: "", problemName: "", error: err.message };
        } finally {
          if (page) await page.close();
        }
      })
    );
    
    await browser.close();
    const resultObj = {};
    results.forEach((result) => {
      resultObj[result.user] = result;
    });
    return res.status(200).json(resultObj);
  } catch (error) {
    console.error("전체 에러:", error.message);
    if (browser) await browser.close();
    return res.status(500).json({ error: "서버 에러 발생", details: error.message });
  }
}
