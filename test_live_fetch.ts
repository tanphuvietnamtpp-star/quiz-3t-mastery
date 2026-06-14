async function run() {
  try {
    const res = await fetch("https://ais-dev-76227e7g7ih7antywq3d52-461297414570.asia-east1.run.app/api/firebase-config");
    if (res.ok) {
      const config = await res.json();
      console.log("DEV_SERVER_REAL_CONFIG:", JSON.stringify(config, null, 2));
    } else {
      console.log("Failed to fetch from live dev server:", res.status, res.statusText);
    }
  } catch (e: any) {
    console.error("Error fetching config:", e.message);
  }
}

run();
