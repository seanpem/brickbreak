class Breakout extends Phaser.Scene {
  constructor() {
    super({ key: "breakout" });

    this.bricks;
    this.paddle;
    this.ball;
  }

  preload() {
    this.load.image("ball", "assets/hedgehog.png");
    this.load.image("brick_blue", "assets/brick1D4AFF.png");
    this.load.image("brick_orange", "assets/brickDC9300.png");
    this.load.image("brick_dark", "assets/brick151515.png");
    this.load.image("brick_red", "assets/brickF54E00.png");
    this.load.image("brick_grey", "assets/brickBFBFBC.png");
    this.load.image("brick_white", "assets/brickEEEFE9.png");
  }

  create() {
    //  Enable world bounds, but disable the floor
    this.physics.world.setBoundsCollision(true, true, true, false);

    //  Generate a paddle texture
    const gfx = this.make.graphics({ x: 0, y: 0, add: false });
    gfx.fillStyle(0xffffff);
    gfx.fillRect(0, 0, 104, 24);
    gfx.generateTexture("paddle", 104, 24);
    gfx.destroy();

    //  Create the bricks in a 10x6 grid
    this.bricks = this.physics.add.staticGroup();

    //  All 6 rows use brick image assets
    const brickKeys = [
      "brick_dark",
      "brick_blue",
      "brick_red",
      "brick_orange",
      "brick_grey",
      "brick_white",
    ];
    for (let row = 0; row < brickKeys.length; row++) {
      for (let col = 0; col < 10; col++) {
        const x = 112 + col * 64;
        const y = 100 + row * 32;
        this.bricks.create(x, y, brickKeys[row]);
      }
    }

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
        }
      },
      this,
    );
  }

  hitBrick(ball, brick) {
    brick.disableBody(true, true);

    if (this.bricks.countActive() === 0) {
      this.resetLevel();
    }
  }

  resetBall() {
    this.ball.setVelocity(0);
    this.ball.setPosition(this.paddle.x, 500);
    this.ball.setData("onPaddle", true);
    this.ball.rotation = 0;
  }

  resetLevel() {
    this.resetBall();

    this.bricks.children.each((brick) => {
      brick.enableBody(false, 0, 0, true, true);
    });
  }

  hitPaddle(ball, paddle) {
    let diff = 0;

    if (ball.x < paddle.x) {
      //  Ball is on the left-hand side of the paddle
      diff = paddle.x - ball.x;
      ball.setVelocityX(-10 * diff);
    } else if (ball.x > paddle.x) {
      //  Ball is on the right-hand side of the paddle
      diff = ball.x - paddle.x;
      ball.setVelocityX(10 * diff);
    } else {
      //  Ball is perfectly in the middle
      //  Add a little random X to stop it bouncing straight up!
      ball.setVelocityX(2 + Math.random() * 8);
    }
  }

  update() {
    if (this.ball.y > 600) {
      this.resetBall();
    }

    if (!this.ball.getData("onPaddle")) {
      this.ball.rotation += this.ball.body.velocity.x * 0.0005;
    }
  }
}

const config = {
  type: Phaser.WEBGL,
  width: 800,
  height: 600,
  parent: "posthog-brickbreak",
  scene: [Breakout],
  physics: {
    default: "arcade",
  },
};

const game = new Phaser.Game(config);
