import { useEffect, useState } from "react";

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [usersData, setUsersData] = useState({});

  const userInfo = {
    tjwndnjs7: "서주원",
    smooo2: "짱성문",
    kunzatt2501: "김용명",
    codena_1025: "강수진",
    hanahyun1: "한재서",
    bsh7931: "배성훈",
    jump6746: "김종명",
    rkdwldms42: "강지은",
    sktndid1203: "박수양",
    t0mat0: "김유정",
    zyu22: "지유림",
  };

  useEffect(() => {
    fetch("/api/boj-status")
      .then((res) => res.json())
      .then((data) => {
        // API 결과에 하드코딩된 이름을 병합
        const mergedData = Object.entries(data).reduce((acc, [user, result]) => {
          acc[user] = { ...result, name: userInfo[user] || user };
          return acc;
        }, {});
        setUsersData(mergedData);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xl">
        로딩 중...
      </div>
    );
  }

  // 특별 사용자 (예: 이름이 "짱성문")
  const specialUsers = Object.entries(usersData).filter(
    ([, result]) => result.name === "짱성문"
  );
  // 일반 사용자
  const normalUsers = Object.entries(usersData).filter(
    ([, result]) => result.name !== "짱성문"
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8 flex flex-col gap-10 items-center">
      <h1 className="text-3xl font-bold text-center mb-8">BOJ 제출 현황</h1>

      {/* 특별 사용자 섹션 */}
      {specialUsers.length > 0 && (
        <div className="w-full">
          <h2 className="text-2xl font-bold text-center mb-6">특별 사용자</h2>
          {specialUsers.map(([user, result]) => (
            <div
              key={user}
              className="py-3 bg-gradient-to-r from-purple-600 to-pink-500 rounded-lg shadow-xl text-white text-center transform transition hover:scale-105 h-fit w-fit px-16 mb-4"
            >
              <h2 className="text-3xl font-extrabold mb-4">
                {result.name} ({user})
              </h2>
              <p className="text-xl">
                {result.solved
                  ? "문제를 해결했습니다!"
                  : "문제를 해결하지 않았습니다."}
              </p>
              {result.problemName && (
                <p className="mt-2 text-lg">문제: {result.problemName}</p>
              )}
              {result.submissionTime && (
                <p className="mt-2 text-lg">
                  제출 시간: {result.submissionTime}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 일반 사용자 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 w-full">
        {normalUsers.map(([user, result]) => (
          <div
            key={user}
            className="p-6 bg-white rounded-lg shadow-md flex flex-col items-center transform transition hover:scale-105 gap-2"
          >
            <h2 className="text-lg font-semibold">{result.name}</h2>
            <p className="text-gray-600 text-sm font-light">({user})</p>
            <p
              className={`mt-4 font-bold ${
                result.solved ? "text-green-600" : "text-red-600"
              }`}
            >
              {result.solved
                ? "문제를 해결했습니다!"
                : "문제를 해결하지 않았습니다."}
            </p>
            {result.problemName && (
              <p className="mt-2 text-sm text-gray-500">문제: {result.problemName}</p>
            )}
            {result.submissionTime && (
              <p className="mt-2 text-sm text-gray-500">제출 시간: {result.submissionTime}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
