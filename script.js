let contentDatabaseJSON = {};
        let filteredDatabaseArray = []; 
        let favoriteIdsArray = []; 
        let activeFilterMode = 'all'; 
        let activeProfileShowId = null;
        let activePartIndex = 0; 
        let currentSegmentsFlattenedList = [];
        let initialRestoreAttempted = false;
        
        const ALLOWED_CHANNEL = "toon_mining";

        const DUMMY_SHOW_DESCRIPTION = "Welcome to the hub of this classic series collection. Dive deep into multiple serialized broadcast logs, track story arcs across complete chronological segments, or browse full episode guides directly through the interactive tracking systems configured below.";
        const DUMMY_MOVIE_DESCRIPTION = "Experience the full cinematic storytelling scope of this feature-length presentation. Optimized natively into standalone target wide segments for performance tracking, view the full presentation structure narrative block cleanly mapped end-to-end.";

        document.addEventListener("DOMContentLoaded", async () => {
            initializeUserThemeSystem();
            loadSavedUserProfiles();
            setupPlaybackPositionListeners();

            try {
                const response = await fetch('data.json');
                if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
                
                contentDatabaseJSON = await response.json();
                
                filteredDatabaseArray = Object.keys(contentDatabaseJSON).map(key => {
                    let item = contentDatabaseJSON[key];
                    item.id = key; 
                    return item;
                }).filter(item => {
                    if (!item.channel) return true;
                    return item.channel.toLowerCase().trim() === ALLOWED_CHANNEL;
                });

                // Check unified view state destination configuration
                const lastSavedState = localStorage.getItem('toon_mining_last_view_state');
                
                if (lastSavedState && lastSavedState !== 'home' && contentDatabaseJSON[lastSavedState]) {
                    restorePlaybackCacheState(lastSavedState);
                } else {
                    // Force clean initialization route straight to Home Grid layout display
                    showHomeView();
                    applyActiveDataRenderingPipeline();
                }

            } catch (error) {
                console.error("Critical database load tracking mismatch error:", error);
                document.getElementById('mainContentGrid').innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; color: var(--accent); padding: 40px;">
                        ⚠️ Error parsing remote assets configuration database maps.
                    </div>`;
            }
        });

        function initializeUserThemeSystem() {
            const savedTheme = localStorage.getItem('toon_mining_theme') || 'dark';
            document.documentElement.setAttribute('data-theme', savedTheme);
            document.getElementById('themeToggle').innerText = savedTheme === 'light' ? '☀️' : '🌙';
        }

        function toggleTheme() {
            const rootElement = document.documentElement;
            const currentTheme = rootElement.getAttribute('data-theme') || 'dark';
            let targetTheme = currentTheme === 'dark' ? 'light' : 'dark';
            rootElement.setAttribute('data-theme', targetTheme);
            document.getElementById('themeToggle').innerText = targetTheme === 'light' ? '☀️' : '🌙';
            localStorage.setItem('toon_mining_theme', targetTheme);
        }

        function loadSavedUserProfiles() {
            try {
                const savedFavs = localStorage.getItem('toon_mining_favorites');
                if (savedFavs) favoriteIdsArray = JSON.parse(savedFavs);
            } catch(e) { favoriteIdsArray = []; }
            updateFloatingPopButtonIcon();
        }

        function setupPlaybackPositionListeners() {
            const videoPlayer = document.getElementById('mainVideoPlayer');
            if (videoPlayer) {
                videoPlayer.addEventListener('timeupdate', () => {
                    if (activeProfileShowId !== null && videoPlayer.currentTime > 0) {
                        const progressData = {
                            partIndex: activePartIndex,
                            timestamp: videoPlayer.currentTime
                        };
                        localStorage.setItem(`toon_mining_resume_${activeProfileShowId}`, JSON.stringify(progressData));
                    }
                });

                window.addEventListener('beforeunload', () => {
                    if (activeProfileShowId !== null && videoPlayer.currentTime > 0) {
                        const progressData = {
                            partIndex: activePartIndex,
                            timestamp: videoPlayer.currentTime
                        };
                        localStorage.setItem(`toon_mining_resume_${activeProfileShowId}`, JSON.stringify(progressData));
                    }
                });
            }
        }

        function restorePlaybackCacheState(cachedShowId) {
            if (cachedShowId && contentDatabaseJSON[cachedShowId]) {
                initialRestoreAttempted = true;
                const savedProgress = localStorage.getItem(`toon_mining_resume_${cachedShowId}`);
                let targetPart = 0;
                let targetTime = 0;

                if (savedProgress) {
                    try {
                        const parsed = JSON.parse(savedProgress);
                        targetPart = parsed.partIndex || 0;
                        targetTime = parsed.timestamp || 0;
                    } catch(e) { console.error("Error updating configuration maps runtime parameters.", e); }
                }
                
                loadProfilePage(cachedShowId, targetPart, targetTime);
            }
        }

        function toggleFavoriteItem(event, itemId) {
            event.stopPropagation();
            const index = favoriteIdsArray.indexOf(itemId);
            if (index > -1) favoriteIdsArray.splice(index, 1);
            else favoriteIdsArray.push(itemId);
            localStorage.setItem('toon_mining_favorites', JSON.stringify(favoriteIdsArray));
            updateFloatingPopButtonIcon();
            applyActiveDataRenderingPipeline();
        }

        function handleFloatingPopClick() {
            showHomeView();
            switchFilterMode(activeFilterMode === 'all' ? 'favorites' : 'all');
        }

        function updateFloatingPopButtonIcon() {
            const btn = document.getElementById('fixedHeartPopBtn');
            if (btn) btn.innerText = activeFilterMode === 'favorites' ? '❤️' : (favoriteIdsArray.length > 0 ? '💖' : '🤍');
        }

        function switchFilterMode(mode) {
            activeFilterMode = mode;
            document.getElementById('allFilterTabBtn').className = `tab-btn ${mode === 'all' ? 'active-tab' : ''}`;
            document.getElementById('favFilterTabBtn').className = `tab-btn ${mode === 'favorites' ? 'active-tab' : ''}`;
            updateFloatingPopButtonIcon();
            applyActiveDataRenderingPipeline();
        }

        function applyActiveDataRenderingPipeline() {
            const query = document.getElementById('searchInput').value.toLowerCase().trim();
            let results = [...filteredDatabaseArray];
            
            if (activeFilterMode === 'favorites') results = results.filter(item => favoriteIdsArray.includes(item.id));
            if (query !== '') results = results.filter(item => item.title && item.title.toLowerCase().includes(query));
            
            renderHomeGrid(results);
            document.getElementById('noResultsContainer').style.display = results.length === 0 ? 'block' : 'none';
        }

        function renderHomeGrid(datasetArray) {
            const gridContainer = document.getElementById('mainContentGrid');
            gridContainer.innerHTML = '';
            datasetArray.forEach(item => {
                const isFav = favoriteIdsArray.includes(item.id);
                const card = document.createElement('div');
                card.className = 'video-showcase-card';
                card.onclick = () => {
                    const savedProgress = localStorage.getItem(`toon_mining_resume_${item.id}`);
                    let targetPart = 0;
                    let targetTime = 0;
                    if (savedProgress) {
                        try {
                            const parsed = JSON.parse(savedProgress);
                            targetPart = parsed.partIndex || 0;
                            targetTime = parsed.timestamp || 0;
                        } catch(e) {}
                    }
                    loadProfilePage(item.id, targetPart, targetTime);
                };
                card.innerHTML = `
                    <div class="favorite-toggle-icon" onclick="toggleFavoriteItem(event, '${item.id}')">
                        ${isFav ? '❤️' : '🤍'}
                    </div>
                    <div class="thumbnail-container"><img src="${item.poster || ''}" alt="${item.title || ''}"></div>
                    <div class="video-description-block"><div class="video-headline">${item.title || 'Untitled'}</div></div>
                `;
                gridContainer.appendChild(card);
            });
        }

        function handleSearchKeyUp(event) { if (event.key === 'Enter') executeSearch(); }
        function executeSearch() { showHomeView(); applyActiveDataRenderingPipeline(); }

        function showHomeView() {
            activeProfileShowId = null;
            // Capture home view context state securely inside persistence layer tracking blocks
            localStorage.setItem('toon_mining_last_view_state', 'home'); 
            
            document.getElementById('profileView').classList.remove('active-view');
            document.getElementById('viewFilterRow').style.display = 'flex';
            document.getElementById('homeView').classList.add('active-view');
        }

        function exitProfileView() {
            const videoPlayer = document.getElementById('mainVideoPlayer');
            if (videoPlayer) videoPlayer.pause();
            showHomeView();
        }

        function loadProfilePage(contentId, targetedPartIdx = 0, resumeTimestamp = 0) {
            activeProfileShowId = contentId;
            const item = contentDatabaseJSON[contentId];
            if (!item) return;

            // Explicitly overwrite navigation memory pointers straight to current profile selection item
            localStorage.setItem('toon_mining_last_view_state', contentId);

            document.getElementById('homeView').classList.remove('active-view');
            document.getElementById('viewFilterRow').style.display = 'none';
            document.getElementById('profileView').classList.add('active-view');
            document.getElementById('showTitle').innerText = item.title || 'Untitled';
            
            const summaryBox = document.getElementById('showSummaryText');
            if (item.info && item.info.trim() !== "") {
                summaryBox.innerText = item.info;
            } else {
                summaryBox.innerText = (item.type === "shows") ? DUMMY_SHOW_DESCRIPTION : DUMMY_MOVIE_DESCRIPTION;
            }
            
            activePartIndex = targetedPartIdx; 
            currentSegmentsFlattenedList = [];

            if (Array.isArray(item.parts) && item.parts.length > 0) {
                item.parts.forEach((part, i) => {
                    currentSegmentsFlattenedList.push({
                        name: part.name || `Part ${i + 1}`,
                        video: part.video || part.thumb || ''
                    });
                });
            } else {
                let uniqueSrc = item.video || item.file_url || item.url || '';
                currentSegmentsFlattenedList = [{ name: "Full Feature", video: uniqueSrc }];
            }

            renderPartsTrackSelector();
            updateVideoPlayerSource(resumeTimestamp);
            
            const playlistAnchor = document.getElementById('showPlaylistLink');
            if (item.playlist_link) {
                playlistAnchor.href = item.playlist_link;
                playlistAnchor.style.display = "inline-flex";
            } else {
                playlistAnchor.style.display = "none";
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        function renderPartsTrackSelector() {
            const moduleWrapper = document.getElementById('partsSelectorModule');
            const container = document.getElementById('partsNodesContainer');
            const titleLabel = document.getElementById('partsSelectorTitle');
            container.innerHTML = '';

            const item = contentDatabaseJSON[activeProfileShowId];
            titleLabel.innerText = (item && item.type === "shows") ? "Available Episodes" : "Movie Parts Selection";

            if (currentSegmentsFlattenedList.length > 1) {
                moduleWrapper.style.display = 'block';
                currentSegmentsFlattenedList.forEach((segment, index) => {
                    const isAct = index === activePartIndex;
                    const node = document.createElement('div');
                    node.className = `part-track-node ${isAct ? 'active-part' : ''}`;
                    node.onclick = () => {
                        if(index !== activePartIndex) {
                            activePartIndex = index;
                            renderPartsTrackSelector();
                            updateVideoPlayerSource(0); 
                        }
                    };
                    node.innerHTML = `
                        <div>${segment.name}</div>
                        <div class="status-badge">${isAct ? 'Watching' : 'Ready'}</div>
                    `;
                    container.appendChild(node);
                });
            } else {
                moduleWrapper.style.display = 'none';
            }
        }

        function updateVideoPlayerSource(timestamp = 0) {
            const videoPlayer = document.getElementById('mainVideoPlayer');
            const titleElement = document.getElementById('watchingEpisodeTitle');
            
            if (!videoPlayer || currentSegmentsFlattenedList.length === 0) return;

            const activeTargetSegment = currentSegmentsFlattenedList[activePartIndex];
            titleElement.innerText = activeTargetSegment.name;

            if (videoPlayer.src !== activeTargetSegment.video) {
                videoPlayer.src = activeTargetSegment.video;
                videoPlayer.load();
            }

            if (timestamp > 0) {
                videoPlayer.onloadedmetadata = () => {
                    videoPlayer.currentTime = timestamp;
                    videoPlayer.onloadedmetadata = null;
                };
            }
        }
