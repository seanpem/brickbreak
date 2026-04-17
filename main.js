class Breakout extends Phaser.Scene {
  constructor() {
    super({ key: "breakout" });

    this.bricks;
    this.paddle;
    this.ball;
    this.powerups;
    this.extraBalls = [];
    this.wideTimer = null;
    this.slowTimer = null;
    this.startTime = null;
    this.winTexts = [];
    this.bombEnabled = false;
  }

  preload() {
    this.load.image("ball", "assets/hedgehog.png");
    this.load.image("brick_blue", "assets/brick1D4AFF.png");
    this.load.image("brick_orange", "assets/brickDC9300.png");
    this.load.image("brick_dark", "assets/brick151515.png");
    this.load.image("brick_red", "assets/brickF54E00.png");
    this.load.image("brick_grey", "assets/brickBFBFBC.png");
    this.load.image("brick_white", "assets/brickEEEFE9.png");
    this.load.image("powerup_slow", "assets/hourglass.png");
    this.load.image("powerup_multi", "assets/three.png");
    this.load.image("powerup_wide", "assets/expand.png");
    this.load.image("powerup_bomb", "assets/bomb.png");
    this.load.image("secret_hog", "assets/secret_hog.png");
  }

  create() {
    posthog.onFeatureFlags(() => {
      this.bombEnabled = posthog.getFeatureFlag("bomb-power-up") === "test";
    });

    //  Enable world bounds, but disable the floor
    this.physics.world.setBoundsCollision(true, true, true, false);

    //  Generate a paddle texture
    const gfx = this.make.graphics({ x: 0, y: 0, add: false });
    gfx.fillStyle(0x151515);
    gfx.fillRoundedRect(0, 0, 104, 24, 12);
    gfx.generateTexture("paddle", 104, 24);
    gfx.destroy();

    //  Create the bricks in a 10x6 grid
    this.bricks = this.physics.add.staticGroup();

    const brickKeys = [
      "brick_dark",
      "brick_blue",
      "brick_red",
      "brick_orange",
      "brick_grey",
      "brick_white",
    ];
    const powerupKeys = ["wide", "multi", "slow"];
    if (this.bombEnabled) {
      powerupKeys.push("bomb");
    }
    for (let row = 0; row < brickKeys.length; row++) {
      for (let col = 0; col < 10; col++) {
        const x = 112 + col * 64;
        const y = 100 + row * 32;
        const brick = this.bricks.create(x, y, brickKeys[row]);
        //  ~20% chance of containing a power-up
        if (Math.random() < 0.2) {
          brick.setData(
            "powerup",
            powerupKeys[Math.floor(Math.random() * powerupKeys.length)],
          );
        }
      }
    }

    //  Power-ups group (dynamic, so they can fall)
    this.powerups = this.physics.add.group();

    this.ball = this.physics.add
      .image(400, 500, "ball")
      .setCollideWorldBounds(true)
      .setBounce(1);
    this.ball.setData("onPaddle", true);

    this.paddle = this.physics.add.image(400, 550, "paddle").setImmovable();

    //  Our colliders
    this.physics.add.collider(
      this.ball,
      this.bricks,
      this.hitBrick,
      null,
      this,
    );
    this.physics.add.collider(
      this.ball,
      this.paddle,
      this.hitPaddle,
      null,
      this,
    );

    //  Power-up collection via overlap with paddle
    this.physics.add.overlap(
      this.paddle,
      this.powerups,
      this.collectPowerup,
      null,
      this,
    );

    //  Input events
    this.input.on(
      "pointermove",
      function (pointer) {
        //  Keep the paddle within the game
        this.paddle.x = Phaser.Math.Clamp(pointer.x, 52, 748);

        if (this.ball.getData("onPaddle")) {
          this.ball.x = this.paddle.x;
        }
      },
      this,
    );

    this.input.on(
      "pointerup",
      function (pointer) {
        if (this.ball.getData("onPaddle")) {
          this.ball.setVelocity(-75, -300);
          this.ball.setData("onPaddle", false);
          this.startTime = this.time.now;
        }
      },
      this,
    );

    //  Konami code listener
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.konamiSequence = [
      K.UP,
      K.UP,
      K.DOWN,
      K.DOWN,
      K.LEFT,
      K.RIGHT,
      K.LEFT,
      K.RIGHT,
      K.B,
      K.A,
    ];
    this.konamiIndex = 0;
    this.input.keyboard.on("keydown", (event) => {
      if (event.keyCode === this.konamiSequence[this.konamiIndex]) {
        this.konamiIndex++;
        if (this.konamiIndex === this.konamiSequence.length) {
          this.triggerEasterEgg();
        }
      } else {
        this.konamiIndex = 0;
      }
    });
  }

  hitBrick(ball, brick) {
    const powerupType = brick.getData("powerup");
    brick.disableBody(true, true);

    //  Spawn a power-up if this brick had one
    if (powerupType) {
      const pu = this.powerups.create(
        brick.x,
        brick.y,
        "powerup_" + powerupType,
      );
      pu.setData("type", powerupType);
      pu.setDisplaySize(20, 20);
      pu.body.setVelocityY(150);
    }

    if (this.bricks.countActive() === 0) {
      this.winGame();
    }
  }

  collectPowerup(paddle, powerup) {
    const type = powerup.getData("type");
    powerup.destroy();

    if (type === "wide") {
      //  Cancel existing timer if active
      if (this.wideTimer) {
        this.wideTimer.remove();
      }
      this.paddle.setDisplaySize(208, 24);
      this.paddle.body.setSize(208, 24);
      this.wideTimer = this.time.delayedCall(10000, () => {
        this.paddle.setDisplaySize(104, 24);
        this.paddle.body.setSize(104, 24);
        this.wideTimer = null;
      });
    } else if (type === "multi") {
      for (let i = 0; i < 2; i++) {
        const extra = this.physics.add
          .image(this.ball.x, this.ball.y, "ball")
          .setCollideWorldBounds(true)
          .setBounce(1);
        const angle = -45 + i * 90;
        const rad = Phaser.Math.DegToRad(angle);
        extra.setVelocity(Math.cos(rad) * 300, Math.sin(rad) * 300);
        this.physics.add.collider(
          extra,
          this.bricks,
          this.hitBrick,
          null,
          this,
        );
        this.physics.add.collider(
          extra,
          this.paddle,
          this.hitPaddle,
          null,
          this,
        );
        this.extraBalls.push(extra);
      }
    } else if (type === "slow") {
      if (this.slowTimer) {
        this.slowTimer.remove();
      }
      //  Halve velocity on main ball and extras
      this.ball.body.velocity.scale(0.5);
      this.extraBalls.forEach((b) => {
        if (b.active) b.body.velocity.scale(0.5);
      });
      this.slowTimer = this.time.delayedCall(8000, () => {
        //  Double velocity to restore
        if (!this.ball.getData("onPaddle")) {
          this.ball.body.velocity.scale(2);
        }
        this.extraBalls.forEach((b) => {
          if (b.active) b.body.velocity.scale(2);
        });
        this.slowTimer = null;
      });
    } else if (type === "bomb") {
      const active = [];
      this.bricks.children.each((b) => {
        if (b.active) active.push(b);
      });
      Phaser.Utils.Array.Shuffle(active);
      active.slice(0, Math.min(10, active.length)).forEach((b) => {
        b.disableBody(true, true);
      });
      if (this.bricks.countActive() === 0) {
        this.winGame();
      }
    }
  }

  winGame() {
    const elapsed = ((this.time.now - this.startTime) / 1000).toFixed(1);
    posthog.capture("game_won", { time_seconds: parseFloat(elapsed) });
    this.clearPowerupEffects();
    this.physics.pause();
    this.ball.setVisible(false);

    const centerX = 400;
    const textStyle = {
      fontFamily: "Arial",
      color: "#151515",
      align: "center",
    };

    const winText = this.add
      .text(centerX, 220, "You won!", {
        ...textStyle,
        fontSize: "48px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    const timeText = this.add
      .text(centerX, 280, "Time: " + elapsed + "s", {
        ...textStyle,
        fontSize: "28px",
      })
      .setOrigin(0.5);
    const promptText = this.add
      .text(centerX, 330, "Play again? (y/n)", {
        ...textStyle,
        fontSize: "22px",
      })
      .setOrigin(0.5);
    this.winTexts = [winText, timeText, promptText];

    const yKey = this.input.keyboard.addKey("Y");
    const nKey = this.input.keyboard.addKey("N");

    yKey.once("down", () => {
      this.winTexts.forEach((t) => t.destroy());
      this.winTexts = [];
      this.input.keyboard.removeKey("Y");
      this.input.keyboard.removeKey("N");
      this.physics.resume();
      this.resetLevel();
      this.startTime = null;
    });

    nKey.once("down", () => {
      this.winTexts.forEach((t) => t.destroy());
      this.winTexts = [];
      this.input.keyboard.removeKey("Y");
      this.input.keyboard.removeKey("N");
      const thanks = this.add
        .text(centerX, 280, "Thanks for playing!", {
          ...textStyle,
          fontSize: "36px",
        })
        .setOrigin(0.5);
      this.winTexts = [thanks];
    });
  }

  triggerEasterEgg() {
    posthog.capture("secret_found");
    this.clearPowerupEffects();
    this.physics.pause();

    //  Hide all game objects
    this.ball.setVisible(false);
    this.ball.body.enable = false;
    this.paddle.setVisible(false);
    this.bricks.children.each((brick) => brick.disableBody(true, true));
    this.winTexts.forEach((t) => t.destroy());
    this.winTexts = [];

    //  Display the secret hoggie
    this.add.image(400, 260, "secret_hog").setDisplaySize(350, 350);
    this.add
      .text(400, 470, "You've found the secret hoggie", {
        fontFamily: "Arial",
        fontSize: "28px",
        fontStyle: "bold",
        color: "#151515",
        align: "center",
      })
      .setOrigin(0.5);
  }

  clearPowerupEffects() {
    //  Revert wide paddle
    if (this.wideTimer) {
      this.wideTimer.remove();
      this.wideTimer = null;
      this.paddle.setDisplaySize(104, 24);
      this.paddle.body.setSize(104, 24);
    }
    //  Revert slow ball
    if (this.slowTimer) {
      this.slowTimer.remove();
      this.slowTimer = null;
    }
    //  Destroy extra balls
    this.extraBalls.forEach((b) => b.destroy());
    this.extraBalls = [];
    //  Clear falling power-ups
    this.powerups.clear(true, true);
  }

  resetBall() {
    this.clearPowerupEffects();
    this.ball.setVisible(true);
    this.ball.body.enable = true;
    this.ball.setVelocity(0);
    this.ball.setPosition(this.paddle.x, 500);
    this.ball.setData("onPaddle", true);
    this.ball.rotation = 0;
  }

  resetLevel() {
    this.resetBall();

    const powerupKeys = ["wide", "multi", "slow"];
    if (this.bombEnabled) {
      powerupKeys.push("bomb");
    }
    this.bricks.children.each((brick) => {
      brick.enableBody(false, 0, 0, true, true);
      //  Re-assign random power-ups
      if (Math.random() < 0.2) {
        brick.setData(
          "powerup",
          powerupKeys[Math.floor(Math.random() * powerupKeys.length)],
        );
      } else {
        brick.setData("powerup", null);
      }
    });
  }

  hitPaddle(ball, paddle) {
    let diff = 0;
    const halfWidth = paddle.body.width / 2;
    const maxSpeed = 520;

    if (ball.x < paddle.x) {
      //  Ball is on the left-hand side of the paddle
      diff = (paddle.x - ball.x) / halfWidth;
      ball.setVelocityX(-maxSpeed * diff);
    } else if (ball.x > paddle.x) {
      //  Ball is on the right-hand side of the paddle
      diff = (ball.x - paddle.x) / halfWidth;
      ball.setVelocityX(maxSpeed * diff);
    } else {
      //  Ball is perfectly in the middle
      //  Add a little random X to stop it bouncing straight up!
      ball.setVelocityX(2 + Math.random() * 8);
    }
  }

  update() {
    //  Check if main ball fell off
    const mainBallLost = this.ball.y > 600;

    //  Clean up extra balls that fell off
    this.extraBalls = this.extraBalls.filter((b) => {
      if (b.y > 600) {
        b.destroy();
        return false;
      }
      return true;
    });

    //  Reset if main ball and all extras are gone
    if (mainBallLost && this.extraBalls.length === 0) {
      this.resetBall();
    } else if (mainBallLost && this.extraBalls.length > 0) {
      //  Hide main ball until extras are also lost
      this.ball.setVisible(false);
      this.ball.body.enable = false;
    }

    //  Apply rotation to main ball
    if (!this.ball.getData("onPaddle") && this.ball.visible) {
      this.ball.rotation += this.ball.body.velocity.x * 0.0005;
    }

    //  Apply rotation to extra balls
    this.extraBalls.forEach((b) => {
      if (b.active) {
        b.rotation += b.body.velocity.x * 0.0005;
      }
    });

    //  Clean up power-ups that fell off screen
    this.powerups.children.each((pu) => {
      if (pu.active && pu.y > 600) {
        pu.destroy();
      }
    });
  }
}

const config = {
  type: Phaser.WEBGL,
  width: 800,
  height: 600,
  backgroundColor: "#F5F0E8",
  parent: "posthog-brickbreak",
  render: {
    preserveDrawingBuffer: true,
  },
  scene: [Breakout],
  physics: {
    default: "arcade",
  },
  input: {
    windowEvents: false,
  },
};

const game = new Phaser.Game(config);
