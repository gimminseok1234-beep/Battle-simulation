// Managers
        this.persistenceManager = new PersistenceManager(this);
        this.simulationManager = new SimulationManager(this);
        this.uiManager = new UIManager(this, this.persistenceManager);
        this.inputManager = new InputManager(this);
        this.audioManager = new AudioManager();
        
        this.isUnitOutlineEnabled = true;
        this.unitOutlineWidth = 1.5;

        this.isLevelUpEnabled = false;
        
        this.isLevelUpEnabled = false;
        this.vampiricStateTimer = 0; /
        this.vampiricStateTimer = 0; // 유닛 상태
        this.nametagList = [];
        this.nametagColor = '#000000'; 
        this.usedNametagsInSim = new Set();
        this.editingUnit = null;
        
        this.prng = new SeededRandom(Date.now());
        this.uiPrng = new SeededRandom(Date.now());
        this.simulationSeed = null;
        this.rngPolicy = 'legacy'; // 'legacy' | 'seeded_v2'
        this._originalMathRandom = null;
        
        this.simulationTime = 0;
        this.timerElement = document.getElementById('timerText');

        this.isLavaAvoidanceEnabled = true;

        instance = this;
