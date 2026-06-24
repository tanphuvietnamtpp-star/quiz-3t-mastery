async function run() {
  try {
    const devUrl = "https://ais-dev-xhhor5f2b4bdaxpaorjhzi-493674122813.asia-southeast1.run.app/api/firebase-config";
    console.log("Fetching config from live dev URL:", devUrl);
    const res = await fetch(devUrl);
    if (res.ok) {
      const config = await res.json();
      console.log("LIVE DEV CONFIG:", JSON.stringify(config, null, 2));
    } else {
      console.log("Failed to fetch from live dev server:", res.status, res.statusText);
    }
  } catch (e: any) {
    console.error("Error fetching config:", e.message);
  }
}

run();
