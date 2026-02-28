document.addEventListener('DOMContentLoaded', () => {
    // --- UI Elements ---
    const landSlider = document.getElementById('land-size');
    const waterSlider = document.getElementById('water-limit');
    const budgetSlider = document.getElementById('budget');

    const landVal = document.getElementById('land-val');
    const waterVal = document.getElementById('water-val');
    const budgetVal = document.getElementById('budget-val');

    const locationSelect = document.getElementById('location');
    const monthSelect = document.getElementById('month');
    const liveDataBtn = document.getElementById('live-data-btn');
    const weatherIcon = document.getElementById('weather-icon');
    const weatherDesc = document.getElementById('weather-desc');

    const optimizeBtn = document.getElementById('optimize-btn');
    const btnText = optimizeBtn.querySelector('.btn-text');
    const loader = optimizeBtn.querySelector('.loader-ring');

    const farmGrid = document.getElementById('farm-grid');
    const statusIndicator = document.querySelector('.status-indicator');
    const systemStatusTxt = document.getElementById('system-status');

    const yieldOut = document.getElementById('yield-out');
    const waterEffOut = document.getElementById('water-eff');
    const profitOut = document.getElementById('profit-out');
    const scheduleList = document.getElementById('schedule-list');

    // --- State ---
    const GRID_SIZE = 10; // 10x10 grid = 100 cells
    let gridCells = [];

    // --- Initialize Grid ---
    function initGrid() {
        farmGrid.innerHTML = '';
        gridCells = [];
        for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            farmGrid.appendChild(cell);
            gridCells.push(cell);
        }
    }
    initGrid();

    // --- State & Variables ---
    let currentWeatherState = 'normal'; // normal, drought, monsoon

    // --- Input Listeners ---
    landSlider.addEventListener('input', (e) => { landVal.textContent = e.target.value; });
    waterSlider.addEventListener('input', (e) => { waterVal.textContent = e.target.value; });
    budgetSlider.addEventListener('input', (e) => { budgetVal.textContent = e.target.value; });

    // --- Live Data Simulator ---
    liveDataBtn.addEventListener('click', () => {
        liveDataBtn.textContent = 'Fetching...';
        liveDataBtn.disabled = true;

        setTimeout(() => {
            // Randomly pick a realistic current scenario for the demo
            const scenarios = [
                { loc: 'maharashtra', month: 'jul', weather: 'monsoon', icon: '⛈️', desc: 'Heavy Monsoon Rain' },
                { loc: 'punjab', month: 'apr', weather: 'drought', icon: '🏜️', desc: 'Heatwave & Dry' },
                { loc: 'tamilnadu', month: 'oct', weather: 'normal', icon: '🌤️', desc: 'Pleasant & Clear' },
                { loc: 'westbengal', month: 'jul', weather: 'monsoon', icon: '🌧️', desc: 'Cyclonic Rainfall' }
            ];

            const randomPick = scenarios[Math.floor(Math.random() * scenarios.length)];

            locationSelect.value = randomPick.loc;
            monthSelect.value = randomPick.month;
            currentWeatherState = randomPick.weather;

            weatherIcon.textContent = randomPick.icon;
            weatherDesc.textContent = randomPick.desc;

            liveDataBtn.textContent = '📍 Live';
            liveDataBtn.disabled = false;

            // Auto run solver
            optimizeBtn.click();
        }, 800);
    });

    // --- Optimization Solver Mock ---
    // Represents a simplified constraint solver incorporating location, seasonality & live weather
    function runConstraintSolver(land, water, budget, loc, month, weather) {
        return new Promise((resolve) => {
            // Simulate solver processing time (1.5 seconds)
            setTimeout(() => {
                const results = {
                    allocation: [],
                    metrics: {
                        yield: '',
                        waterEfficiency: '',
                        profit: ''
                    },
                    schedules: [],
                    insights: []
                };

                // Logic based on inputs to generate varying visual grids
                // The algorithm distributes crops based on water & budget ratios.
                // Wheat: Medium water, high yield in big lands
                // Corn: High water, high cost
                // Soy: Low water, durable

                let waterRatio = water / 5000.0;   // based on input max 5000 (1000L)
                let budgetRatio = budget / 500000.0; // based on input max 500000

                let soyPercent = 0.15; // Base
                let wheatPercent = 0.20; // Base
                let cornPercent = 0.10; // Base
                let ricePercent = 0.25; // Base
                let sugarPercent = 0.10; // Base

                // --- Live Weather Overrides ---
                if (weather === 'drought') {
                    waterRatio = Math.max(0.1, waterRatio - 0.4); // severly limit water efficiency
                    ricePercent = 0; // kill high water crops
                    sugarPercent = 0;
                    soyPercent += 0.3; // hardy crop
                    wheatPercent += 0.1;
                } else if (weather === 'monsoon') {
                    waterRatio = Math.min(1.0, waterRatio + 0.5);
                    ricePercent += 0.3; // thriving
                    soyPercent -= 0.1;
                }

                // --- Location & Seasonality Rules ---
                // Punjab favors Wheat, Maharashtra favors Sugarcane, West Bengal & TN favor Rice
                if (loc === 'punjab') { wheatPercent += 0.2; ricePercent -= 0.1; }
                if (loc === 'maharashtra') { sugarPercent += 0.2; }
                if (loc === 'westbengal' || loc === 'tamilnadu') { ricePercent += 0.2; wheatPercent -= 0.1; }

                // Monsoon (Jul) drastically increases water efficiency temporarily, favors Rice
                if (month === 'jul') {
                    waterRatio = Math.min(1.0, waterRatio + 0.3);
                    ricePercent += 0.15;
                    cornPercent += 0.05;
                }

                // Winter (Jan) penalizes high-heat crops like Sugar, favors Wheat in North
                if (month === 'jan' && loc === 'punjab') {
                    wheatPercent += 0.15;
                    sugarPercent = 0;
                }

                // Summer (Apr) needs high water, heavy penalty to Rice if water is low
                if (month === 'apr' && waterRatio < 0.6) {
                    ricePercent = 0;
                    soyPercent += 0.2; // deep rooted, survives better
                }

                // --- Constraint Rules ---
                // If water is low, heavily favor Soy and Wheat, penalize Rice & Sugarcane
                if (waterRatio < 0.4) {
                    soyPercent += 0.2;
                    wheatPercent += 0.1;
                    ricePercent = Math.max(0, ricePercent - 0.2);
                    sugarPercent = Math.max(0, sugarPercent - 0.1);
                } else if (waterRatio > 0.7) {
                    ricePercent += 0.1;
                    sugarPercent += 0.05;
                }

                // If budget is high, corn and sugar are fine. Else scale them down.
                if (budgetRatio < 0.3) {
                    cornPercent = Math.max(0, cornPercent - 0.1);
                    sugarPercent = Math.max(0, sugarPercent - 0.1);
                    wheatPercent += 0.1;
                }

                // Balance percentages
                let totalAcresAllocated = Math.floor(land * (soyPercent + wheatPercent + cornPercent + ricePercent + sugarPercent));
                let utilization = Math.min(100, Math.floor((totalAcresAllocated / land) * 100)); // UI percentage

                // Math to string metrics (Rough Rupee conversion per acre)
                const rawProfit = Math.floor(
                    (land * wheatPercent * 35000) +
                    (land * cornPercent * 50000) +
                    (land * soyPercent * 25000) +
                    (land * ricePercent * 45000) +
                    (land * sugarPercent * 60000)
                );

                results.metrics = {
                    yield: `${Math.floor(totalAcresAllocated * 2.8)} Tons`,
                    waterEfficiency: `${(100 - (waterRatio * 40) + (soyPercent * 20)).toFixed(1)}%`,
                    profit: `₹${rawProfit.toLocaleString()}`
                };

                // Generate grid array (100 cells)
                const cellsToFill = 100; // Visual only, mapping to 100% of the box

                // Safety normalize so total cells don't exceed 100
                const sumPercent = soyPercent + wheatPercent + cornPercent + ricePercent + sugarPercent;
                if (sumPercent > 1) {
                    soyPercent /= sumPercent; wheatPercent /= sumPercent; cornPercent /= sumPercent;
                    ricePercent /= sumPercent; sugarPercent /= sumPercent;
                }

                const numSoy = Math.floor(cellsToFill * soyPercent);
                const numWheat = Math.floor(cellsToFill * wheatPercent);
                const numCorn = Math.floor(cellsToFill * cornPercent);
                const numRice = Math.floor(cellsToFill * ricePercent);
                const numSugar = Math.floor(cellsToFill * sugarPercent);

                // Create a distribution array
                let distr = [];
                for (let i = 0; i < numSoy; i++) distr.push('soy');
                for (let i = 0; i < numWheat; i++) distr.push('wheat');
                for (let i = 0; i < numCorn; i++) distr.push('corn');
                for (let i = 0; i < numRice; i++) distr.push('rice');
                for (let i = 0; i < numSugar; i++) distr.push('sugarcane');
                while (distr.length < 100) distr.push('unallocated');

                // Shuffle for a more realistic "scattered but clustered" field look
                // Standard Fisher-Yates with a clustering bias is complex, so we'll do a simple shuffle
                // and then sort chunks. Actually, for farms, crops are contiguous.
                // We will just sort them to make contiguous blocks visually
                distr.sort((a, b) => {
                    const order = { 'unallocated': 0, 'wheat': 1, 'corn': 2, 'soy': 3, 'rice': 4, 'sugarcane': 5 };
                    return order[a] - order[b];
                });

                results.allocation = distr;

                // Generating schedules dynamically
                results.schedules = [
                    { type: 'wheat-sch', title: 'Wheat - Zone A', desc: `Apply 50kg Nitrogen, Irrigate ${Math.floor(water / 3)}M gal on Day 3` },
                    { type: 'corn-sch', title: 'Corn - Zone B', desc: `Heavy irrigation requirement. Day 1, 4, 7.` },
                    { type: 'soy-sch', title: 'Soy - Zone C', desc: `Low maintainence. Monitor soil moisture.` },
                    { type: 'rice-sch', title: 'Rice - Zone D', desc: `High water retention needed. Flood irrigation on Day 2.` },
                    { type: 'sugarcane-sch', title: 'Sugarcane - Zone E', desc: `Heavy fertilizer phase. 100kg Potash on Day 5.` }
                ];

                if (numWheat === 0) results.schedules = results.schedules.filter(s => s.type !== 'wheat-sch');
                if (numCorn === 0) results.schedules = results.schedules.filter(s => s.type !== 'corn-sch');
                if (numSoy === 0) results.schedules = results.schedules.filter(s => s.type !== 'soy-sch');
                if (numRice === 0) results.schedules = results.schedules.filter(s => s.type !== 'rice-sch');
                if (numSugar === 0) results.schedules = results.schedules.filter(s => s.type !== 'sugarcane-sch');

                // Generate AI Insights
                if (weather === 'drought') {
                    results.insights.push({ title: 'Severe Drought Warning', desc: 'AI recommends installing drip irrigation immediately. Profitability could drop by 20% otherwise.' });
                }

                if (weather === 'monsoon' && numRice > 10) {
                    results.insights.push({ title: 'High Yield Condition', desc: 'Current monsoon conditions favor Rice production. Expected yield up 15% from base model.' });
                }

                if (budgetRatio < 0.4) {
                    results.insights.push({ title: 'Budget Constraint Detected', desc: 'Fertilizer budget is low. AI suggests substituting synthetic NPK with organic compost to maintain soil health.' });
                } else if (budgetRatio > 0.8 && numCorn > 0) {
                    results.insights.push({ title: 'Premium Iteration', desc: 'Sufficient budget detected. Investing in hybrid corn seeds could increase yield ROI by 30%.' });
                }

                if (waterRatio < 0.3) {
                    results.insights.push({ title: 'Critical Water Deficit', desc: 'Water usage exceeds safe aquifer recharge limits. Re-allocate 10% more to Soybeans to stabilize ecosystem.' });
                }

                if (results.insights.length === 0) {
                    results.insights.push({ title: 'Stable Allocation', desc: 'Current resource allocation is well within safe thresholds for both economic and environmental sustainability.' });
                }

                resolve(results);
            }, 1500);
        });
    }

    // --- Execution ---
    optimizeBtn.addEventListener('click', async () => {
        // UI Loading State
        btnText.style.display = 'none';
        loader.style.display = 'block';
        optimizeBtn.disabled = true;

        statusIndicator.classList.remove('optimized');
        systemStatusTxt.textContent = 'Calculating optimal constraints...';

        // Reset grid visual
        gridCells.forEach(cell => {
            cell.className = 'grid-cell'; // reset
            cell.style.transform = 'scale(0.8)';
            cell.style.opacity = '0.5';
        });

        // Get values
        const land = parseFloat(landSlider.value);
        const water = parseFloat(waterSlider.value);
        const budget = parseFloat(budgetSlider.value);
        const loc = locationSelect.value;
        const month = monthSelect.value;
        const weather = currentWeatherState;

        // Run mock solver
        const results = await runConstraintSolver(land, water, budget, loc, month, weather);

        // UI Finished State
        btnText.style.display = 'block';
        loader.style.display = 'none';
        optimizeBtn.disabled = false;

        statusIndicator.classList.add('optimized');
        systemStatusTxt.textContent = 'System Optimized';

        // Animate Grid populating
        results.allocation.forEach((cropType, index) => {
            setTimeout(() => {
                gridCells[index].className = `grid-cell cell-${cropType}`;
                if (cropType === 'unallocated') gridCells[index].className = 'grid-cell'; // override
                gridCells[index].style.transform = 'scale(1)';
                gridCells[index].style.opacity = '1';
            }, index * 10); // stagger animation
        });

        // Update Metrics
        yieldOut.textContent = results.metrics.yield;
        waterEffOut.textContent = results.metrics.waterEfficiency;
        profitOut.textContent = results.metrics.profit;

        // Update Schedules
        scheduleList.innerHTML = '';
        results.schedules.forEach((sch, i) => {
            const item = document.createElement('div');
            item.className = `schedule-item ${sch.type}`;
            item.style.animationDelay = `${i * 0.1}s`;
            item.innerHTML = `
                <div class="schedule-title">
                    <span>${sch.title}</span>
                </div>
                <div class="schedule-desc">${sch.desc}</div>
            `;
            scheduleList.appendChild(item);
        });

        // Update AI Insights
        const insightsList = document.getElementById('ai-insights-list');
        insightsList.innerHTML = '';
        results.insights.forEach((insight, i) => {
            const item = document.createElement('div');
            item.className = `ai-insight-card`;
            item.style.animationDelay = `${(i + results.schedules.length) * 0.1}s`;
            item.innerHTML = `
                <div class="ai-card-title">🤖 ${insight.title}</div>
                <div class="ai-card-desc">${insight.desc}</div>
            `;
            insightsList.appendChild(item);
        });

        // 🔗 Database Integration: Save the results for AI model training
        const syncLabel = document.getElementById('sync-text');
        const syncDot = document.querySelector('.cloud-dot');

        syncLabel.textContent = "Syncing...";
        syncDot.style.background = "#FFC107"; // Orange for sync

        const dbResult = await window.AgriDB.saveOptimizationRecord({
            land, water, budget, loc, month, weather,
            metrics: results.metrics,
            allocation: results.allocation
        });

        setTimeout(() => {
            syncLabel.textContent = dbResult ? "Synced to Cloud" : "Saved Locally (Offline)";
            syncDot.style.background = dbResult ? "#00E676" : "#f44336";
        }, 800);
    });
});
