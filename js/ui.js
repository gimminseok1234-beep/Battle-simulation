import { COLORS } from './constants.js';

export function createToolboxUI(gm) {
    const toolbox = document.getElementById('toolbox');
    if (!toolbox) return;
    toolbox.innerHTML = `
            <div class="category-header collapsed" data-target="category-basic-tiles">기본 타일</div>
            <div id="category-basic-tiles" class="category-content collapsed">
                <button class="tool-btn selected" data-tool="tile" data-type="FLOOR">바닥</button>
                <div class="flex items-center gap-2 my-1">
                    <input type="color" id="floorColorPicker" value="${gm.currentFloorColor}" class="w-full h-8 p-1 rounded">
                    <button id="defaultFloorColorBtn" class="p-2 rounded bg-gray-600 hover:bg-gray-500" title="기본값으로">🔄</button>
                </div>
                <div id="recentFloorColors" class="grid grid-cols-4 gap-1 mb-2"></div>
                
                <button class="tool-btn" data-tool="tile" data-type="WALL">벽</button>
                <div class="flex items-center gap-2 my-1">
                    <input type="color" id="wallColorPicker" value="${gm.currentWallColor}" class="w-full h-8 p-1 rounded">
                    <button id="defaultWallColorBtn" class="p-2 rounded bg-gray-600 hover:bg-gray-500" title="기본값으로">🔄</button>
                </div>
                <div id="recentWallColors" class="grid grid-cols-4 gap-1 mb-2"></div>
            </div>

            <div class="category-header collapsed" data-target="category-special-tiles">특수 타일</div>
            <div id="category-special-tiles" class="category-content collapsed">
                <div class="overflow-y-auto max-h-60 pr-2">
                    <div class="flex items-center gap-1 mt-1">
                        <button class="tool-btn flex-grow" data-tool="tile" data-type="LAVA">용암</button>
                        <button id="lavaSettingsBtn" class="p-2 rounded hover:bg-gray-600">⚙️</button>
                    </div>
                    <button class="tool-btn" data-tool="tile" data-type="GLASS_WALL">유리벽</button>
                    <button class="tool-btn" data-tool="tile" data-type="CRACKED_WALL">부서지는 벽</button>
                    <button class="tool-btn" data-tool="tile" data-type="HEAL_PACK">회복 팩</button>
                    <button class="tool-btn" data-tool="tile" data-type="AWAKENING_POTION">각성 물약</button>
                    <button class="tool-btn" data-tool="tile" data-type="TELEPORTER">텔레포터</button>
                    <button class="tool-btn" data-tool="tile" data-type="QUESTION_MARK">물음표</button>
                    <div class="flex items-center gap-2 mt-1">
                        <button class="tool-btn flex-grow" data-tool="tile" data-type="REPLICATION_TILE">+N 복제</button>
                        <input type="number" id="replicationValue" value="${gm.replicationValue}" min="1" class="modal-input w-16">
                    </div>
                    <div class="flex items-center gap-1 mt-1">
                        <button class="tool-btn flex-grow" data-tool="tile" data-type="DASH_TILE">돌진 타일</button>
                        <button id="dashTileSettingsBtn" class="p-2 rounded hover:bg-gray-600">⚙️</button>
                    </div>
                    <div class="flex items-center gap-1 mt-1">
                        <button class="tool-btn flex-grow" data-tool="growing_field">성장형 자기장</button>
                        <button id="growingFieldSettingsBtn" class="p-2 rounded hover:bg-gray-600">⚙️</button>
                    </div>
                    <div class="flex items-center gap-1 mt-1">
                        <button class="tool-btn flex-grow" data-tool="auto_field">자동 자기장</button>
                        <button id="autoFieldSettingsBtn" class="p-2 rounded hover:bg-gray-600">⚙️</button>
                    </div>
                </div>
            </div>

            <div class="category-header collapsed" data-target="category-units">유닛</div>
            <div id="category-units" class="category-content collapsed">
                <button class="tool-btn" data-tool="unit" data-team="A">빨강 유닛</button>
                <button class="tool-btn" data-tool="unit" data-team="B">파랑 유닛</button>
                <button class="tool-btn" data-tool="unit" data-team="C">초록 유닛</button>
                <button class="tool-btn" data-tool="unit" data-team="D">노랑 유닛</button>
            </div>
            
            <div class="category-header collapsed" data-target="category-weapons">무기</div>
            <div id="category-weapons" class="category-content collapsed">
                <div class="overflow-y-auto max-h-60 pr-2">
                    <button class="tool-btn" data-tool="weapon" data-type="sword">검</button>
                    <button class="tool-btn" data-tool="weapon" data-type="axe">도끼</button>
                    <button class="tool-btn" data-tool="weapon" data-type="bow">활</button>
                    <button class="tool-btn" data-tool="weapon" data-type="ice_diamond">얼음 다이아</button>
                    <button class="tool-btn" data-tool="weapon" data-type="dual_swords">쌍검</button>
                    <button class="tool-btn" data-tool="weapon" data-type="fire_staff">불 지팡이</button>
                    <button class="tool-btn" data-tool="weapon" data-type="lightning">번개</button>
                    <button class="tool-btn" data-tool="weapon" data-type="magic_spear">마법창</button>
                    <button class="tool-btn" data-tool="weapon" data-type="boomerang">부메랑</button>
                    <button class="tool-btn" data-tool="weapon" data-type="poison_potion">독 포션</button>
                    <button class="tool-btn" data-tool="weapon" data-type="magic_dagger">마법 단검</button>
                    <div class="flex items-center gap-1">
                        <button class="tool-btn flex-grow" data-tool="weapon" data-type="hadoken">장풍</button>
                        <button id="hadokenSettingsBtn" class="p-2 rounded hover:bg-gray-600">⚙️</button>
                    </div>
                    <button class="tool-btn" data-tool="weapon" data-type="shuriken">표창</button>
                    <button class="tool-btn" data-tool="weapon" data-type="crown">왕관</button>
                </div>
            </div>

            <div class="category-header bg-slate-800 collapsed" data-target="category-utils">기타</div>
            <div id="category-utils" class="category-content collapsed">
                 <button class="tool-btn" data-tool="erase">지우개</button>
                 <button class="tool-btn" data-tool="nametag">이름표</button>
            </div>
        `;
}

export function showHomeScreen(gm) {
    gm.state = 'HOME';
    gm.currentMapId = null;
    gm.currentMapName = null;
    document.getElementById('homeScreen').style.display = 'block';
    document.getElementById('editorScreen').style.display = 'none';
    document.getElementById('defaultMapsScreen').style.display = 'none';
    document.getElementById('replayScreen').style.display = 'none';
    gm.updateUIToEditorMode();
    gm.resetActionCam(true);
    gm.renderMapCards();
    if (gm.timerElement) gm.timerElement.style.display = 'none';
}

export function showDefaultMapsScreen(gm) {
    document.getElementById('homeScreen').style.display = 'none';
    document.getElementById('editorScreen').style.display = 'none';
    document.getElementById('defaultMapsScreen').style.display = 'block';
    document.getElementById('replayScreen').style.display = 'none';
    gm.renderDefaultMapCards();
}

export function showReplayScreen(gm) {
    document.getElementById('homeScreen').style.display = 'none';
    document.getElementById('editorScreen').style.display = 'none';
    document.getElementById('defaultMapsScreen').style.display = 'none';
    document.getElementById('replayScreen').style.display = 'block';
    gm.renderReplayCards();
}

export async function showEditorScreen(gm, mapId) {
    gm.state = 'EDIT';
    gm.currentMapId = mapId;
    gm.isReplayMode = false;
    document.getElementById('homeScreen').style.display = 'none';
    document.getElementById('defaultMapsScreen').style.display = 'none';
    document.getElementById('replayScreen').style.display = 'none';
    document.getElementById('editorScreen').style.display = 'flex';
    await gm.audioManager.init();

    const killSoundPref = localStorage.getItem('arenaKillSoundEnabled');
    if (killSoundPref !== null) {
        const isEnabled = killSoundPref === 'true';
        document.getElementById('killSoundToggle').checked = isEnabled;
        gm.audioManager.toggleKillSound(isEnabled);
    }
    const outlineEnabledPref = localStorage.getItem('unitOutlineEnabled');
    gm.isUnitOutlineEnabled = outlineEnabledPref !== null ? (outlineEnabledPref === 'true') : true;
    document.getElementById('unitOutlineToggle').checked = gm.isUnitOutlineEnabled;

    const outlineWidthPref = localStorage.getItem('unitOutlineWidth');
    gm.unitOutlineWidth = outlineWidthPref !== null ? parseFloat(outlineWidthPref) : 1.5;
    document.getElementById('unitOutlineWidthControl').value = gm.unitOutlineWidth;
    document.getElementById('unitOutlineWidthValue').textContent = gm.unitOutlineWidth.toFixed(1);

    gm.resetActionCam(true);
    if (gm.timerElement) gm.timerElement.style.display = 'none';

    if (mapId !== 'replay') {
        gm.updateUIToEditorMode();
        await gm.loadMapForEditing(mapId);
    }
}


