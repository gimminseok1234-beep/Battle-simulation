import { getFirestore, collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TILE, COLORS } from '../constants.js';

export class PersistenceManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.db = gameManager.db;
    }

    get currentUser() {
        return this.gameManager.currentUser;
    }

    async getAllMaps() {
        if (!this.currentUser) return [];
        const mapsColRef = collection(this.db, "maps", this.currentUser.uid, "userMaps");
        const mapSnapshot = await getDocs(mapsColRef);
        return mapSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    async getMapById(mapId) {
        if (!this.currentUser) return null;
        const mapDocRef = doc(this.db, "maps", this.currentUser.uid, "userMaps", mapId);
        const mapSnap = await getDoc(mapDocRef);
        return mapSnap.exists() ? { id: mapSnap.id, ...mapSnap.data() } : null;
    }

    async createNewMap(name, width, height) {
        if (!this.currentUser) return;
        
        const newMapId = `map_${Date.now()}`;
        const newMapData = {
            id: newMapId,
            name: name,
            width: width,
            height: height,
            map: JSON.stringify(this.gameManager.createEmptyMap(width, height)),
            units: [], weapons: [], nexuses: [], growingFields: [],
            isLevelUpEnabled: false,
            floorColor: COLORS.FLOOR, wallColor: COLORS.WALL,
            recentFloorColors: [], recentWallColors: [],
            isLavaAvoidanceEnabled: true,
        };
        
        const newMapDocRef = doc(this.db, "maps", this.currentUser.uid, "userMaps", newMapId);
        try {
            await setDoc(newMapDocRef, newMapData);
            this.gameManager.showEditorScreen(newMapId);
        } catch(error) {
            console.error("Error creating new map: ", error);
        }
    }

    async saveCurrentMap() {
        const gm = this.gameManager;
        if (!this.currentUser || !gm.currentMapName) {
            alert('맵을 저장하려면 로그인이 필요하며, 맵 이름이 지정되어야 합니다.');
            return;
        }

        if (!gm.currentMapId || gm.currentMapId.startsWith('local_')) {
            gm.currentMapId = `map_${Date.now()}`;
            const newName = prompt("새로운 맵의 이름을 입력하세요:", gm.currentMapName);
            if (newName) {
                gm.currentMapName = newName;
            } else {
                gm.currentMapId = null; 
                return;
            }
        }

        const plainUnits = gm.units.map(u => ({
            gridX: u.gridX, gridY: u.gridY, team: u.team, hp: u.hp, isKing: u.isKing, name: u.name,
            weapon: u.weapon ? { type: u.weapon.type } : null
        }));
        const plainWeapons = gm.weapons.map(w => ({ gridX: w.gridX, gridY: w.gridY, type: w.type }));
        const plainNexuses = gm.nexuses.map(n => ({ gridX: n.gridX, gridY: n.gridY, team: n.team, hp: n.hp }));
        const plainGrowingFields = gm.growingFields.map(f => ({
            id: f.id, gridX: f.gridX, gridY: f.gridY, width: f.width, height: f.height,
            direction: f.direction, totalFrames: f.totalFrames, delay: f.delay
        }));

        const mapData = {
            name: gm.currentMapName,
            width: gm.canvas.width, height: gm.canvas.height,
            map: JSON.stringify(gm.map),
            units: plainUnits, weapons: plainWeapons, nexuses: plainNexuses, growingFields: plainGrowingFields,
            autoMagneticField: gm.autoMagneticField,
            hadokenKnockback: gm.hadokenKnockback,
            isLevelUpEnabled: gm.isLevelUpEnabled,
            floorColor: gm.currentFloorColor, wallColor: gm.currentWallColor,
            recentFloorColors: gm.recentFloorColors, recentWallColors: gm.recentWallColors,
            isLavaAvoidanceEnabled: gm.isLavaAvoidanceEnabled,
        };

        const mapDocRef = doc(this.db, "maps", this.currentUser.uid, "userMaps", gm.currentMapId);
        try {
            await setDoc(mapDocRef, mapData, { merge: true });
            alert(`'${gm.currentMapName}' 맵이 Firebase에 성공적으로 저장되었습니다!`);
        } catch (error) {
            console.error("Error saving map to Firebase: ", error);
            alert('맵 저장에 실패했습니다.');
        }
    }

    async renderMapCards() {
        document.getElementById('loadingStatus').textContent = "맵 목록을 불러오는 중...";
        const maps = await this.getAllMaps();
        document.getElementById('loadingStatus').style.display = 'none';
        
        const mapGrid = document.getElementById('mapGrid');
        const addNewMapCard = document.getElementById('addNewMapCard');
        while (mapGrid.firstChild && mapGrid.firstChild !== addNewMapCard) {
            mapGrid.removeChild(mapGrid.firstChild);
        }

        maps.forEach(mapData => {
            const card = this.gameManager.createMapCard(mapData, false);
            mapGrid.insertBefore(card, addNewMapCard);
        });
    }

    async renameItem(id, newName, type) {
        if (!this.currentUser) return;
        const collectionPath = type === 'map' ? 'userMaps' : 'userReplays';
        const docRef = doc(this.db, type === 'map' ? "maps" : "replays", this.currentUser.uid, collectionPath, id);
        try {
            await setDoc(docRef, { name: newName }, { merge: true });
            if (type === 'map') this.renderMapCards();
            else this.renderReplayCards();
        } catch (error) {
            console.error(`Error renaming ${type}:`, error);
        }
    }

    async deleteItem(id, type) {
        if (!this.currentUser) return;
        const collectionPath = type === 'map' ? 'userMaps' : 'userReplays';
        const docRef = doc(this.db, type === 'map' ? "maps" : "replays", this.currentUser.uid, collectionPath, id);
        try {
            await deleteDoc(docRef);
            if (type === 'map') this.renderMapCards();
            else this.renderReplayCards();
        } catch (error) {
            console.error(`Error deleting ${type}:`, error);
        }
    }

    async loadNametagSettings() {
        const gm = this.gameManager;
        if (!this.currentUser) return;
        const nametagDocRef = doc(this.db, "users", this.currentUser.uid, "settings", "nametags");
        try {
            const docSnap = await getDoc(nametagDocRef);
            if (docSnap.exists()) {
                const settings = docSnap.data();
                gm.isNametagEnabled = settings.enabled || false;
                gm.nametagList = settings.list || [];
                gm.nametagColor = settings.color || '#000000';
            } else {
                gm.isNametagEnabled = false;
                gm.nametagList = [];
                gm.nametagColor = '#000000';
            }
        } catch (error) {
            console.error("Error loading nametag settings:", error);
            gm.isNametagEnabled = false;
            gm.nametagList = [];
            gm.nametagColor = '#000000';
        }
        
        document.getElementById('nametagToggle').checked = gm.isNametagEnabled;
        document.getElementById('nametagColorPicker').value = gm.nametagColor;
        gm.uiManager.renderNametagList();
    }
    
    async saveNametagSettings() {
        const gm = this.gameManager;
        if (!this.currentUser) {
            alert("이름표 설정을 저장하려면 로그인이 필요합니다.");
            return;
        }
        gm.isNametagEnabled = document.getElementById('nametagToggle').checked;
        gm.nametagColor = document.getElementById('nametagColorPicker').value;
        const settingsData = {
            enabled: gm.isNametagEnabled,
            list: gm.nametagList,
            color: gm.nametagColor
        };

        const nametagDocRef = doc(this.db, "users", this.currentUser.uid, "settings", "nametags");
        try {
            await setDoc(nametagDocRef, settingsData);
            alert('이름표 설정이 Firebase에 저장되었습니다.');
        } catch (error) {
            console.error("Error saving nametag settings:", error);
            alert('이름표 설정 저장에 실패했습니다.');
        }
    }

    async prepareReplayName() {
        const gm = this.gameManager;
        const sim = gm.simulationManager;
        if (!sim.lastSimulationResult) {
            throw new Error("저장할 시뮬레이션 결과가 없습니다.");
        }
    
        const replaysColRef = collection(this.db, "replays", this.currentUser.uid, "userReplays");
        const q = query(replaysColRef, where("mapName", "==", sim.lastSimulationResult.mapName));
        const querySnapshot = await getDocs(q);
        const replayCount = querySnapshot.size;
    
        document.getElementById('newReplayName').value = `${sim.lastSimulationResult.mapName} 리플레이 ${replayCount + 1}`;
    }

    async saveLastReplay() {
        const gm = this.gameManager;
        const sim = gm.simulationManager;
        if (!this.currentUser || !sim.lastSimulationResult) return;
        
        const replayName = document.getElementById('newReplayName').value.trim();
        if (!replayName) {
            alert("리플레이 이름을 입력해주세요.");
            return;
        }

        const replayId = `replay_${Date.now()}`;
        const replayData = {
            name: replayName,
            ...sim.lastSimulationResult,
            rngPolicy: gm.rngPolicy
        };

        const replayDocRef = doc(this.db, "replays", this.currentUser.uid, "userReplays", replayId);
        try {
            await setDoc(replayDocRef, replayData);
            alert(`'${replayName}' 리플레이가 저장되었습니다!`);
            gm.uiManager.closeModal('saveReplayModal');
        } catch (error) {
            console.error("Error saving replay:", error);
            alert("리플레이 저장에 실패했습니다.");
        }
    }

    async renderReplayCards() {
        if (!this.currentUser) return;
        
        const replaysColRef = collection(this.db, "replays", this.currentUser.uid, "userReplays");
        const replaySnapshot = await getDocs(replaysColRef);
        const replays = replaySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const replayGrid = document.getElementById('replayGrid');
        replayGrid.innerHTML = '';

        replays.forEach(replayData => {
            const card = this.gameManager.createReplayCard(replayData);
            replayGrid.appendChild(card);
        });
    }

    async loadReplay(replayId) {
        if (!this.currentUser) return;
        const replayDocRef = doc(this.db, "replays", this.currentUser.uid, "userReplays", replayId);
        const replaySnap = await getDoc(replayDocRef);
        
        if (!replaySnap.exists()) {
            console.error("Replay not found:", replayId);
            return;
        }
        
        const replayData = replaySnap.data();
        await this.gameManager.loadReplay(replayId, replayData);
    }
}