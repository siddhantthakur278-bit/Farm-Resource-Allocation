/**
 * AgriOptima Database Manager
 * Handles all cloud-sync operations using Supabase. 
 * Provides an AI-driven data collection layer for future ML model training.
 */

if (typeof supabase === 'undefined') {
    console.warn("Supabase library not loaded. Running in local-only mode.");
}

const supabaseClient = (typeof supabase !== 'undefined') ?
    supabase.createClient(window.AgriConfig.SUPABASE_URL, window.AgriConfig.SUPABASE_ANON_KEY) : null;

window.AgriDB = {
    isOnline: !!supabaseClient,

    /**
     * Saves a snapshot of optimization results which serves as 
     * training data for localized AI resource allocation models.
     */
    async saveOptimizationRecord(data) {
        console.log("🛒 AI Data Collection: Preparing record for cloud sync...");

        const record = {
            farmer_id: localStorage.getItem('farmer_id') || 'unregistered',
            timestamp: new Date().toISOString(),
            land_acres: data.land,
            water_used_l: data.water,
            budget_spent_inr: data.budget,
            location: data.loc,
            weather_condition: data.weather,
            allocation_metrics: data.metrics,
            crop_distribution: data.allocation.join(',') // Flattened for collection
        };

        if (this.isOnline) {
            try {
                const { error } = await supabaseClient.from('farm_optimizations').insert([record]);
                if (error) throw error;
                console.log("☁️ Data successfully synced to Supabase Cloud.");
                return true;
            } catch (err) {
                console.error("❌ Cloud sync failed:", err.message);
                this.saveLocally(record);
                return false;
            }
        } else {
            console.log("💾 Offline mode: Saving record to local persistent storage.");
            this.saveLocally(record);
            return true;
        }
    },

    saveLocally(record) {
        let history = JSON.parse(localStorage.getItem('agri_history') || '[]');
        history.unshift(record);
        if (history.length > 50) history.pop(); // Keep top 50 local records
        localStorage.setItem('agri_history', JSON.stringify(history));
    }
};
