import BaseScene from "./BaseScene";

const PIPES_TO_RENDER = 4;

class PlayScene extends BaseScene {

    constructor(config) {
        super("PlayScene", config);
        this.bird = null;
        this.pipes = null;

        this.pipeHorizantalDistance = 0;
        this.flopVelocity = 300;
        this.score = 0;
        this.scoreText = "";
        this.isPaused = false;

        this.currentDifficulty = "easy";
        this.difficulties = {
            "easy": {
                pipeHorizontalDistanceRange: [500, 550],
                pipeVerticalDistanceRange: [200, 250]
            },
            "normal": {
                pipeHorizontalDistanceRange: [400, 450],
                pipeVerticalDistanceRange: [150, 200]
            },
            "hard": {
                pipeHorizontalDistanceRange: [300, 350],
                pipeVerticalDistanceRange: [130, 170]
            }
        };
    }

    create() {
        this.currentDifficulty = "easy";
        super.create();
        this.createBackground();
        this.createBird();
        this.createPipes();
        this.createColliders();
        this.createScore();
        this.createPause();
        this.handleInputs();
        this.listenToEvents();

        this.anims.create({
            key: "fly",
            frames: this.anims.generateFrameNumbers("bird", { start: 8, end: 15 }),
            frameRate: 8,
            repeat: -1
        });

        this.bird.play("fly");
    }

    update(time, delta) {
        if (!this.isPaused) {
            this.scrollBackground();
        }
        this.checkBirdGameStatus();
        this.recyclePipes();
    }

    createBackground() {
        this.background = this.add.tileSprite(0, 0, this.config.width, this.config.height, 'sky').setOrigin(0, 0);
    }

    scrollBackground() {
        this.background.tilePositionX += 1;  // Adjust the value to control the speed of the background
    }

    listenToEvents() {
        if (this.pauseEvent) { return; }
        this.pauseEvent = this.events.on('resume', () => {
            this.initialTime = 3;
            this.countDownText = this.add.text(...this.screenCenter, "Fly in " + this.initialTime, this.fontOptions).setOrigin(0.5);
            this.timeEvent = this.time.addEvent({
                delay: 1000,
                callback: this.countDown,
                callbackScope: this,
                loop: true
            });
        });
    }

    countDown() {
        this.initialTime--;
        this.countDownText.setText("Fly in " + this.initialTime);
        if (this.initialTime <= 0) {
            this.isPaused = false;
            this.countDownText.setText("");
            this.physics.resume();
            this.timeEvent.remove();
        }
    }

    createColliders() {
        this.physics.add.collider(this.bird, this.pipes, this.gameOver, null, this);
    }

    createScore() {
        this.score = 0;
        const bestScore = localStorage.getItem('bestScore');
        this.scoreText = this.add.text(16, 16, `Score:${0}`, { fontSize: "32px", fill: "#000", fontWeight: "bold" });
        this.add.text(16, 56, `Best score:${bestScore || 0}`, { fontSize: "20px", fill: "#000", fontWeight: "bold" });
    }

    createPause() {
        this.isPaused = false;
        const PauseButton = this.add.image(this.config.width - 10, this.config.height - 10, "pause")
            .setOrigin(1)
            .setScale(3)
            .setInteractive();

        PauseButton.on('pointerdown', () => {
            this.isPaused = true;
            this.physics.pause();
            this.scene.pause();
            this.scene.launch("PauseScene");
        });
    }

    checkBirdGameStatus() {
        if (this.bird.getBounds().bottom >= this.config.height || this.bird.y <= 0) {
            this.gameOver();
        }
    }

    createBird() {
        this.bird = this.physics.add.sprite(this.config.startPosition.x, this.config.startPosition.y, "bird")
            .setOrigin(0)
            .setScale(4)
            .setFlipX(true);
        this.bird.setBodySize(this.bird.width, this.bird.height - 8);
        this.bird.body.gravity.y = 600;
    }

    createPipes() {
        this.pipes = this.physics.add.group();

        for (let i = 0; i < PIPES_TO_RENDER; i++) {
            const upperPipe = this.pipes.create(0, 0, "pipe")
                .setImmovable(true)
                .setOrigin(0, 1);
            const lowerPipe = this.pipes.create(0, 0, "pipe")
                .setImmovable(true)
                .setOrigin(0, 0);

            this.placePipe(upperPipe, lowerPipe);
        }

        this.pipes.setVelocityX(-200);
    }

    handleInputs() {
        this.input.on('pointerdown', this.flap, this);
        this.input.keyboard.on('keydown-SPACE', this.flap, this);
    }

    placePipe(uPipe, lPipe) {
        const difficulty = this.difficulties[this.currentDifficulty];
        const rightMostX = this.getRightMostPipe();
        let pipeVerticalDistance = Phaser.Math.Between(...difficulty.pipeVerticalDistanceRange);
        let pipeVerticalPostion = Phaser.Math.Between(20, this.config.height - 20 - pipeVerticalDistance);
        let pipeHorizantalDistance = Phaser.Math.Between(...difficulty.pipeHorizontalDistanceRange);

        uPipe.x = rightMostX + pipeHorizantalDistance;
        uPipe.y = pipeVerticalPostion;

        lPipe.x = uPipe.x;
        lPipe.y = uPipe.y + pipeVerticalDistance;
    }

    recyclePipes() {
        const tempPipes = [];
        this.pipes.getChildren().forEach(pipe => {
            if (pipe.getBounds().right <= 0) {
                tempPipes.push(pipe);
                if (tempPipes.length === 2) {
                    this.placePipe(...tempPipes);
                    this.increaseScores();
                    this.saveBestScore();
                    this.increaseDifficulties();
                }
            }
        });
    }

    increaseDifficulties() {
        if (this.score === 20) {
            this.currentDifficulty = "normal";
        }
        if (this.score === 50) {
            this.currentDifficulty = "hard";
        }
    }

    getRightMostPipe() {
        let rightMostX = 0;
        this.pipes.getChildren().forEach(pipe => {
            rightMostX = Math.max(pipe.x, rightMostX);
        });
        return rightMostX;
    }

    saveBestScore() {
        const bestScoreText = localStorage.getItem('bestScore');
        const bestScore = bestScoreText && parseInt(bestScoreText, 10);

        if (!bestScore || this.score > bestScore) {
            localStorage.setItem('bestScore', this.score);
        }
    }

    gameOver() {
        this.isPaused = true;
        this.physics.pause();
        this.bird.setTint(0xfb1e36);

        this.saveBestScore();

        this.time.addEvent({
            delay: 1000,
            callback: () => {
                this.scene.restart();
            },
            loop: false
        });
    }

    flap() {
        if (this.isPaused) { return; }
        this.bird.body.velocity.y = -this.flopVelocity;
    }

    increaseScores() {
        this.score++;
        this.scoreText.setText(`Score:${this.score}`);
    }
}

export default PlayScene;
